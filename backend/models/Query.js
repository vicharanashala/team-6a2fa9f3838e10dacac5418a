const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorType: { type: String, enum: ['ai', 'mentor', 'community', 'pending'], default: 'community' },
  confidence: { type: String, enum: ['high', 'medium', 'low', 'na'], default: 'na' },
  sourceLabel: { type: String, enum: ['FAQ Based', 'AI Assisted', 'Mentor Verified', 'Community Answer', 'Pending Validation'], default: 'Community Answer' },
  sourceFAQs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FAQ' }],
  sourceSections: [String], // e.g. ["§12.11", "§12.13"]
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  voters: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, vote: String }],
  isAccepted: { type: Boolean, default: false },
  // Continuous learning - was this added to FAQ?
  addedToKnowledgeBase: { type: Boolean, default: false },
  knowledgeBaseEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'FAQ' },
  createdAt: { type: Date, default: Date.now }
});

const querySchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  content: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ['NOC', 'Offer Letter', 'ViBe', 'Rosetta', 'Team Formation', 'Coursework',
           'Mentor Support', 'AI/Yaksha', 'Certificate', 'Timing', 'About', 'General']
  },
  tags: [String],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['open', 'answered', 'resolved', 'escalated'], default: 'open' },
  priority: { type: String, enum: ['urgent', 'high', 'normal', 'low'], default: 'normal' },
  // ── Answer Queue lock (CSFAQ-style pull-and-answer flow) ──────────────
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lockedAt: { type: Date, default: null },
  lockExpiresAt: { type: Date, default: null },
  skipCount: { type: Number, default: 0 },
  isStalled: { type: Boolean, default: false },
  answers: [answerSchema],
  aiAnswer: {
    content: String,
    confidence: { type: String, enum: ['high', 'medium', 'low'] },
    confidenceScore: Number,
    sourceFAQs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FAQ' }],
    sourceSections: [String],
    followUpSuggestions: [String],
    generatedAt: Date,
    escalationRequired: Boolean,
    explainMode: { type: String, default: 'intermediate' }
  },
  relatedFAQs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FAQ' }],
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Query' },
  views: { type: Number, default: 0 },
  bookmarks: { type: Number, default: 0 },
  isEscalated: { type: Boolean, default: false },
  escalatedAt: Date,
  escalatedReason: {
    type: String,
    enum: ['ai_incorrect', 'not_answered', 'need_human', 'technical', 'other'],
    default: null
  },
  escalationComments: { type: String, default: null },
  resolvedAt: Date,
  assignedMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Refined question from AI
  refinedTitle: String,
  images: [String],
  searchVector: { type: Map, of: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

querySchema.index({ title: 'text', content: 'text', tags: 'text' });
querySchema.index({ category: 1, status: 1, createdAt: -1 });
querySchema.index({ author: 1 });
querySchema.index({ views: -1 });

querySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  const text = `${this.title} ${this.content} ${this.tags.join(' ')}`.toLowerCase();
  const words = text.split(/\W+/).filter(w => w.length > 3);
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  this.searchVector = freq;
  next();
});

module.exports = mongoose.model('Query', querySchema);
