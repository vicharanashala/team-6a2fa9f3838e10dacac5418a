const { GoogleGenerativeAI } = require('@google/generative-ai');
const FAQ = require('../models/FAQ');
const { Analytics } = require('../models/Analytics');

let genAI;
function getGenAI() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

// Cosine similarity between two TF-IDF vectors
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB) return 0;
  const mapA = vecA instanceof Map ? Object.fromEntries(vecA) : vecA;
  const mapB = vecB instanceof Map ? Object.fromEntries(vecB) : vecB;
  const keysA = Object.keys(mapA);
  if (keysA.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  keysA.forEach(k => {
    const a = mapA[k] || 0;
    const b = mapB[k] || 0;
    dot += a * b;
    magA += a * a;
  });
  Object.values(mapB).forEach(v => { magB += v * v; });
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Build query vector from user question
function buildQueryVector(text) {
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return freq;
}

// Core RAG retrieval: find top-N similar FAQs
async function retrieveRelevantFAQs(question, topN = 5) {
  const queryVec = buildQueryVector(question);

  // First try MongoDB text search
  let textResults = [];
  try {
    textResults = await FAQ.find(
      { $text: { $search: question } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } }).limit(20).lean();
  } catch (e) {
    textResults = await FAQ.find().limit(100).lean();
  }

  // Also get all FAQs for cosine similarity (if DB is small)
  const allFAQs = textResults.length > 0 ? textResults : await FAQ.find().lean();

  // Score each FAQ
  const scored = allFAQs.map(faq => {
    const faqVec = faq.tfidfVector instanceof Map
      ? Object.fromEntries(faq.tfidfVector)
      : (faq.tfidfVector || {});
    const cosine = cosineSimilarity(queryVec, faqVec);
    const textScore = faq.score || 0;
    // Combined score: cosine + normalized text score
    const combined = (cosine * 0.6) + (Math.min(textScore, 10) / 10 * 0.4);
    return { faq, score: combined, cosineScore: cosine };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).filter(s => s.score > 0.01);
}

// Calculate confidence level from similarity scores
function calculateConfidence(scoredFAQs) {
  if (!scoredFAQs || scoredFAQs.length === 0) return { level: 'low', score: 0 };
  const avgScore = scoredFAQs.reduce((sum, s) => sum + s.score, 0) / scoredFAQs.length;
  const topScore = scoredFAQs[0]?.score || 0;
  const combined = (avgScore * 0.4) + (topScore * 0.6);

  if (combined >= 0.35) return { level: 'high', score: Math.min(combined * 100, 98) };
  if (combined >= 0.15) return { level: 'medium', score: combined * 100 };
  return { level: 'low', score: combined * 100 };
}

// Build the RAG system prompt
function buildSystemPrompt(explainMode = 'intermediate') {
  const modeInstructions = {
    beginner: 'Use simple, friendly language. Avoid jargon. Use bullet points. Explain everything step by step as if to a first-timer.',
    intermediate: 'Use clear, professional language. Be concise but thorough. Include relevant details.',
    detailed: 'Provide comprehensive explanation with full context, edge cases, important caveats, and all relevant details.'
  };

  return `You are VINS AI — the official intelligence assistant for the Vicharanashala Internship (VINS) at IIT Ropar.

YOUR STRICT RULES:
1. Answer ONLY from the provided FAQ context. Never invent policies, dates, or procedures.
2. If context is insufficient or confidence is low, explicitly say so and recommend mentor escalation.
3. Always cite FAQ section numbers when available (e.g., §3.9, §12.11).
4. Never say things like "According to my knowledge" — say "According to the FAQ" or "Based on §X.X".
5. If multiple FAQs are relevant, synthesize them into a coherent answer.
6. End with 2-3 suggested follow-up questions the student might have.

EXPLAIN MODE: ${modeInstructions[explainMode] || modeInstructions.intermediate}

RESPONSE FORMAT:
- Main answer paragraph(s)
- If applicable: key points as bullets
- Section citations at the end: "Sources: §X.X, §Y.Y"
- Follow-ups: "You might also want to know: ..."`;
}

// Main RAG query function
async function processRAGQuery(question, options = {}) {
  const { explainMode = 'intermediate', userId = null, queryId = null } = options;

  try {
    // Step 1: Retrieve relevant FAQs
    const scoredFAQs = await retrieveRelevantFAQs(question, 5);

    // Step 2: Calculate confidence
    const confidence = calculateConfidence(scoredFAQs);

    // Step 3: Check if escalation needed
    const escalationRequired = confidence.level === 'low' || scoredFAQs.length === 0;

    // Step 4: Build context from retrieved FAQs
    const faqContext = scoredFAQs.map((s, i) => {
      const f = s.faq;
      return `[FAQ ${i + 1}] ${f.sectionId ? `§${f.sectionId}` : ''} ${f.category} - ${f.question}\n${f.answer}`;
    }).join('\n\n---\n\n');

    // Step 5: Track usage
    scoredFAQs.forEach(async s => {
      await FAQ.findByIdAndUpdate(s.faq._id, { $inc: { usageCount: 1 } });
    });

    // Step 6: Generate AI answer
    let aiContent = '';
    let followUpSuggestions = [];

    const ai = getGenAI();
    if (ai && faqContext && process.env.GEMINI_API_KEY?.length > 10) {
      try {
        const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });
        const prompt = `${buildSystemPrompt(explainMode)}

FAQ CONTEXT (use ONLY this to answer):
${faqContext}

Student question: "${question}"

${escalationRequired ? 'NOTE: Confidence is low. Acknowledge limitations and recommend escalation.' : ''}

Respond with a JSON object:
{
  "answer": "your detailed answer here",
  "followUps": ["follow up question 1", "follow up question 2", "follow up question 3"],
  "escalationMessage": "reason for escalation if needed or null"
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiContent = parsed.answer || text;
          followUpSuggestions = parsed.followUps || [];
        } else {
          aiContent = text;
        }
      } catch (geminiError) {
        console.error('Gemini error:', geminiError.message);
        // Fallback: use best FAQ answer directly
        if (scoredFAQs.length > 0) {
          aiContent = `Based on the FAQ (${scoredFAQs[0].faq.sectionId ? `§${scoredFAQs[0].faq.sectionId}` : scoredFAQs[0].faq.category}):\n\n${scoredFAQs[0].faq.answer}`;
          followUpSuggestions = [
            'Is there anything else about this topic?',
            'Do you need clarification on any point?',
            'Would you like to escalate this to a mentor?'
          ];
        } else {
          aiContent = 'I could not find relevant information in the FAQ knowledge base. Please escalate to a mentor via Yaksha.';
        }
      }
    } else if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.length < 10) {
      // No valid API key - use FAQ directly
      console.warn('Gemini API key not configured or invalid. Using FAQ fallback.');
      if (scoredFAQs.length > 0) {
        aiContent = `📌 Based on FAQ ${scoredFAQs[0].faq.sectionId ? `§${scoredFAQs[0].faq.sectionId}` : `(${scoredFAQs[0].faq.category})`}:\n\n${scoredFAQs[0].faq.answer}`;
        if (scoredFAQs.length > 1) {
          aiContent += `\n\n📌 Related FAQ: ${scoredFAQs[1].faq.question}`;
        }
        followUpSuggestions = [
          'Need more details?',
          'Ask another question',
          'Escalate to mentor'
        ];
      } else {
        aiContent = '❌ No relevant FAQs found for your question.\n\nPlease:\n1. Check the FAQ browser\n2. Ask in discussions\n3. Escalate to a mentor in Yaksha';
      }
    } else if (scoredFAQs.length > 0) {
      // AI disabled but FAQs available
      aiContent = `Based on the FAQ:\n\n${scoredFAQs[0].faq.answer}`;
    } else {
      aiContent = 'No relevant information found. Please escalate to a mentor.';
    }

    // Step 7: Log analytics
    try {
      await Analytics.create({
        type: 'ai_call',
        query: question,
        userId,
        queryId,
        confidenceLevel: confidence.level,
        confidenceScore: confidence.score,
        category: scoredFAQs[0]?.faq?.category || 'Unknown',
        metadata: { faqCount: scoredFAQs.length, explainMode, escalationRequired }
      });
    } catch (e) { /* non-critical */ }

    return {
      answer: aiContent,
      confidence: confidence.level,
      confidenceScore: parseFloat(confidence.score.toFixed(1)),
      sourceFAQs: scoredFAQs.map(s => s.faq._id),
      sourceSections: scoredFAQs.map(s => s.faq.sectionId ? `§${s.faq.sectionId}` : s.faq.category).filter(Boolean),
      sourceDetails: scoredFAQs.map(s => ({
        id: s.faq._id,
        sectionId: s.faq.sectionId,
        category: s.faq.category,
        question: s.faq.question,
        similarity: parseFloat((s.score * 100).toFixed(1))
      })),
      followUpSuggestions: followUpSuggestions || [],
      escalationRequired,
      explainMode
    };
  } catch (err) {
    console.error('RAG Query Error:', err);
    return {
      answer: `⚠️ Error processing query: ${err.message || 'Unknown error'}\n\nPlease try again or escalate to a mentor.`,
      confidence: 'low',
      confidenceScore: 0,
      sourceFAQs: [],
      sourceSections: [],
      sourceDetails: [],
      followUpSuggestions: [],
      escalationRequired: true,
      explainMode
    };
  }
}

// Question refinement
async function refineQuestion(rawQuestion) {
  const ai = getGenAI();
  if (!ai) return rawQuestion;
  try {
    const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(
      `You are helping an intern improve their question for an internship support platform.
      
Raw question: "${rawQuestion}"

Improve this question to be:
1. Clear and specific
2. Use proper internship terminology (NOC, ViBe, Rosetta, SP points, etc.)
3. More searchable

Return ONLY the improved question, nothing else. If the question is already good, return it as-is.`
    );
    return result.response.text().trim();
  } catch (e) {
    return rawQuestion;
  }
}

// Find similar queries for duplicate detection
async function findSimilarQueries(question) {
  const Query = require('../models/Query');
  const queryVec = buildQueryVector(question);

  const recentQueries = await Query.find().populate('author', 'name').sort({ createdAt: -1 }).limit(200).lean();

  const scored = recentQueries.map(q => {
    const qVec = q.searchVector instanceof Map ? Object.fromEntries(q.searchVector) : (q.searchVector || {});
    const sim = cosineSimilarity(queryVec, qVec);
    return { query: q, similarity: sim };
  }).filter(s => s.similarity > 0.3).sort((a, b) => b.similarity - a.similarity).slice(0, 5);

  return scored;
}

module.exports = { processRAGQuery, refineQuestion, findSimilarQueries, retrieveRelevantFAQs };
