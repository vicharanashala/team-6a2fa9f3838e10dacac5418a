import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, TrendingUp, Flame, ArrowRight, Sparkles, AlertCircle,
         BookOpen, Users, Shield, Zap, ChevronRight, MessageSquarePlus, Image as ImageIcon } from 'lucide-react'
import { useAuthStore } from '../store'
import api from '../utils/api'

const CATEGORIES = [
  { name: 'NOC', icon: '📄', color: 'blue', desc: 'Certificate workflows' },
  { name: 'ViBe', icon: '🎥', color: 'violet', desc: 'LMS platform issues' },
  { name: 'Rosetta', icon: '📓', color: 'amber', desc: 'Journal & reflection' },
  { name: 'Offer Letter', icon: '📬', color: 'emerald', desc: 'Selection & acceptance' },
  { name: 'Team Formation', icon: '👥', color: 'cyan', desc: 'Team & project assignment' },
  { name: 'Coursework', icon: '📚', color: 'rose', desc: 'Phase 1 coursework' },
  { name: 'AI/Yaksha', icon: '🤖', color: 'purple', desc: 'Support channels' },
  { name: 'Certificate', icon: '🏆', color: 'yellow', desc: 'Completion certificate' },
]

const MISCONCEPTIONS = [
  { text: 'Internship is NOT self-paced', detail: 'VINS requires 6–10 hours/day full attention. No leave permitted.' },
  { text: 'AI-generated Rosetta entries are prohibited', detail: 'All 65 journal entries must be in your own genuine voice.' },
  { text: 'Unofficial WhatsApp groups are not allowed', detail: 'Only official channels: Yaksha chat + moderated WhatsApp group.' },
  { text: 'NOC must be physically signed — digital signatures rejected', detail: 'Or use the email-forward path (§3.7) as equivalent.' },
  { text: 'Offer letter is on your dashboard, NOT just email', detail: 'Log in to samagama.in to download it.' },
]

function TypingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
    </span>
  )
}

