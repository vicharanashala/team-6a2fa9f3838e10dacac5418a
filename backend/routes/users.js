const express = require('express');
const User = require('../models/User');
const Query = require('../models/Query');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('bookmarkedQueries', 'title category status createdAt').lean();
    const queryCount = await Query.countDocuments({ author: req.user._id });
    res.json({ ...user, queryCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// PATCH /api/users/profile
router.patch('/profile', protect, async (req, res) => {
  try {
    const { name, college, batch, preferences } = req.body;
    const update = {};
    if (name) update.name = name;
    if (college) update.college = college;
    if (batch) update.batch = batch;
    if (preferences) update.preferences = { ...req.user.preferences, ...preferences };
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
    res.json({ user });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ error: msg });
    }
    res.status(400).json({ error: err.message });
  }
});

// GET /api/users/bookmarks
router.get('/bookmarks', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'bookmarkedQueries',
      populate: { path: 'author', select: 'name avatar' }
    });
    res.json(user.bookmarkedQueries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookmarks.' });
  }
});

// GET /api/users/my-queries
router.get('/my-queries', protect, async (req, res) => {
  try {
    const queries = await Query.find({ author: req.user._id }).sort({ createdAt: -1 }).limit(20).lean();
    res.json(queries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queries.' });
  }
});

router.patch('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

router.delete('/withdraw', protect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account deleted permanently.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /api/users/ - List all users (admin only)
router.get('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20, isActive } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// GET /api/users/stats/overview - User stats overview (admin only)
router.get('/stats/overview', protect, restrictTo('admin'), async (req, res) => {
  try {
    const [total, student, mentor, admin, recentSignups] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'mentor' }),
      User.countDocuments({ role: 'admin' }),
      User.find({}).sort({ createdAt: -1 }).limit(5).select('-password').lean()
    ]);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    res.json({ total, byRole: { student, mentor, admin }, recentSignups, recentSignupsCount: recentCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user stats.' });
  }
});

// GET /api/users/:id - Get user details (admin only)
router.get('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const queryCount = await Query.countDocuments({ author: req.params.id });
    res.json({ ...user, queryCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// PATCH /api/users/:id/role - Change user role (admin only)
router.patch('/:id/role', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'mentor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be student, mentor, or admin.' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/users/:id/status - Activate/deactivate user (admin only)
router.patch('/:id/status', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be a boolean.' });
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/users/:id - Soft delete user (admin only)
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;