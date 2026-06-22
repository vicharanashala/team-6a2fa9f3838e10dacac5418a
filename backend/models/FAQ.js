const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['NOC', 'Offer Letter', 'ViBe', 'Rosetta', 'Team Formation', 'Coursework',
           'Mentor Support', 'AI/Yaksha', 'Certificate', 'Timing', 'About', 'General', 'Community Verified']
  },
  subcategory: String,
  sectionId: String, // e.g. "12.11"
  question: { type: String, required: true },
  answer: { type: String, required: true },
  tags: [String],
  keywords: [String],
  importance: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
  relatedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FAQ' }],
  verified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  source: { type: String, enum: ['official', 'community', 'mentor'], default: 'official' },
  // For continuous learning
  usageCount: { type: Number, default: 0 },
  helpfulVotes: { type: Number, default: 0 },
  notHelpfulVotes: { type: Number, default: 0 },
  // TF-IDF vector (simple keyword weights)
  tfidfVector: { type: Map, of: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

faqSchema.index({ question: 'text', answer: 'text', keywords: 'text', tags: 'text' });
faqSchema.index({ category: 1, importance: 1 });
faqSchema.index({ usageCount: -1 });

faqSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  // Build simple keyword vector for similarity
  const text = `${this.question} ${this.answer} ${this.keywords.join(' ')} ${this.tags.join(' ')}`.toLowerCase();
  const words = text.split(/\W+/).filter(w => w.length > 3);
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  this.tfidfVector = freq;
  next();
});

module.exports = mongoose.model('FAQ', faqSchema);
