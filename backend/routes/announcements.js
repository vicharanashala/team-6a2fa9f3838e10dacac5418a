const express = require('express');
const { Announcement } = require('../models/Analytics');
const { protect, restrictTo } = require('../middleware/auth');

const announcementRouter = express.Router();

announcementRouter.get('/', async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .populate('author', 'name role').sort({ isPinned: -1, createdAt: -1 }).lean();
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
});

announcementRouter.post('/', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const ann = await Announcement.create({ ...req.body, author: req.user._id });
    res.status(201).json(ann);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

announcementRouter.patch('/:id/read', protect, async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { $addToSet: { readBy: req.user._id } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

announcementRouter.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Announcement removed.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = announcementRouter;