export default function Home() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [insight, setInsight] = useState(null)
  const [trending, setTrending] = useState([])
  const [categoryStats, setCategoryStats] = useState([])
  const [loadingInsight, setLoadingInsight] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [insightRes, trendingRes, catRes] = await Promise.all([
        api.get('/ai/daily-insight').catch(() => ({ data: { insight: 'Most students today are exploring ViBe platform and NOC submission workflows.' } })),
        api.get('/queries/trending').catch(() => ({ data: [] })),
        api.get('/faq/categories').catch(() => ({ data: [] })),
      ])
      // Normalize: handle both array responses and object wrappers like { queries: [...] }
      setInsight(insightRes.data?.insight ? insightRes.data : { insight: insightRes.data })
      setTrending(Array.isArray(trendingRes.data) ? trendingRes.data : (trendingRes.data?.queries || []))
      setCategoryStats(Array.isArray(catRes.data) ? catRes.data : (catRes.data?.categories || []))
    } catch (e) {}
    setLoadingInsight(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) navigate(`/ask?q=${encodeURIComponent(search.trim())}`)
  }

  const getCatCount = (name) => categoryStats.find(c => c._id === name)?.count || 0

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="text-center pt-4 pb-2">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-6">
          <Sparkles size={14} />
          AI Intelligence Platform · Summership 2026
        </div>
        <h1 className="text-4xl md:text-5xl font-bold dark:text-white text-slate-900 mb-4 tracking-tight">
          Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto mb-8">
          Reducing repetitive confusion through contextual AI assistance.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
          <div className="relative">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder='Ask anything — "NOC deadline", "videos repeating", "offer letter format"...'
              className="input-dark pr-32 py-4 text-base rounded-2xl border-slate-300 focus:border-blue-500/60" />
            <button type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-2 px-4 text-sm flex items-center gap-1.5">
              Ask AI <Brain size={14} />
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2">Semantic search — try natural language, not just keywords</p>
        </form>

        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
          <button onClick={() => navigate('/ask')}
            className="flex items-center gap-2 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/20 text-blue-400 rounded-xl px-4 py-2 text-sm transition-all">
            <Brain size={15} /> Ask AI
          </button>
          <button onClick={() => navigate('/upload-photos')}
            className="flex items-center gap-2 bg-dark-700 hover:bg-dark-600 border border-dark-500 text-slate-300 rounded-xl px-4 py-2 text-sm transition-all">
            <ImageIcon size={15} /> Ask with Photo
          </button>
          <button onClick={() => navigate('/raise-query')}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all quick-action-btn-home">
            <MessageSquarePlus size={15} /> Raise Query
          </button>
          <button onClick={() => navigate('/discussions')}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all quick-action-btn-home">
            <Users size={15} /> Discussions
          </button>
          <button onClick={() => navigate('/faq')}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all quick-action-btn-home">
            <BookOpen size={15} /> Browse FAQ
          </button>
        </div>
      </motion.div>

      {/* Daily AI Insight */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="card-dark p-5 border-blue-500/20 bg-gradient-to-r from-blue-600/5 to-violet-600/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">AI Daily Insight</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              </div>
              {loadingInsight
                ? <div className="dark:text-slate-300 text-slate-600"><TypingDots /></div>
                : <p className="dark:text-slate-200 text-slate-700">{insight?.insight}</p>}
              {insight?.trendingCategories?.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {insight.trendingCategories.map(c => (
                    <span key={c} className="badge-category">{c}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Trending Confusions */}
      {trending.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} className="text-amber-400" />
            <h2 className="font-semibold dark:text-white">🔥 Trending Confusions Today</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {trending.map((q, i) => (
              <button key={q._id} onClick={() => navigate(`/discussions/${q._id}`)}
                className="card-dark card-hover p-4 text-left group">
                <div className="flex items-start gap-3">
                  <span className="text-lg font-bold font-mono text-slate-600 flex-shrink-0">
                    #{i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm dark:text-slate-200 text-slate-700 line-clamp-2 group-hover:dark:text-white transition-colors">{q.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="badge-category">{q.category}</span>
                      <span className="text-xs text-slate-600">{q.views} views</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.section>
      )}

      {/* Category Grid */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold dark:text-white flex items-center gap-2">
            <BookOpen size={16} className="text-slate-400" /> Knowledge Categories
          </h2>
          <button onClick={() => navigate('/faq')} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
            Browse all <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORIES.map((cat, i) => (
            <motion.button key={cat.name}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              onClick={() => navigate(`/faq?category=${cat.name}`)}
              className="card-dark card-hover p-4 text-left group">
              <div className="text-2xl mb-2">{cat.icon}</div>
              <div className="font-medium dark:text-slate-200 text-slate-700 text-sm group-hover:dark:text-white transition-colors">{cat.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{cat.desc}</div>
              <div className="text-xs text-slate-600 mt-2">{getCatCount(cat.name)} entries</div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* Commonly Misunderstood */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle size={16} className="text-amber-400" />
          <h2 className="font-semibold dark:text-white">Commonly Misunderstood</h2>
          <span className="text-xs text-amber-400/70 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">Read this first</span>
        </div>
        <div className="card-dark misconception-card border-amber-500/10 divide-dark-500/50">
          {MISCONCEPTIONS.map((m, i) => (
            <div key={i} className="p-4 flex items-start gap-3 dark:hover:bg-dark-600/30 hover:bg-slate-100/60 transition-colors">
              <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium dark:text-slate-200 text-slate-700">{m.text}</p>
                <p className="text-xs text-slate-500 mt-0.5">{m.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* CTA Cards */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="grid md:grid-cols-2 gap-4">
        <button onClick={() => navigate('/ask')}
          className="card-dark card-hover p-6 text-left group bg-gradient-to-br from-blue-600/8 to-violet-600/8 border-blue-500/15">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4">
            <Brain size={20} className="text-blue-400" />
          </div>
          <h3 className="font-semibold dark:text-white mb-2">Ask the AI Assistant</h3>
          <p className="text-sm dark:text-slate-400 text-slate-600 mb-4">Get instant, contextual answers grounded in the official FAQ. Confidence-rated responses with source citations.</p>
          <div className="flex items-center gap-1.5 text-blue-400 text-sm">Ask now <ArrowRight size={14} /></div>
        </button>
        <button onClick={() => navigate('/analytics')}
          className="card-dark card-hover p-6 text-left group bg-gradient-to-br from-emerald-600/8 to-cyan-600/8 border-emerald-500/15">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
            <TrendingUp size={20} className="text-emerald-400" />
          </div>
          <h3 className="font-semibold dark:text-white mb-2">Confusion Analytics</h3>
          <p className="text-sm dark:text-slate-400 text-slate-600 mb-4">See what topics are confusing 500+ interns. Real-time heatmaps, confidence trends, and FAQ gaps.</p>
          <div className="flex items-center gap-1.5 text-emerald-400 text-sm">View analytics <ArrowRight size={14} /></div>
        </button>
      </motion.div>
    </div>
  )
}
