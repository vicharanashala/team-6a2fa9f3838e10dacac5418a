const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['query', 'search', 'ai_call', 'faq_view', 'escalation', 'page_view'] },
  category: String,
  query: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  queryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Query' },
  faqId: { type: mongoose.Schema.Types.ObjectId, ref: 'FAQ' },
  confidenceLevel: String,
  confidenceScore: Number,
  sessionId: String,
  metadata: mongoose.Schema.Types.Mixed
});

analyticsSchema.index({ date: -1 });
analyticsSchema.index({ type: 1, date: -1 });
analyticsSchema.index({ category: 1 });

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  priority: { type: String, enum: ['urgent', 'important', 'general'], default: 'general' },
  category: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetAudience: { type: String, enum: ['all', 'bronze', 'silver', 'gold'], default: 'all' },
  deadline: Date,
  aiSummary: String,
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPinned: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  Analytics: mongoose.model('Analytics', analyticsSchema),
  Announcement: mongoose.model('Announcement', announcementSchema)
};
