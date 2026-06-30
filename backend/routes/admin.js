const express = require('express');
const User = require('../models/User');
const Query = require('../models/Query');
const FAQ = require('../models/FAQ');
const { Announcement } = require('../models/Analytics');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();
module.exports = router;

// ============================================================
// Admin Stats
// GET /api/admin/stats
// ============================================================
router.get('/stats', protect, restrictTo('admin'), async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      userCount, queryCount, faqCount, announcementCount,
      openQueries, escalatedCount, answeredCount,
      studentCount, mentorCount, adminCount,
      activeUsers,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Query.countDocuments({}),
      FAQ.countDocuments({}),
      Announcement.countDocuments({}),
      Query.countDocuments({ status: 'open' }),
      Query.countDocuments({ isEscalated: true }),
      Query.countDocuments({ status: 'answered' }),
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'mentor', isActive: true }),
      User.countDocuments({ role: 'admin', isActive: true }),
      User.countDocuments({ lastSeen: { $gte: weekAgo } }),
    ]);

    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const queriesToday = await Query.countDocuments({ createdAt: { $gte: todayStart } });

    // Role breakdown
    const roleBreakdown = { student: studentCount, mentor: mentorCount, admin: adminCount };

    res.json({
      userCount, queryCount, faqCount, announcementCount,
      openQueries, escalatedQueries: escalatedCount, answeredCount,
      activeUsers, queriesToday,
      roleBreakdown,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to load admin stats.' });
  }
});

// ============================================================
// Admin Users
// GET /api/admin/users?page=1&limit=15&role=&search=
// ============================================================
router.get('/users', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 15, role, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { isActive: true };
    if (role && role !== 'all') filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    // Per-user stats
    const userIds = users.map(u => u._id);
    const queryCounts = await Query.aggregate([
      { $match: { author: { $in: userIds } } },
      { $group: { _id: '$author', count: { $sum: 1 } } }
    ]);
    const answerCounts = await Query.aggregate([
      { $unwind: '$answers' },
      { $match: { 'answers.author': { $in: userIds } } },
      { $group: { _id: '$answers.author', count: { $sum: 1 } } }
    ]);
    const qMap = Object.fromEntries(queryCounts.map(r => [r._id.toString(), r.count]));
    const aMap = Object.fromEntries(answerCounts.map(r => [r._id.toString(), r.count]));

    const enriched = users.map(u => ({
      ...u,
      stats: {
        queriesRaised: qMap[u._id.toString()] || 0,
        answersGiven: aMap[u._id.toString()] || 0,
      }
    }));

    res.json({ users: enriched, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

// PATCH /api/admin/users/:id - Update user role/status
router.patch('/users/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { role, isActive, assignedMentor } = req.body;
    const updates = {};
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (assignedMentor !== undefined) updates.assignedMentor = assignedMentor;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, lean: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    console.error('Admin patch user error:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// DELETE /api/admin/users/:id - Soft delete user
router.delete('/users/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true, lean: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deactivated.', user });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// ============================================================
// Admin Queries
// GET /api/admin/queries?page=1&limit=15&status=&category=&search=
// ============================================================
router.get('/queries', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 15, status, category, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const [queries, total] = await Promise.all([
      Query.find(filter)
        .populate('author', 'name email role')
        .populate('assignedMentor', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Query.countDocuments(filter),
    ]);

    res.json({ queries, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Admin queries error:', err);
    res.status(500).json({ error: 'Failed to load queries.' });
  }
});

// ============================================================
// Admin Escalated Queries
// GET /api/admin/escalated
// ============================================================
router.get('/escalated', protect, restrictTo('admin'), async (req, res) => {
  try {
    const escalated = await Query.find({ isEscalated: true })
      .populate('author', 'name email')
      .populate('assignedMentor', 'name email')
      .sort({ escalatedAt: -1 })
      .lean();
    res.json({ queries: escalated, total: escalated.length, page: 1, pages: 1 });
  } catch (err) {
    console.error('Admin escalated error:', err);
    res.status(500).json({ error: 'Failed to load escalated queries.' });
  }
});

// PATCH /api/admin/escalated/:id/resolve
router.patch('/escalated/:id/resolve', protect, restrictTo('admin'), async (req, res) => {
  try {
    const query = await Query.findByIdAndUpdate(
      req.params.id,
      { isEscalated: false, status: 'resolved', resolvedAt: new Date() },
      { new: true }
    ).populate('author', 'name email');
    if (!query) return res.status(404).json({ error: 'Query not found.' });
    res.json({ query });
  } catch (err) {
    console.error('Resolve escalated error:', err);
    res.status(500).json({ error: 'Failed to resolve query.' });
  }
});

// ============================================================
// Admin FAQs
// GET /api/admin/faqs?page=1&limit=15&category=&search=
// ============================================================
router.get('/faqs', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 15, category, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (search) {
      filter.$or = [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } },
      ];
    }

    const [faqs, total] = await Promise.all([
      FAQ.find(filter).sort({ category: 1, sectionId: 1 }).skip(skip).limit(parseInt(limit)).lean(),
      FAQ.countDocuments(filter),
    ]);

    res.json({ faqs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Admin faqs error:', err);
    res.status(500).json({ error: 'Failed to load FAQs.' });
  }
});

// POST /api/admin/faqs
router.post('/faqs', protect, restrictTo('admin', 'mentor'), async (req, res) => {
  try {
    const faq = await FAQ.create(req.body);
    res.status(201).json({ faq });
  } catch (err) {
    console.error('Create FAQ error:', err);
    res.status(500).json({ error: 'Failed to create FAQ.' });
  }
});

// PATCH /api/admin/faqs/:id
router.patch('/faqs/:id', protect, restrictTo('admin', 'mentor'), async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, { new: true, lean: true });
    if (!faq) return res.status(404).json({ error: 'FAQ not found.' });
    res.json({ faq });
  } catch (err) {
    console.error('Update FAQ error:', err);
    res.status(500).json({ error: 'Failed to update FAQ.' });
  }
});

