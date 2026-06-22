import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessagesSquare, Search, Filter, Plus, Eye, MessageSquare, TrendingUp,
         Clock, CheckCircle, AlertTriangle, Bookmark, ChevronDown } from 'lucide-react'
import api from '../utils/api'
import { useAuthStore } from '../store'

const CATEGORIES = ['All', 'NOC', 'Offer Letter', 'ViBe', 'Rosetta', 'Team Formation', 'Coursework', 'Mentor Support', 'AI/Yaksha', 'Certificate', 'Timing', 'General']
const STATUSES = ['All', 'open', 'answered', 'resolved', 'escalated']
const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Viewed' },
  { value: 'unanswered', label: 'Unanswered' },
]

function StatusBadge({ status }) {
  const cfg = {
    open: { label: 'Open', class: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
    answered: { label: 'Answered', class: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    resolved: { label: 'Resolved', class: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
    escalated: { label: 'Escalated', class: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  }
  const c = cfg[status] || cfg.open
  return <span className={`text-xs border px-2.5 py-0.5 rounded-full font-medium ${c.class}`}>{c.label}</span>
}

function QueryCard({ query, onClick }) {
  const timeAgo = (date) => {
    const d = new Date(date)
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="card-dark card-hover p-5 cursor-pointer group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="badge-category">{query.category}</span>
            <StatusBadge status={query.status} />
            {query.isEscalated && (
              <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle size={10} /> Escalated
              </span>
            )}
            {query.tags?.slice(0, 2).map(t => (
              <span key={t} className="text-xs text-slate-600 bg-dark-600 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
          <h3 className="font-medium text-slate-200 group-hover:text-white transition-colors line-clamp-2 mb-2">
            {query.refinedTitle || query.title}
          </h3>
          <p className="text-sm text-slate-500 line-clamp-2">{query.content?.substring(0, 120)}...</p>
        </div>
        {query.aiAnswer?.confidence && (
          <div className="flex-shrink-0">
            <div className={`text-xs px-2 py-1 rounded-lg border font-medium ${
              query.aiAnswer.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              query.aiAnswer.confidence === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              AI: {query.aiAnswer.confidence}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-[9px] font-bold">
            {query.author?.name?.charAt(0).toUpperCase()}
          </div>
          {query.author?.name}
        </span>
        <span className="flex items-center gap-1"><Eye size={11} /> {query.views}</span>
        <span className="flex items-center gap-1"><MessageSquare size={11} /> {query.answers?.length || 0}</span>
        <span className="flex items-center gap-1"><Bookmark size={11} /> {query.bookmarks || 0}</span>
        <span className="flex items-center gap-1 ml-auto"><Clock size={11} /> {timeAgo(query.createdAt)}</span>
      </div>
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div className="card-dark p-5 space-y-3 animate-pulse">
      <div className="flex gap-2">
        <div className="h-5 w-20 bg-dark-600 rounded-full" />
        <div className="h-5 w-16 bg-dark-600 rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-dark-600 rounded" />
      <div className="h-4 w-full bg-dark-600 rounded" />
      <div className="h-4 w-2/3 bg-dark-600 rounded" />
      <div className="flex gap-4">
        <div className="h-4 w-16 bg-dark-600 rounded" />
        <div className="h-4 w-12 bg-dark-600 rounded" />
      </div>
    </div>
  )
}

export default function Discussions() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('All')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    fetchQueries()
  }, [category, status, sort, page])

  const fetchQueries = async () => {
    setLoading(true)
    try {
      const params = { category, status, sort, page, limit: 15 }
      if (search) params.search = search
      const res = await api.get('/queries', { params })
      setQueries(res.data.queries)
      setTotal(res.data.total)
      setPages(res.data.pages)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchQueries()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center">
            <MessagesSquare size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Discussions</h1>
            <p className="text-sm text-slate-500">{total} questions · community Q&A</p>
          </div>
        </div>
        {token && (
          <button onClick={() => navigate('/raise-query')} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Raise Query
          </button>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search discussions..."
          className="input-dark pl-10 pr-24" />
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-1.5 px-3 text-sm">
          Search
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Category filter */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.slice(0, 6).map(c => (
            <button key={c} onClick={() => { setCategory(c); setPage(1) }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                category === c
                  ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                  : 'border-dark-500 text-slate-500 hover:text-slate-300 bg-dark-700 hover:border-dark-400'
              }`}>
              {c}
            </button>
          ))}
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}
            className="text-xs px-3 py-1.5 rounded-lg border border-dark-500 bg-dark-700 text-slate-400 focus:outline-none focus:border-blue-500/40">
            <option value="All">More categories...</option>
            {CATEGORIES.slice(6).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="ml-auto flex gap-2">
          {/* Sort */}
          {SORTS.map(s => (
            <button key={s.value} onClick={() => { setSort(s.value); setPage(1) }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                sort === s.value
                  ? 'bg-dark-600 border-dark-400 text-slate-200'
                  : 'border-dark-500 text-slate-500 bg-dark-700 hover:text-slate-300'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6">
        {STATUSES.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1) }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${
              status === s
                ? 'bg-dark-600 border-dark-400 text-slate-200'
                : 'border-dark-600 text-slate-600 hover:text-slate-400'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading
          ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : queries.length === 0
            ? (
              <div className="text-center py-20 card-dark">
                <MessagesSquare size={40} className="text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">No discussions found</p>
                <p className="text-slate-600 text-sm mt-1">Try adjusting your filters or be the first to ask!</p>
                <button onClick={() => navigate('/raise-query')} className="btn-primary mt-4 inline-flex items-center gap-2">
                  <Plus size={14} /> Raise a Query
                </button>
              </div>
            )
            : queries.map(q => (
              <QueryCard key={q._id} query={q} onClick={() => navigate(`/discussions/${q._id}`)} />
            ))
        }
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-secondary py-2 px-4 text-sm disabled:opacity-40">Prev</button>
          <span className="text-slate-500 text-sm">Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="btn-secondary py-2 px-4 text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}
