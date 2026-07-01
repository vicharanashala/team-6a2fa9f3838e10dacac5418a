const express = require('express');
const { Announcement } = require('../models/Analytics');
const { protect, restrictTo } = require('../middleware/auth');

const announcementRouter = express.Router();

// GET /api/announcements/ - List active announcements (public)
announcementRouter.get('/', async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .populate('author', 'name role').sort({ isPinned: -1, createdAt: -1 }).lean();
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
});

// GET /api/announcements/admin/all - List ALL announcements including inactive (admin only)
announcementRouter.get('/admin/all', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await Announcement.countDocuments({});
    const announcements = await Announcement.find({})
      .populate('author', 'name role avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    res.json({ announcements, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
});

// GET /api/announcements/admin/stats - Announcement statistics (admin only)
announcementRouter.get('/admin/stats', protect, restrictTo('admin'), async (req, res) => {
  try {
    const [total, urgentCount, importantCount, generalCount, pinnedCount] = await Promise.all([
      Announcement.countDocuments({}),
      Announcement.countDocuments({ priority: 'urgent', isActive: true }),
      Announcement.countDocuments({ priority: 'important', isActive: true }),
      Announcement.countDocuments({ priority: 'general', isActive: true }),
      Announcement.countDocuments({ isPinned: true, isActive: true })
    ]);
    const recentAnnouncements = await Announcement.find({ isActive: true })
      .sort({ createdAt: -1 }).limit(5).populate('author', 'name').lean();
    res.json({ total, byPriority: { urgent: urgentCount, important: importantCount, general: generalCount }, pinnedCount, recentAnnouncements });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcement stats.' });
  }
});

// POST /api/announcements/ - Create announcement (mentor/admin only)
announcementRouter.post('/', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const ann = await Announcement.create({ ...req.body, author: req.user._id });
    res.status(201).json(ann);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/announcements/:id - Update announcement (admin only)
announcementRouter.patch('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { title, content, priority, isPinned, isActive } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (content !== undefined) update.content = content;
    if (priority !== undefined) update.priority = priority;
    if (isPinned !== undefined) update.isPinned = isPinned;
    if (isActive !== undefined) update.isActive = isActive;

    const ann = await Announcement.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!ann) return res.status(404).json({ error: 'Announcement not found.' });
    res.json(ann);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/announcements/:id/read - Mark as read by current user
announcementRouter.patch('/:id/read', protect, async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { $addToSet: { readBy: req.user._id } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/announcements/:id - Soft delete announcement (admin only)
announcementRouter.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const ann = await Announcement.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!ann) return res.status(404).json({ error: 'Announcement not found.' });
    res.json({ message: 'Announcement removed.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = announcementRouter;