const express = require('express');
const User = require('../models/User');
const Query = require('../models/Query');
const FAQ = require('../models/FAQ');
const { protect, restrictTo } = require('../middleware/auth');
const { Analytics } = require('../models/Analytics');

const router = express.Router();

// GET /api/admin/analytics/overview - Admin dashboard overview
router.get('/overview', protect, restrictTo('admin'), async (req, res) => {
  try {
    const [
      totalUsers, totalQueries, openQueries, escalatedQueries, answeredQueries, totalFAQs,
      studentCount, mentorCount, adminCount
    ] = await Promise.all([
      User.countDocuments({}),
      Query.countDocuments({}),
      Query.countDocuments({ status: 'open' }),
      Query.countDocuments({ isEscalated: true }),
      Query.countDocuments({ status: 'answered' }),
      FAQ.countDocuments({}),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'mentor' }),
      User.countDocuments({ role: 'admin' })
    ]);

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));
    const monthStart = new Date(now.setDate(now.getDate() - 30));

    const [queriesToday, queriesThisWeek, queriesThisMonth] = await Promise.all([
      Query.countDocuments({ createdAt: { $gte: todayStart } }),
      Query.countDocuments({ createdAt: { $gte: weekStart } }),
      Query.countDocuments({ createdAt: { $gte: monthStart } })
    ]);

    // Average resolution time: queries that went from created to answered
    const resolvedWithTime = await Query.find({
      status: 'answered',
      answeredAt: { $exists: true }
    }).select('createdAt answeredAt').limit(100).lean();

    let avgResolutionHours = 0;
    if (resolvedWithTime.length > 0) {
      const totalMs = resolvedWithTime.reduce((sum, q) => {
        return sum + (new Date(q.answeredAt) - new Date(q.createdAt));
      }, 0);
      avgResolutionHours = Math.round(totalMs / resolvedWithTime.length / (1000 * 60 * 60) * 10) / 10;
    }

    // Phase breakdown
    const phaseCounts = await User.aggregate([
      { $match: { phase: { $exists: true, $ne: null } } },
      { $group: { _id: '$phase', count: { $sum: 1 } } }
    ]);

    res.json({
      totalUsers,
      totalQueries,
      openQueries,
      escalatedQueries,
      answeredQueries,
      totalFAQs,
      userBreakdown: { student: studentCount, mentor: mentorCount, admin: adminCount, byPhase: phaseCounts },
      queryTrends: { today: queriesToday, thisWeek: queriesThisWeek, thisMonth: queriesThisMonth },
      avgResolutionHours
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics overview.' });
  }
});

// GET /api/admin/analytics/users - User analytics
router.get('/users', protect, restrictTo('admin'), async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Active users (logged in last 7 days)
    const activeUsers = await User.countDocuments({ lastSeen: { $gte: sevenDaysAgo } });

    // User growth over last 30 days (daily signup count)
    const dailySignups = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top users by queries raised
    const topQueryRaiser = await Query.aggregate([
      { $group: { _id: '$author', queryCount: { $sum: 1 } } },
      { $sort: { queryCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 1, queryCount: 1, name: '$user.name', email: '$user.email' } }
    ]);

    // Top users by answers given
    const topAnswerer = await Query.aggregate([
      { $unwind: '$answers' },
      { $group: { _id: '$answers.author', answerCount: { $sum: 1 } } },
      { $sort: { answerCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 1, answerCount: 1, name: '$user.name', email: '$user.email' } }
    ]);

    res.json({ activeUsers, dailySignups, topQueryRaiser, topAnswerer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user analytics.' });
  }
});

// GET /api/admin/analytics/queries - Query analytics
router.get('/queries', protect, restrictTo('admin'), async (req, res) => {
  try {
    const total = await Query.countDocuments({});

    // Category breakdown
    const categoryBreakdown = await Query.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).then(arr => arr.map(item => ({
      category: item._id,
      count: item.count,
      percentage: total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0
    })));

    // Status distribution
    const statusCounts = await Query.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Average views per query
    const viewStats = await Query.aggregate([
      { $group: { _id: null, avgViews: { $avg: '$views' }, maxViews: { $max: '$views' } } }
    ]);

    // Most viewed queries
    const mostViewed = await Query.find({})
      .populate('author', 'name avatar')
      .sort({ views: -1 })
      .limit(10)
      .select('title views category status createdAt')
      .lean();

    res.json({
      total,
      categoryBreakdown,
      statusDistribution: statusCounts,
      avgViews: viewStats[0] ? Math.round(viewStats[0].avgViews * 10) / 10 : 0,
      maxViews: viewStats[0] ? viewStats[0].maxViews : 0,
      mostViewed
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch query analytics.' });
  }
});

// GET /api/admin/analytics/system - System health
router.get('/system', protect, restrictTo('admin'), async (req, res) => {
  try {
    const [totalQueries, withAiAnswer, unanswered] = await Promise.all([
      Query.countDocuments({}),
      Query.countDocuments({ 'aiAnswer.content': { $exists: true, $ne: '' } }),
      Query.countDocuments({ status: 'open', 'aiAnswer.content': { $exists: false } })
    ]);

    const faqCoverage = totalQueries > 0 ? Math.round((withAiAnswer / totalQueries) * 1000) / 10 : 0;

    // Average AI confidence score
    const confidenceStats = await Query.aggregate([
      { $match: { 'aiAnswer.confidenceScore': { $exists: true, $ne: null } } },
      { $group: { _id: null, avgConfidence: { $avg: '$aiAnswer.confidenceScore' } } }
    ]);

    // Recently resolved queries
    const recentlyResolved = await Query.find({ status: 'answered', answeredAt: { $exists: true } })
      .populate('author', 'name avatar')
      .sort({ answeredAt: -1 })
      .limit(10)
      .select('title category answeredAt views')
      .lean();

    res.json({
      totalQueries,
      faqCoverage,
      avgAiConfidence: confidenceStats[0] ? Math.round(confidenceStats[0].avgConfidence * 100) / 100 : null,
      unansweredQueries: unanswered,
      recentlyResolved
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch system health.' });
  }
});

module.exports = router;