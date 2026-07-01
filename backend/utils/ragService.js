const { GoogleGenerativeAI } = require('@google/generative-ai');
const FAQ = require('../models/FAQ');
const { Analytics } = require('../models/Analytics');

const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

let genAI;
function getGenAI() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

function getGroqApiKey() {
  return process.env.GROQ_API_KEY || '';
}

function isTransientGroqError(error) {
  const status = error?.status || error?.response?.status;
  return status === 429 || status === 503 || /high demand|service unavailable|temporarily unavailable|rate limit/i.test(error?.message || '');
}

async function generateGroqContent(prompt, retries = 1) {
  let lastError;
  const apiKey = getGroqApiKey();

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const body = {
    model: GROQ_MODEL,
    temperature: 0.2,
    max_tokens: 1200,
    messages: [
      { role: 'system', content: 'You are a precise assistant that follows instructions exactly and returns only the requested content.' },
      { role: 'user', content: prompt }
    ]
  };

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Groq request failed with status ${response.status}: ${errorText}`);
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Groq response did not contain message content');
      }

      return content;
    } catch (error) {
      lastError = error;
      if (!isTransientGroqError(error) || attempt === retries) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw lastError;
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

  return `You are VINS AI — the highly efficient, friendly, and official intelligence assistant for the Vicharanashala Internship (VINS) at IIT Ropar, directly assisting students.

YOUR STRICT RULES:
1. EFFICIENCY & CLARITY: Be direct and highly efficient. Students are busy, so provide clear, well-formatted answers (use bullet points and bold key terms).
2. ACCURACY: Answer ONLY from the provided FAQ context. Never invent policies, dates, or procedures.
3. LIMITATIONS: If context is insufficient or confidence is low, clearly state it and gently recommend mentor escalation.
4. CITATIONS: Always cite FAQ section numbers when available (e.g., §3.9, §12.11) so students can verify.
5. TONE: Be encouraging and professional. Never use phrases like "According to my knowledge". Say "Based on §X.X" or "According to the FAQ".
6. SYNTHESIS: If multiple FAQs are relevant, synthesize them into a single coherent, well-structured answer.
7. FOLLOW-UPS: End with 2-3 highly relevant suggested follow-up questions.

EXPLAIN MODE: ${modeInstructions[explainMode] || modeInstructions.intermediate}

RESPONSE FORMAT (STRICTLY USE MARKDOWN):
- Always format your answer in rich Markdown. USE DOUBLE NEWLINES (\`\\n\\n\`) between paragraphs and sections. Use **bold** for keywords, bullet points for lists, and \`code blocks\` where helpful.
- Main answer paragraph(s)
- Key points as bullets (if applicable)
- Section citations at the end: "Sources: §X.X, §Y.Y"
- Follow-ups: "You might also want to know: ..."`;
}

// Extract a searchable text query from an image and user description
async function extractQueryFromImage(image, userDescription) {
  const ai = getGenAI();
  if (!ai) return userDescription || "problem shown in the image";
  try {
    const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `Analyze this image and description of an internship issue. 
User description: "${userDescription || 'Not provided'}"

Generate a search query of 1-3 sentences describing the exact error, technical issue, system state, or question shown in the image. Use specific terms where applicable (e.g. NOC, ViBe, Rosetta, offer letter, etc.).
Return ONLY the search query, nothing else.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: image.data,
          mimeType: image.mimeType
        }
      }
    ]);
    return result.response.text().trim();
  } catch (err) {
    console.error("Failed to extract query from image:", err);
    return userDescription || "problem shown in the image";
  }
}

// Main RAG query function
async function processRAGQuery(question, options = {}) {
  const { explainMode = 'intermediate', userId = null, queryId = null, image = null } = options;

  try {
    let searchQuestion = question;
    if (image && image.data) {
      const extractedQuery = await extractQueryFromImage(image, question);
      searchQuestion = question ? `${question} ${extractedQuery}` : extractedQuery;
      console.log('📷 Image query extracted:', extractedQuery);
    }

    // Step 1: Retrieve relevant FAQs
    const scoredFAQs = await retrieveRelevantFAQs(searchQuestion || "problem shown in the image", 5);

    // Step 2: Calculate confidence
    const confidence = calculateConfidence(scoredFAQs);

    // Step 3: Check if escalation needed
    const escalationRequired = confidence.level === 'low' || scoredFAQs.length === 0;

    // Step 4: Build context from retrieved FAQs
    const faqContext = scoredFAQs.map((s, i) => {
      const f = s.faq;
      return `[FAQ ${i + 1}] ${f.sectionId ? `§${f.sectionId}` : ''} ${f.category} - ${f.question}\n${f.answer}`;
    }).join('\n\n---\n\n');

    // Step 5: Track usage — await all updates, don't fire-and-forget
    await Promise.all(scoredFAQs.map(s =>
      FAQ.findByIdAndUpdate(s.faq._id, { $inc: { usageCount: 1 } }).catch(() => {})
    ));

    // Step 6: Generate AI answer
    let aiContent = '';
    let followUpSuggestions = [];

    const groqApiKey = getGroqApiKey();
    const ai = getGenAI();

    // If we have an image, we MUST use Gemini
    if (image && image.data && ai && faqContext) {
      try {
        const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });
        const prompt = `${buildSystemPrompt(explainMode)}

FAQ CONTEXT (use ONLY this to answer):
${faqContext}

Student question/description: "${question || 'Please see the attached image.'}"

${escalationRequired ? 'NOTE: Confidence is low. Acknowledge limitations and recommend escalation.' : ''}

Respond with a JSON object:
{
  "answer": "your detailed answer here",
  "followUps": ["follow up question 1", "follow up question 2", "follow up question 3"],
  "escalationMessage": "reason for escalation if needed or null"
}`;

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: image.data,
              mimeType: image.mimeType
            }
          }
        ]);
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
        console.error('Gemini multimodal error:', geminiError.message);
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
    } else if (groqApiKey && faqContext) {
      try {
        const prompt = `${buildSystemPrompt(explainMode)}

FAQ CONTEXT (use ONLY this to answer):
${faqContext}

Student question/description: "${question || 'Please see the attached image.'}"

${escalationRequired ? 'NOTE: Confidence is low. Acknowledge limitations and recommend escalation.' : ''}

Respond with a JSON object:
{
  "answer": "your detailed answer here",
  "followUps": ["follow up question 1", "follow up question 2", "follow up question 3"],
  "escalationMessage": "reason for escalation if needed or null"
}`;

        const text = await generateGroqContent(prompt, 1);
        console.log('Response generated by Groq API');

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiContent = parsed.answer || text;
          followUpSuggestions = parsed.followUps || [];
        } else {
          aiContent = text;
        }
      } catch (groqError) {
        const logMethod = isTransientGroqError(groqError) ? 'warn' : 'error';
        console[logMethod]('Groq error:', groqError.message);
        
        // If Groq fails but Gemini is available, try fallback to Gemini
        if (ai) {
          console.log('Falling back to Gemini...');
          try {
            const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });
            const prompt = `${buildSystemPrompt(explainMode)}

FAQ CONTEXT (use ONLY this to answer):
${faqContext}

Student question/description: "${question || 'Please see the attached image.'}"

${escalationRequired ? 'NOTE: Confidence is low. Acknowledge limitations and recommend escalation.' : ''}

Respond with a JSON object:
{
  "answer": "your detailed answer here",
  "followUps": ["follow up question 1", "follow up question 2", "follow up question 3"],
  "escalationMessage": "reason for escalation if needed or null"
}`;
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              aiContent = parsed.answer || text;
              followUpSuggestions = parsed.followUps || [];
            } else {
              aiContent = text;
            }
            console.log('Response generated by Gemini fallback');
          } catch (geminiError) {
            console.error('Gemini fallback error:', geminiError.message);
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
        } else {
          console.log('Response NOT generated by Groq API (fallback to FAQ used due to error)');
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
      }
    } else if (ai && faqContext) {
      // If Groq is not configured but Gemini is, use Gemini
      try {
        const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });
        const prompt = `${buildSystemPrompt(explainMode)}

FAQ CONTEXT (use ONLY this to answer):
${faqContext}

Student question/description: "${question || 'Please see the attached image.'}"

${escalationRequired ? 'NOTE: Confidence is low. Acknowledge limitations and recommend escalation.' : ''}

Respond with a JSON object:
{
  "answer": "your detailed answer here",
  "followUps": ["follow up question 1", "follow up question 2", "follow up question 3"],
  "escalationMessage": "reason for escalation if needed or null"
}`;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiContent = parsed.answer || text;
          followUpSuggestions = parsed.followUps || [];
        } else {
          aiContent = text;
        }
        console.log('Response generated by Gemini (Groq not configured)');
      } catch (geminiError) {
        console.error('Gemini error:', geminiError.message);
        if (scoredFAQs.length > 0) {
          aiContent = `📌 Based on FAQ ${scoredFAQs[0].faq.sectionId ? `§${scoredFAQs[0].faq.sectionId}` : `(${scoredFAQs[0].faq.category})`}:\n\n${scoredFAQs[0].faq.answer}`;
          followUpSuggestions = [ 'Need more details?', 'Ask another question', 'Escalate to mentor' ];
        } else {
          aiContent = '❌ No relevant FAQs found for your question.';
        }
      }
    } else {
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
  const groqApiKey = getGroqApiKey();
  if (!groqApiKey) return rawQuestion;
  try {
    const result = await generateGroqContent(`You are helping an intern improve their question for an internship support platform.
      
Raw question: "${rawQuestion}"

Improve this question to be:
1. Clear and specific
2. Use proper internship terminology (NOC, ViBe, Rosetta, SP points, etc.)
3. More searchable

Return ONLY the improved question, nothing else. If the question is already good, return it as-is.`
    );
    return result.trim();
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