// DELETE /api/admin/faqs/:id
router.delete('/faqs/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ error: 'FAQ not found.' });
    res.json({ message: 'FAQ deleted.' });
  } catch (err) {
    console.error('Delete FAQ error:', err);
    res.status(500).json({ error: 'Failed to delete FAQ.' });
  }
});

// ============================================================
// Admin Announcements
// GET /api/admin/announcements
// POST /api/admin/announcements
// PATCH /api/admin/announcements/:id
// DELETE /api/admin/announcements/:id
// ============================================================
router.get('/announcements', protect, restrictTo('admin'), async (req, res) => {
  try {
    const announcements = await Announcement.find({})
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ announcements });
  } catch (err) {
    console.error('Admin announcements error:', err);
    res.status(500).json({ error: 'Failed to load announcements.' });
  }
});

router.post('/announcements', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { title, content, priority, isPinned } = req.body;
    const announcement = await Announcement.create({
      title, content, priority, isPinned,
      author: req.user._id,
    });
    res.status(201).json({ announcement });
  } catch (err) {
    console.error('Create announcement error:', err);
    res.status(500).json({ error: 'Failed to create announcement.' });
  }
});

router.patch('/announcements/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { title, content, priority, isPinned, isActive } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (content !== undefined) update.content = content;
    if (priority !== undefined) update.priority = priority;
    if (isPinned !== undefined) update.isPinned = isPinned;
    if (isActive !== undefined) update.isActive = isActive;

    const announcement = await Announcement.findByIdAndUpdate(req.params.id, update, { new: true, lean: true });
    if (!announcement) return res.status(404).json({ error: 'Announcement not found.' });
    res.json({ announcement });
  } catch (err) {
    console.error('Update announcement error:', err);
    res.status(500).json({ error: 'Failed to update announcement.' });
  }
});

router.delete('/announcements/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return res.status(404).json({ error: 'Announcement not found.' });
    res.json({ message: 'Announcement deleted.' });
  } catch (err) {
    console.error('Delete announcement error:', err);
    res.status(500).json({ error: 'Failed to delete announcement.' });
  }
});