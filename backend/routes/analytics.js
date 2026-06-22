const express = require('express');
const { Analytics } = require('../models/Analytics');
const Query = require('../models/Query');
const FAQ = require('../models/FAQ');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/overview
router.get('/overview', protect, async (req, res) => {
  try {
    const [totalQueries, openQueries, escalated, totalFAQs, recentQueries] = await Promise.all([
      Query.countDocuments(),
      Query.countDocuments({ status: 'open' }),
      Query.countDocuments({ isEscalated: true }),
      FAQ.countDocuments(),
      Query.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    ]);

    const avgConfidence = await Analytics.aggregate([
      { $match: { type: 'ai_call', confidenceScore: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$confidenceScore' } } }
    ]);

    res.json({
      totalQueries,
      openQueries,
      escalated,
      totalFAQs,
      recentQueries,
      avgConfidence: avgConfidence[0]?.avg?.toFixed(1) || 0,
      resolutionRate: totalQueries > 0 ? (((totalQueries - openQueries) / totalQueries) * 100).toFixed(1) : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch overview.' });
  }
});

// GET /api/analytics/category-breakdown
router.get('/category-breakdown', protect, async (req, res) => {
  try {
    const breakdown = await Query.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } }, escalated: { $sum: { $cond: ['$isEscalated', 1, 0] } } } },
      { $sort: { count: -1 } }
    ]);
    res.json(breakdown);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch breakdown.' });
  }
});

// GET /api/analytics/trending-confusions
router.get('/trending-confusions', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trending = await Query.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$category', count: { $sum: 1 }, totalViews: { $sum: '$views' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Also get top questions
    const topQuestions = await Query.find({ createdAt: { $gte: since } })
      .sort({ views: -1 }).limit(5).select('title category views status').lean();

    res.json({ trending, topQuestions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trending confusions.' });
  }
});

// GET /api/analytics/confidence-distribution
router.get('/confidence-distribution', protect, async (req, res) => {
  try {
    const dist = await Analytics.aggregate([
      { $match: { type: 'ai_call', confidenceLevel: { $exists: true } } },
      { $group: { _id: '$confidenceLevel', count: { $sum: 1 } } }
    ]);
    res.json(dist);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch confidence distribution.' });
  }
});

// GET /api/analytics/daily-activity
router.get('/daily-activity', protect, async (req, res) => {
  try {
    const days = 14;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activity = await Query.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, queries: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const aiActivity = await Analytics.aggregate([
      { $match: { date: { $gte: since }, type: 'ai_call' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, aiCalls: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Merge
    const merged = {};
    activity.forEach(a => { merged[a._id] = { date: a._id, queries: a.queries, aiCalls: 0 }; });
    aiActivity.forEach(a => { if (merged[a._id]) merged[a._id].aiCalls = a.aiCalls; else merged[a._id] = { date: a._id, queries: 0, aiCalls: a.aiCalls }; });

    res.json(Object.values(merged).sort((a, b) => a.date.localeCompare(b.date)));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch daily activity.' });
  }
});

// GET /api/analytics/faq-gaps - FAQs that need to be created
router.get('/faq-gaps', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    // Find low-confidence AI calls — these indicate FAQ gaps
    const gaps = await Analytics.aggregate([
      { $match: { type: 'ai_call', confidenceLevel: 'low' } },
      { $group: { _id: '$category', count: { $sum: 1 }, queries: { $push: '$query' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const unanswered = await Query.find({ status: 'open', 'answers.0': { $exists: false } })
      .sort({ views: -1 }).limit(10).select('title category views createdAt').lean();

    res.json({ gaps, unanswered });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch FAQ gaps.' });
  }
});

module.exports = router;
