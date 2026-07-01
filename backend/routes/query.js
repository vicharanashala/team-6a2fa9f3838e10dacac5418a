const express = require('express');
const mongoose = require('mongoose');
const Query = require('../models/Query');
const User = require('../models/User');
const FAQ = require('../models/FAQ');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');

// Serialize lean() docs so ObjectId fields become strings, not { _bsontype: 'ObjectId', id: <Buffer> }
function serialize(doc) {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map(serialize);
  return JSON.parse(JSON.stringify(doc, (k, v) =>
    v instanceof mongoose.Types.ObjectId ? v.toString() : v
  ));
}
const { processRAGQuery } = require('../utils/ragService');
const { Analytics } = require('../models/Analytics');

const router = express.Router();

// GET /api/queries
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, status, sort = 'newest', search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category && category !== 'All') filter.category = category;
    if (status && status !== 'All') filter.status = status;
    if (search) filter.$text = { $search: search };

    const sortMap = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, popular: { views: -1 }, unanswered: { createdAt: -1 } };
    if (sort === 'unanswered') filter.status = 'open';

    const total = await Query.countDocuments(filter);
    const queries = await Query.find(filter)
      .populate('author', 'name role avatar phase')
      .sort(sortMap[sort] || { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json({ queries: serialize(queries), total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queries.' });
  }
});

// GET /api/queries/trending
router.get('/trending', async (req, res) => {
  try {
    const queries = await Query.find({ status: 'open' })
      .populate('author', 'name avatar')
      .sort({ views: -1, createdAt: -1 })
      .limit(5).lean();
    res.json(serialize(queries));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trending.' });
  }
});

// GET /api/queries/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    console.log('GET /:id req.params.id:', req.params.id, 'type:', typeof req.params.id)
    const query = await Query.findById(req.params.id)
      .populate('author', 'name role avatar phase college')
      .populate('relatedFAQs')
      .populate('answers.author', 'name role avatar phase')
      .lean();
    if (!query) return res.status(404).json({ error: 'Query not found.' });
    await Query.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    await Analytics.create({ type: 'page_view', queryId: query._id, userId: req.user?._id, category: query.category });
    res.json(serialize(query));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch query.' });
  }
});

