import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Send, ChevronDown, ChevronUp, Sparkles, BookOpen, ArrowUpRight,
         ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle, Info, Zap, Copy, RotateCcw } from 'lucide-react'
import { useAuthStore } from '../store'
import api from '../utils/api'
import toast from 'react-hot-toast'

const EXPLAIN_MODES = [
  { value: 'beginner', label: '🟢 Beginner', desc: 'Simple, step-by-step' },
  { value: 'intermediate', label: '🔵 Intermediate', desc: 'Clear and concise' },
  { value: 'detailed', label: '🟣 Detailed', desc: 'Full context + edge cases' },
]

function ConfidenceBadge({ level, score }) {
  const cfg = {
    high: { class: 'badge-high', icon: CheckCircle, label: 'High Confidence' },
    medium: { class: 'badge-medium', icon: Info, label: 'Medium Confidence' },
    low: { class: 'badge-low', icon: AlertTriangle, label: 'Low Confidence' },
  }
  const c = cfg[level] || cfg.medium
  return (
    <div className={`inline-flex items-center gap-1.5 ${c.class}`}>
      <c.icon size={12} />
      {c.label} {score ? `(${score.toFixed(0)}%)` : ''}
    </div>
  )
}

function SourceCard({ section, category, question, similarity }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-dark-700 border border-dark-500/50 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-dark-600/50 transition-colors">
        <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
          <BookOpen size={13} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          {section && <span className="text-xs font-mono text-blue-400 mr-2">§{section}</span>}
          <span className="text-sm text-slate-300 truncate">{question?.substring(0, 60)}...</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">{similarity?.toFixed(0)}% match</span>
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-dark-500/50">
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-slate-300 mb-1">{question}</p>
              <span className="badge-category">{category}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TypingAnimation() {
  return (
    <div className="flex items-center gap-3 p-5">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0">
        <Brain size={16} className="text-white" />
      </div>
      <div className="bg-dark-700 rounded-2xl px-4 py-3 flex items-center gap-2">
        <span className="text-sm text-slate-400">AI is analyzing similar FAQs</span>
        <span className="flex gap-1">
          <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
        </span>
      </div>
    </div>
  )
}

export default function AskAI() {
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const [question, setQuestion] = useState(searchParams.get('q') || '')
  const [explainMode, setExplainMode] = useState(user?.preferences?.explainMode || 'intermediate')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [feedback, setFeedback] = useState({})
  const textRef = useRef(null)
  const resultRef = useRef(null)

  useEffect(() => {
    if (searchParams.get('q') && !result) {
      handleAsk()
    }
  }, [])

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result])

  const handleAsk = async (q = null) => {
    const query = (q || question).trim()
    if (!query || loading) {
      if (!query) toast.error('Please enter a question')
      return
    }
    
    if (query.length < 3) {
      toast.error('Question must be at least 3 characters')
      return
    }
    
    setLoading(true)
    setResult(null)
    try {
      console.log('📡 Asking AI:', { question: query, explainMode })
      const res = await api.post('/ai/ask', { question: query, explainMode })
      console.log('✅ AI Response:', res.data)
      setResult({ ...res.data, question: query })
      setHistory(h => [{ question: query, result: res.data }, ...h.slice(0, 9)])
    } catch (err) {
      console.error('❌ AI Error:', err.response?.data || err.message)
      const errorMsg = err.response?.data?.error || err.message || 'AI service unavailable. Please try again.'
      toast.error(errorMsg)
    }
    setLoading(false)
  }

  const handleFeedback = async (faqId, helpful) => {
    try {
      await api.post('/ai/feedback', { faqId, helpful })
      setFeedback(f => ({ ...f, [faqId]: helpful ? 'up' : 'down' }))
      toast.success(helpful ? 'Marked as helpful!' : 'Feedback recorded.')
    } catch (e) {}
  }

  const copyAnswer = () => {
    navigator.clipboard.writeText(result?.answer || '')
    toast.success('Copied to clipboard')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAsk()
  }

  const confidenceBarWidth = result ? `${Math.min(result.confidenceScore || 0, 100)}%` : '0%'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Brain size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Ask AI</h1>
          <p className="text-sm text-slate-500">RAG-powered · Grounded in internship FAQ · Zero hallucinations</p>
        </div>
      </div>

      {/* Input */}
      <div className="card-dark p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-slate-400">Explain mode:</span>
          <div className="flex gap-2">
            {EXPLAIN_MODES.map(m => (
              <button key={m.value} onClick={() => setExplainMode(m.value)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  explainMode === m.value
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                    : 'border-dark-500 text-slate-500 hover:text-slate-300 hover:border-dark-400'
                }`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea ref={textRef} value={question}
            onChange={e => setQuestion(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask about NOC, ViBe issues, Rosetta, team formation, offer letter... (Ctrl+Enter to send)"
            className="input-dark min-h-[100px] resize-none pr-14 text-base" rows={3} />
          <button onClick={() => handleAsk()} disabled={loading || !question.trim()}
            className="absolute bottom-3 right-3 w-9 h-9 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-all hover:shadow-lg hover:shadow-blue-500/25">
            <Send size={16} className="text-white" />
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2">Ctrl+Enter to ask · Your question is matched against 180+ FAQ entries before AI generates a response</p>
      </div>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="card-dark overflow-hidden">
            <TypingAnimation />
            <div className="px-5 pb-4">
              <div className="flex gap-2 text-xs text-slate-500">
                <span className="bg-dark-600 rounded px-2 py-1">Searching FAQs</span>
                <span className="bg-dark-600 rounded px-2 py-1">Calculating similarity</span>
                <span className="bg-dark-600 rounded px-2 py-1">Generating answer</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div ref={resultRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4">
            {/* Answer Card */}
            <div className="card-dark border-blue-500/15">
              {/* Header */}
              <div className="flex items-start justify-between p-5 pb-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                    <Zap size={14} className="text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">VINS AI</div>
                    <div className="text-xs text-slate-500">Grounded in FAQ knowledge base</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ConfidenceBadge level={result.confidence} score={result.confidenceScore} />
                  <button onClick={copyAnswer} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-dark-600 transition-colors">
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="px-5 pt-3">
                <div className="h-1 bg-dark-600 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: confidenceBarWidth }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="confidence-bar" />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-600">Confidence</span>
                  <span className="text-xs text-slate-500">{result.confidenceScore?.toFixed(0)}% · Based on {result.sourceDetails?.length || 0} FAQs</span>
                </div>
              </div>

              {/* Answer */}
              <div className="p-5">
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{result.answer}</p>
                </div>
              </div>

              {/* Escalation Warning */}
              {result.escalationRequired && (
                <div className="mx-5 mb-4 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-300 font-medium">Mentor Escalation Recommended</p>
                    <p className="text-xs text-amber-400/70 mt-0.5">This topic may require direct mentor clarification. Use #escalate in Yaksha chat.</p>
                  </div>
                </div>
              )}

              {/* Source Sections */}
              {result.sourceSections?.length > 0 && (
                <div className="px-5 pb-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-slate-500">Sources:</span>
                    {result.sourceSections.map((s, i) => (
                      <span key={i} className="text-xs font-mono bg-dark-600 text-blue-400 px-2 py-0.5 rounded border border-dark-500">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback */}
              <div className="px-5 pb-5 flex items-center gap-3 border-t border-dark-500/50 pt-4">
                <span className="text-xs text-slate-500">Was this helpful?</span>
                {result.sourceDetails?.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <button onClick={() => handleFeedback(s.id, true)}
                      className={`p-1.5 rounded-lg transition-colors ${feedback[s.id] === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'}`}>
                      <ThumbsUp size={13} />
                    </button>
                    <button onClick={() => handleFeedback(s.id, false)}
                      className={`p-1.5 rounded-lg transition-colors ${feedback[s.id] === 'down' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'}`}>
                      <ThumbsDown size={13} />
                    </button>
                  </div>
                ))}
                <button onClick={() => { setQuestion(result.question); setResult(null) }}
                  className="ml-auto text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                  <RotateCcw size={11} /> Re-ask
                </button>
              </div>
            </div>

            {/* Source FAQs */}
            {result.sourceDetails?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <BookOpen size={14} /> Retrieved FAQ sources ({result.sourceDetails.length})
                </h3>
                <div className="space-y-2">
                  {result.sourceDetails.map((s, i) => (
                    <SourceCard key={i} section={s.sectionId} category={s.category}
                      question={s.question} similarity={s.similarity} />
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up suggestions */}
            {result.followUpSuggestions?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <Sparkles size={14} /> You might also want to know
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.followUpSuggestions.map((q, i) => (
                    <button key={i} onClick={() => { setQuestion(q); handleAsk(q) }}
                      className="text-sm bg-dark-700 hover:bg-dark-600 border border-dark-500/50 hover:border-blue-500/30 text-slate-300 hover:text-white px-3 py-2 rounded-xl transition-all flex items-center gap-1.5">
                      {q.length > 60 ? q.substring(0, 60) + '...' : q}
                      <ArrowUpRight size={12} className="text-blue-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 1 && (
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-3">Recent searches</h3>
          <div className="flex flex-wrap gap-2">
            {history.slice(1, 6).map((h, i) => (
              <button key={i} onClick={() => { setQuestion(h.question); handleAsk(h.question) }}
                className="text-xs bg-dark-700 border border-dark-500/50 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                {h.question.length > 40 ? h.question.substring(0, 40) + '...' : h.question}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
