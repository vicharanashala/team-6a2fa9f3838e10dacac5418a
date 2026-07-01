const express = require('express');
const Query = require('../models/Query');
const FAQ = require('../models/FAQ');
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');
const { Analytics } = require('../models/Analytics');

const router = express.Router();

const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const STALL_THRESHOLD = 2; // skips before a question is marked stalled

// Release any lock on `query` whose lockExpiresAt has passed.
// Returns the (possibly updated) document.
async function releaseIfExpired(query) {
  if (query.lockedBy && query.lockExpiresAt && query.lockExpiresAt < new Date()) {
    query.lockedBy = null;
    query.lockedAt = null;
    query.lockExpiresAt = null;
    await query.save();
  }
  return query;
}

// GET /api/answer-queue/stats
// Counts for the idle screen: open, stalled, answered today.
router.get('/stats', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [open, stalled, answeredToday] = await Promise.all([
      Query.countDocuments({ status: 'open', lockedBy: null }),
      Query.countDocuments({ isStalled: true }),
      Query.countDocuments({ status: 'answered', updatedAt: { $gte: startOfDay } }),
    ]);

    res.json({ open, stalled, answeredToday });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queue stats.' });
  }
});

// GET /api/answer-queue/me/stats
// The logged-in answerer's own running totals.
router.get('/me/stats', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('stats');
    res.json({
      points: user.stats.reputation || 0,
      given: user.stats.answersGiven || 0,
      accepted: await Query.countDocuments({ 'answers.author': req.user._id, 'answers.isAccepted': true }),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your stats.' });
  }
});

// GET /api/answer-queue/:questionId
// Fetches a locked question if it belongs to the current user.
router.get('/:questionId', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const query = await Query.findOne({
      _id: req.params.questionId,
      lockedBy: req.user._id,
      lockExpiresAt: { $gt: new Date() },
    });
    if (!query) return res.status(404).json({ error: 'Lock not found or expired.' });
    res.json({ question: query });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch question.' });
  }
});

// POST /api/answer-queue/pull
// Atomically claims one open, unlocked question for the current user.
router.post('/pull', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    // one active lock per answerer at a time
    const alreadyLocked = await Query.findOne({
      lockedBy: req.user._id,
      lockExpiresAt: { $gt: new Date() },
    });
    if (alreadyLocked) {
      return res.status(409).json({
        error: 'You already have a locked question. Finish or skip it first.',
        questionId: alreadyLocked._id,
      });
    }

    // sweep stale locks across the pool before picking
    const staleLocks = await Query.find({ lockedBy: { $ne: null }, lockExpiresAt: { $lt: new Date() } });
    for (const stale of staleLocks) {
      stale.skipCount += 1;
      if (stale.skipCount >= STALL_THRESHOLD) stale.isStalled = true;
      stale.lockedBy = null;
      stale.lockedAt = null;
      stale.lockExpiresAt = null;
      await stale.save();
    }

    // random pull from the open, unlocked pool, excluding the asker themself
    const candidates = await Query.find({
      status: 'open',
      lockedBy: null,
      author: { $ne: req.user._id },
    }).select('_id');

    if (candidates.length === 0) {
      return res.status(404).json({ error: 'No open questions available right now.' });
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const expiresAt = new Date(Date.now() + LOCK_DURATION_MS);

    const question = await Query.findOneAndUpdate(
      { _id: pick._id, lockedBy: null }, // guard against a race with another answerer
      { lockedBy: req.user._id, lockedAt: new Date(), lockExpiresAt: expiresAt },
      { new: true }
    ).populate('author', 'name phase');

    if (!question) {
      return res.status(409).json({ error: 'That question was just claimed by someone else. Try again.' });
    }

    res.json({
      question: {
        _id: question._id,
        text: question.content,
        askerName: question.author?.name || 'Anonymous',
        stepLabel: question.category,
        createdAt: question.createdAt,
        tags: question.tags,
        images: question.images,
      },
      expiresAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to pull a question.' });
  }
});

// POST /api/answer-queue/:id/skip
// Returns a locked question to the queue without answering it.
router.post('/:id/skip', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);
    if (!query) return res.status(404).json({ error: 'Question not found.' });
    if (String(query.lockedBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You do not hold the lock on this question.' });
    }

    query.lockedBy = null;
    query.lockedAt = null;
    query.lockExpiresAt = null;
    query.skipCount += 1;
    if (query.skipCount >= STALL_THRESHOLD) query.isStalled = true;
    await query.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to skip question.' });
  }
});

// POST /api/answer-queue/:id/answer
// Submits either a "find" (point to existing FAQ) or "create" (propose new FAQ) answer.
router.post('/:id/answer', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const { type, faqId, proposedQuestion, proposedAnswer } = req.body;
    const query = await Query.findById(req.params.id);
    if (!query) return res.status(404).json({ error: 'Question not found.' });

    await releaseIfExpired(query);
    if (String(query.lockedBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Your lock on this question has expired. Pull a new one.' });
    }

    let pointsEarned = 0;

    if (type === 'find') {
      const faq = await FAQ.findById(faqId);
      if (!faq) return res.status(404).json({ error: 'FAQ entry not found.' });

      query.answers.push({
        content: faq.answer,
        author: req.user._id,
        authorType: 'community',
        sourceLabel: 'FAQ Based',
        sourceFAQs: [faq._id],
        sourceSections: faq.sectionId ? [`§${faq.sectionId}`] : [],
      });
      query.status = 'answered';
      pointsEarned = 15;

      await FAQ.findByIdAndUpdate(faqId, { $inc: { usageCount: 1 } });
    } else if (type === 'create') {
      if (!proposedQuestion || !proposedAnswer) {
        return res.status(400).json({ error: 'Both a proposed question and answer are required.' });
      }

      query.answers.push({
        content: proposedAnswer,
        author: req.user._id,
        authorType: 'pending', // awaiting Tier-1 admin review, per CSFAQ spec
        sourceLabel: 'Pending Validation',
      });
      query.status = 'answered';
      pointsEarned = 40;
      // NOTE: actual FAQ.create() + superadmin approval happens in the
      // existing Admin Review Queue flow (mentor toggles "Add to Knowledge Base").
      // This route only records the proposal as a pending answer.
    } else {
      return res.status(400).json({ error: "type must be 'find' or 'create'." });
    }

    // release the lock — the question has been answered
    query.lockedBy = null;
    query.lockedAt = null;
    query.lockExpiresAt = null;
    await query.save();

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.answersGiven': 1, 'stats.reputation': pointsEarned },
    });

    await Analytics.create({
      type: 'answer_queue_submit',
      queryId: query._id,
      userId: req.user._id,
      category: query.category,
    });

    res.json({ success: true, pointsEarned });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit answer.' });
  }
});

module.exports = router;
