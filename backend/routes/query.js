const express = require('express');
const Query = require('../models/Query');
const FAQ = require('../models/FAQ');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
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

    res.json({ queries, total, page: parseInt(page), pages: Math.ceil(total / limit) });
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
    res.json(queries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trending.' });
  }
});

// GET /api/queries/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const query = await Query.findById(req.params.id)
      .populate('author', 'name role avatar phase college')
      .populate('relatedFAQs')
      .populate('answers.author', 'name role avatar phase')
      .lean();
    if (!query) return res.status(404).json({ error: 'Query not found.' });
    await Query.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    await Analytics.create({ type: 'page_view', queryId: query._id, userId: req.user?._id, category: query.category });
    res.json(query);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch query.' });
  }
});

// POST /api/queries - Create new query
router.post('/', protect, async (req, res) => {
  try {
    const { title, content, category, tags, refinedTitle } = req.body;
    if (!title || !content || !category) return res.status(400).json({ error: 'Title, content and category are required.' });

    // Auto-generate AI answer for the new query
    const query = await Query.create({ title, content, category, tags: tags || [], refinedTitle, author: req.user._id });

    // Generate AI answer async
    try {
      const aiResult = await processRAGQuery(title + ' ' + content, {
        explainMode: req.user.preferences?.explainMode || 'intermediate',
        userId: req.user._id,
        queryId: query._id
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

    const populated = await Query.findById(query._id).populate('author', 'name role avatar').lean();
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
    res.json(updated);
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

// POST /api/queries/:id/bookmark
router.post('/:id/bookmark', protect, async (req, res) => {
  try {
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

module.exports = router;