// POST /api/queries - Create new query
router.post('/', protect, async (req, res) => {
  try {
    const { title, content, category, tags, refinedTitle, images } = req.body;
    if (!title || !content || !category) return res.status(400).json({ error: 'Title, content and category are required.' });

    // Auto-generate AI answer for the new query
    const query = await Query.create({ title, content, category, tags: tags || [], refinedTitle, images: images || [], author: req.user._id });

    // Generate AI answer async
    try {
      let imageParam = null;
      if (images && images.length > 0) {
        const img = images[0];
        const match = img.match(/^data:(image\/[a-zA-Z+-\.]+);base64,(.+)$/);
        if (match) {
          imageParam = {
            mimeType: match[1],
            data: match[2]
          };
        }
      }

      const aiResult = await processRAGQuery(title + ' ' + content, {
        explainMode: req.user.preferences?.explainMode || 'intermediate',
        userId: req.user._id,
        queryId: query._id,
        image: imageParam
      });

      // Find related FAQs
      const relatedFAQIds = aiResult.sourceFAQs || [];

      await Query.findByIdAndUpdate(query._id, {
        aiAnswer: {
          content: aiResult.answer,
          confidence: aiResult.confidence,
          confidenceScore: aiResult.confidenceScore,
          sourceFAQs: aiResult.sourceFAQs,
          sourceSections: aiResult.sourceSections,
          followUpSuggestions: aiResult.followUpSuggestions,
          generatedAt: new Date(),
          escalationRequired: aiResult.escalationRequired,
          explainMode: aiResult.explainMode
        },
        relatedFAQs: relatedFAQIds,
        isEscalated: aiResult.escalationRequired
      });

      if (aiResult.escalationRequired) {
        await Query.findByIdAndUpdate(query._id, { status: 'escalated', escalatedAt: new Date() });
      }
    } catch (aiErr) {
      console.error('AI answer generation failed:', aiErr.message);
    }

    // Update user stats
    await require('../models/User').findByIdAndUpdate(req.user._id, { $inc: { 'stats.queriesRaised': 1 } });

    // Log analytics
    await Analytics.create({ type: 'query', category, userId: req.user._id, queryId: query._id });

    const populated = serialize(await Query.findById(query._id).populate('author', 'name role avatar').lean());
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/queries/:id/answers - Add answer
router.post('/:id/answers', protect, async (req, res) => {
  try {
    const { content, addToKnowledgeBase } = req.body;
    if (!content) return res.status(400).json({ error: 'Answer content is required.' });

    const query = await Query.findById(req.params.id);
    if (!query) return res.status(404).json({ error: 'Query not found.' });

    const answer = {
      content,
      author: req.user._id,
      authorType: req.user.role === 'mentor' || req.user.role === 'admin' ? 'mentor' : 'community',
      sourceLabel: req.user.role === 'mentor' ? 'Mentor Verified' : 'Community Answer'
    };

    query.answers.push(answer);
    if (req.user.role === 'mentor' || req.user.role === 'admin') {
      query.status = 'answered';
    }
    await query.save();

    // Continuous learning: add to FAQ if mentor verified and requested
    if (addToKnowledgeBase && (req.user.role === 'mentor' || req.user.role === 'admin')) {
      const newFAQ = await FAQ.create({
        category: query.category,
        question: query.refinedTitle || query.title,
        answer: content,
        tags: query.tags,
        keywords: query.tags,
        importance: 'medium',
        verified: true,
        verifiedBy: req.user._id,
        source: 'community'
      });

      // Mark answer as added to knowledge base
      const answerIndex = query.answers.length - 1;
      query.answers[answerIndex].addedToKnowledgeBase = true;
      query.answers[answerIndex].knowledgeBaseEntry = newFAQ._id;
      await query.save();
    }

    await require('../models/User').findByIdAndUpdate(req.user._id, { $inc: { 'stats.answersGiven': 1 } });

    const updated = await Query.findById(req.params.id)
      .populate('answers.author', 'name role avatar phase').lean();
    res.json(serialize(updated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/queries/:id/vote
router.post('/:id/vote', protect, async (req, res) => {
  try {
    const { answerId, vote } = req.body;
    const query = await Query.findById(req.params.id);
    if (!query) return res.status(404).json({ error: 'Query not found.' });

    const answer = query.answers.id(answerId);
    if (!answer) return res.status(404).json({ error: 'Answer not found.' });

    const existingVote = answer.voters.find(v => v.user.toString() === req.user._id.toString());
    if (existingVote) {
      if (existingVote.vote === vote) {
        // Remove vote
        answer.voters = answer.voters.filter(v => v.user.toString() !== req.user._id.toString());
        if (vote === 'up') answer.upvotes = Math.max(0, answer.upvotes - 1);
        else answer.downvotes = Math.max(0, answer.downvotes - 1);
      } else {
        existingVote.vote = vote;
        if (vote === 'up') { answer.upvotes++; answer.downvotes = Math.max(0, answer.downvotes - 1); }
        else { answer.downvotes++; answer.upvotes = Math.max(0, answer.upvotes - 1); }
      }
    } else {
      answer.voters.push({ user: req.user._id, vote });
      if (vote === 'up') answer.upvotes++;
      else answer.downvotes++;
    }

    await query.save();
    res.json({ upvotes: answer.upvotes, downvotes: answer.downvotes });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/queries/bookmarked - Get current user's bookmarked queries
router.get('/bookmarked', protect, async (req, res) => {
  try {
    const queries = await Query.find({ _id: { $in: req.user.bookmarkedQueries } })
      .populate('author', 'name college phase')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ queries: serialize(queries) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookmarked queries.' });
  }
});

// POST /api/queries/:id/bookmark
router.post('/:id/bookmark', protect, async (req, res) => {
  try {
    console.log('POST /:id/bookmark req.params.id:', req.params.id, 'type:', typeof req.params.id)
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    const qId = req.params.id;
    const isBookmarked = user.bookmarkedQueries.includes(qId);

    if (isBookmarked) {
      user.bookmarkedQueries = user.bookmarkedQueries.filter(id => id.toString() !== qId);
      await Query.findByIdAndUpdate(qId, { $inc: { bookmarks: -1 } });
    } else {
      user.bookmarkedQueries.push(qId);
      await Query.findByIdAndUpdate(qId, { $inc: { bookmarks: 1 } });
    }
    await user.save();
    res.json({ bookmarked: !isBookmarked });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// PATCH /api/queries/:id/escalate
router.patch('/:id/escalate', protect, async (req, res) => {
  try {
    const query = await Query.findByIdAndUpdate(req.params.id, {
      isEscalated: true,
      status: 'escalated',
      escalatedAt: new Date()
    }, { new: true });
    res.json(query);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST: /api/queries/feedback
// isHelpful: false + escalationReason  → create Query + escalate it with reason/comments
router.post('/feedback', protect, async (req, res) => {
  try {
    const { question, aiAnswer, isHelpful, escalationReason, escalationComments } = req.body;

    if (isHelpful) {
      return res.status(200).json({ message: 'Positive feedback recorded.' });
    }

    if (!question) {
      return res.status(400).json({ error: 'Question is required to escalate.' });
    }

    // Create a Query from the failed AI answer
    const newQuery = new Query({
      title: question,
      content: aiAnswer || question,
      category: 'General',
      author: req.user._id,
      status: 'escalated',
      isEscalated: true,
      escalatedAt: new Date(),
      escalatedReason: escalationReason || null,
      escalationComments: escalationComments || null
    });

    await newQuery.save();
    return res.status(201).json({ message: 'Escalated! A mentor will review it.', query: newQuery });
  } catch (error) {
    console.error('Feedback error:', error);
    return res.status(500).json({ error: 'Failed to process feedback.' });
  }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /api/queries/admin/all - List ALL queries including answered/closed (admin only)
router.get('/admin/all', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category && category !== 'All') filter.category = category;
    if (status && status !== 'All') filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    const total = await Query.countDocuments(filter);
    const queries = await Query.find(filter)
      .populate('author', 'name role avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    res.json({ queries: serialize(queries), total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queries.' });
  }
});

// GET /api/queries/admin/escalated - List only escalated queries (admin only)
router.get('/admin/escalated', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = { isEscalated: true };
    const total = await Query.countDocuments(filter);
    const queries = await Query.find(filter)
      .populate('author', 'name role avatar college')
      .populate('assignedMentor', 'name email')
      .sort({ escalatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    res.json({ queries: serialize(queries), total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch escalated queries.' });
  }
});

// PATCH /api/queries/admin/escalated/:id/resolve - Mark escalated query as resolved (admin only)
router.patch('/admin/escalated/:id/resolve', protect, restrictTo('admin'), async (req, res) => {
  try {
    const query = await Query.findByIdAndUpdate(req.params.id, {
      isEscalated: false,
      status: 'answered',
      resolvedAt: new Date()
    }, { new: true }).populate('author', 'name role avatar').lean();
    if (!query) return res.status(404).json({ error: 'Query not found.' });
    res.json({ message: 'Escalated query resolved.', query: serialize(query) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/queries/admin/escalated/:id/assign - Assign mentor to escalated query (admin only)
router.patch('/admin/escalated/:id/assign', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { mentorId } = req.body;
    if (!mentorId) return res.status(400).json({ error: 'mentorId is required.' });
    const mentor = await User.findById(mentorId);
    if (!mentor) return res.status(404).json({ error: 'Mentor not found.' });
    if (mentor.role !== 'mentor' && mentor.role !== 'admin') {
      return res.status(400).json({ error: 'Specified user is not a mentor.' });
    }
    const query = await Query.findByIdAndUpdate(req.params.id, {
      assignedMentor: mentorId,
      isEscalated: false,
      status: 'open'
    }, { new: true }).populate('author', 'name role avatar').populate('assignedMentor', 'name email').lean();
    if (!query) return res.status(404).json({ error: 'Query not found.' });
    res.json({ message: 'Mentor assigned.', query: serialize(query) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/queries/admin/escalation-stats - Get escalation statistics (admin only)
router.get('/admin/escalation-stats', protect, restrictTo('admin'), async (req, res) => {
  try {
    const [totalEscalated, resolved, unassigned] = await Promise.all([
      Query.countDocuments({ isEscalated: true }),
      Query.countDocuments({ isEscalated: true, status: 'answered' }),
      Query.countDocuments({ isEscalated: true, assignedMentor: { $exists: false } })
    ]);
    const recentEscalations = await Query.find({ isEscalated: true })
      .populate('author', 'name avatar')
      .sort({ escalatedAt: -1 })
      .limit(10)
      .lean();
    res.json({
      total: totalEscalated,
      resolved,
      unassigned,
      recentEscalations: serialize(recentEscalations)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch escalation stats.' });
  }
});

module.exports = router;
