const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');
const { processRAGQuery, refineQuestion, findSimilarQueries } = require('../utils/ragService');
const FAQ = require('../models/FAQ');
const { Analytics } = require('../models/Analytics');

const router = express.Router();

// POST /api/ai/ask - Main RAG query endpoint
router.post('/ask', optionalAuth, async (req, res) => {
  try {
    const { question, explainMode = 'intermediate', queryId, image } = req.body;
    
    console.log('🔵 AI Ask Request:', { question, explainMode, userId: req.user?._id, hasImage: !!image });
    
    if (!question && !image) {
      console.warn('⚠️ No question or image provided');
      return res.status(400).json({ error: 'Please provide a question or upload a photo.' });
    }
    
    const trimmedQuestion = question ? String(question).trim() : '';
    if (!image && trimmedQuestion.length < 3) {
      console.warn('⚠️ Question too short:', trimmedQuestion.length);
      return res.status(400).json({ error: 'Question must be at least 3 characters.' });
    }

    console.log('🟢 Processing query:', trimmedQuestion || '[Image Only]');
    const result = await processRAGQuery(trimmedQuestion, {
      explainMode,
      userId: req.user?._id,
      queryId,
      image
    });

    console.log('✅ AI Response generated');
    res.json(result);
  } catch (err) {
    console.error('❌ AI ask error:', err.message, err.stack);
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// POST /api/ai/refine - Question refinement
router.post('/refine', optionalAuth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required.' });
    const refined = await refineQuestion(question);
    res.json({ refined, original: question });
  } catch (err) {
    res.status(500).json({ error: 'Refinement failed.' });
  }
});

// POST /api/ai/check-duplicate - Before posting a query
router.post('/check-duplicate', optionalAuth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required.' });

    const [similarQueries, relatedFAQs] = await Promise.all([
      findSimilarQueries(question),
      FAQ.find({ $text: { $search: question } }, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } }).limit(3).lean()
    ]);

    res.json({
      hasDuplicates: similarQueries.length > 0,
      similarQueries: similarQueries.map(s => ({
        id: s.query._id,
        title: s.query.title,
        category: s.query.category,
        status: s.query.status,
        similarity: parseFloat((s.similarity * 100).toFixed(1)),
        createdAt: s.query.createdAt
      })),
      relatedFAQs: relatedFAQs.map(f => ({
        id: f._id,
        sectionId: f.sectionId,
        category: f.category,
        question: f.question,
        answer: f.answer.substring(0, 200) + '...'
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Duplicate check failed.' });
  }
});

// GET /api/ai/daily-insight - AI-generated daily insight
router.get('/daily-insight', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get top categories from today's analytics
    const topCategories = await Analytics.aggregate([
      { $match: { date: { $gte: today }, type: 'ai_call' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    const trendingFAQs = await FAQ.find().sort({ usageCount: -1 }).limit(5).lean();

    const insights = [
      `Most students today are asking about ${topCategories[0]?._id || 'ViBe Platform'} — ${topCategories[0]?.count || 0} queries in the last 24 hours.`,
      `The most referenced FAQ today is §${trendingFAQs[0]?.sectionId || '12.13'}: "${trendingFAQs[0]?.question?.substring(0, 50) || 'Access Restricted banner'}..."`,
      `${trendingFAQs.filter(f => f.category === 'ViBe').length} ViBe-related questions were in the top FAQs today. Ensure your camera and lighting setup is correct before starting.`,
    ];

    res.json({
      insight: insights[Math.floor(Math.random() * insights.length)],
      trendingCategories: topCategories.map(c => c._id),
      topFAQs: trendingFAQs.slice(0, 3).map(f => ({ sectionId: f.sectionId, question: f.question, usageCount: f.usageCount }))
    });
  } catch (err) {
    res.json({ insight: 'Most students today are exploring ViBe platform and NOC submission workflows.', trendingCategories: ['ViBe', 'NOC'], topFAQs: [] });
  }
});

// POST /api/ai/feedback - Rate AI answer
router.post('/feedback', protect, async (req, res) => {
  try {
    const { faqId, helpful } = req.body;
    if (!faqId) return res.status(400).json({ error: 'FAQ ID required.' });
    const update = helpful ? { $inc: { helpfulVotes: 1 } } : { $inc: { notHelpfulVotes: 1 } };
    await FAQ.findByIdAndUpdate(faqId, update);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Feedback failed.' });
  }
});

module.exports = router;
