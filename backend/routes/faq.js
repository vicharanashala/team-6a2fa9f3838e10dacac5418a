const express = require('express');
const FAQ = require('../models/FAQ');
const { protect, restrictTo } = require('../middleware/auth');
const { Analytics } = require('../models/Analytics');

const router = express.Router();

// GET /api/faq - Get all FAQs with filters
router.get('/', async (req, res) => {
  try {
    const { category, search, importance, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (category && category !== 'All') filter.category = category;
    if (importance) filter.importance = importance;

    let query;
    if (search) {
      query = FAQ.find({ ...filter, $text: { $search: search } }, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    } else {
      query = FAQ.find(filter).sort({ importance: 1, usageCount: -1 });
    }

    const total = await FAQ.countDocuments(filter);
    const faqs = await query.skip((page - 1) * limit).limit(parseInt(limit)).lean();

    res.json({ faqs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch FAQs.' });
  }
});

// GET /api/faq/categories - Category stats
router.get('/categories', async (req, res) => {
  try {
    const stats = await FAQ.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, totalUsage: { $sum: '$usageCount' }, criticalCount: { $sum: { $cond: [{ $eq: ['$importance', 'critical'] }, 1, 0] } } } },
      { $sort: { totalUsage: -1 } }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// GET /api/faq/trending - Trending FAQs
router.get('/trending', async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ usageCount: -1 }).limit(10).lean();
    res.json(faqs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trending FAQs.' });
  }
});

// GET /api/faq/:id
router.get('/:id', async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id).lean();
    if (!faq) return res.status(404).json({ error: 'FAQ not found.' });
    await FAQ.findByIdAndUpdate(req.params.id, { $inc: { usageCount: 1 } });
    res.json(faq);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch FAQ.' });
  }
});

// POST /api/faq - Create FAQ (mentor/admin)
router.post('/', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const faq = await FAQ.create({ ...req.body, verifiedBy: req.user._id });
    res.status(201).json(faq);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/faq/:id - Update FAQ
router.patch('/:id', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!faq) return res.status(404).json({ error: 'FAQ not found.' });
    res.json(faq);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/faq/:id
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    await FAQ.findByIdAndDelete(req.params.id);
    res.json({ message: 'FAQ deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete FAQ.' });
  }
});

module.exports = router;
