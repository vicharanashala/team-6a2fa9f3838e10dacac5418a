import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Check, Clock, User, ChevronDown, ChevronUp,
         MessageSquare, ArrowRight, Users, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import toast from 'react-hot-toast'

function EscalationRow({ query, onResolve, onAssign }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [mentors, setMentors] = useState([])

  const statusColors = {
    escalated: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    open: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    answered: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  }

  const handleAssign = async (mentorId) => {
    setAssigning(true)
    try {
      await api.patch(`/queries/admin/escalated/${query._id}/assign`, { mentorId })
      toast.success('Mentor assigned')
      onAssign()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to assign mentor')
    } finally { setAssigning(false) }
  }

  const loadMentors = async () => {
    if (mentors.length > 0) return
    try {
      const res = await api.get('/users/', { params: { role: 'mentor', limit: '50' } })
      setMentors(Array.isArray(res.data) ? res.data : (res.data.users || []))
    } catch (e) {}
  }

  return (
    <>
      <tr className="border-b border-dark-500/30 hover:bg-dark-600/30 transition-colors">
        <td className="px-4 py-3">
          <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-3 text-left w-full">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="badge-category">{query.category}</span>
                <span className={`text-xs border px-2.5 py-1 rounded-full capitalize ${statusColors[query.status]}`}>
                  {query.status}
                </span>
                {query.isEscalated && (
                  <span className="flex items-center gap-1 text-xs text-rose-400">
                    <AlertTriangle size={11} /> Escalated
                  </span>
                )}
              </div>
              <p className="text-sm dark:text-slate-200 text-slate-700 line-clamp-1">{query.title}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-[8px] font-bold">
                    {query.author?.name?.charAt(0).toUpperCase()}
                  </div>
                  {query.author?.name}
                </span>
                <span>·</span>
                <span>{query.views || 0} views</span>
                <span>·</span>
                <span>{query.answers?.length || 0} answers</span>
                {query.escalatedAt && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-rose-500">
                      <Clock size={10} /> Escalated {new Date(query.escalatedAt).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            </div>
            {expanded ? <ChevronUp size={14} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {query.status === 'escalated' && (
              <button onClick={() => onResolve(query._id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                title="Mark Resolved">
                <Check size={14} />
              </button>
            )}
            <button onClick={() => navigate(`/discussions/${query._id}`)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
              title="View Discussion">
              <ArrowRight size={14} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={2} className="bg-dark-700/50 dark:bg-dark-700/50 px-4 py-4 bg-slate-100/50">
            <div className="ml-4 border-l-2 border-rose-500/30 pl-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1.5 font-medium">Query Content</p>
                <p className="text-sm dark:text-slate-300 text-slate-700">{query.content}</p>
              </div>
              {query.aiAnswer && (
                <div className="bg-dark-700/50 dark:bg-dark-700/50 rounded-xl p-3 bg-slate-100/50">
                  <p className="text-xs text-slate-500 mb-1.5 font-medium">AI Answer</p>
                  <p className="text-sm dark:text-slate-300 text-slate-700 line-clamp-3">{query.aiAnswer.content}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs text-slate-600">Confidence: {query.aiAnswer.confidence || 'N/A'}</span>
                    {query.aiAnswer.confidenceScore && (
                      <span className="text-xs text-slate-600">Score: {query.aiAnswer.confidenceScore}</span>
                    )}
                  </div>
                </div>
              )}
              {query.answers?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-1.5 font-medium">{query.answers.length} Answer(s)</p>
                  {query.answers.slice(0, 2).map((a, i) => (
                    <div key={i} className="bg-dark-700 dark:bg-dark-700 rounded-xl p-3 mb-2 bg-slate-200">
                      <p className="text-sm dark:text-slate-300 text-slate-700 line-clamp-2">{a.content}</p>
                      <p className="text-xs text-slate-600 mt-1.5">
                        — {a.author?.name || 'Unknown'} ({a.authorType})
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {/* Assign mentor */}
              <div>
                <p className="text-xs text-slate-500 mb-2 font-medium">Assign Mentor</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={loadMentors}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-all filter-btn">
                    Load Mentors
                  </button>
                  {mentors.map(m => (
                    <button key={m._id} onClick={() => handleAssign(m._id)}
                      disabled={assigning}
                      className="text-xs px-3 py-1.5 rounded-lg border border-violet-500/20 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 transition-all disabled:opacity-50">
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function AdminEscalations() {
  const navigate = useNavigate()
  const [escalated, setEscalated] = useState([])
  const [allQueries, setAllQueries] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('escalated') // 'escalated' | 'all'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 15

  useEffect(() => { fetchData() }, [filter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [escRes, statsRes] = await Promise.all([
        filter === 'escalated'
          ? api.get('/queries/admin/escalated').catch(() => ({ data: [] }))
          : api.get('/queries/admin/all', { params: { page: String(page), limit: String(limit) } }).catch(() => ({ data: { queries: [] } })),
        api.get('/queries/admin/escalation-stats').catch(() => ({ data: {} })),
      ])
      setEscalated(filter === 'escalated'
        ? (Array.isArray(escRes.data) ? escRes.data : escRes.data.queries || [])
        : (escRes.data.queries || []))
      setStats(statsRes.data)
    } catch (e) {}
    setLoading(false)
  }

  const handleResolve = async (queryId) => {
    if (!window.confirm('Mark this query as resolved?')) return
    try {
      await api.patch(`/queries/admin/escalated/${queryId}/resolve`)
      toast.success('Query resolved')
      fetchData()
    } catch (e) { toast.error('Failed to resolve') }
  }

  const handleAssign = () => { fetchData() }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-orange-600 flex items-center justify-center">
            <AlertTriangle size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold dark:text-white text-slate-900">Query Moderation & Escalations</h1>
            <p className="text-sm text-slate-500">Manage escalated queries and query moderation</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {stats && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Escalated', value: stats.totalEscalated, color: 'rose' },
            { label: 'Resolved Today', value: stats.resolvedToday, color: 'emerald' },
            { label: 'Avg Resolution', value: stats.avgResolutionHours ? `${stats.avgResolutionHours}h` : 'N/A', color: 'amber' },
            { label: 'Open Now', value: stats.openNow, color: 'blue' },
          ].map(s => (
            <div key={s.label} className="card-dark p-4 text-center">
              <p className="text-2xl font-bold dark:text-white text-slate-900">{s.value ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          <button onClick={() => setFilter('escalated')}
            className={`text-sm px-4 py-2 rounded-xl border transition-all ${filter === 'escalated' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' : 'filter-btn'}`}>
            <AlertTriangle size={13} className="inline mr-1.5" />Escalated Only
          </button>
          <button onClick={() => setFilter('all')}
            className={`text-sm px-4 py-2 rounded-xl border transition-all ${filter === 'all' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'filter-btn'}`}>
            <MessageSquare size={13} className="inline mr-1.5" />All Queries
          </button>
        </div>
        <button onClick={fetchData} className="btn-secondary text-sm py-2">Refresh</button>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-500/50 bg-dark-700/50 dark:bg-dark-700/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Query</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-dark-500/30">
                    <td className="px-4 py-3"><div className="h-12 skeleton-dark-700 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-8 skeleton-dark-700 rounded" /></td>
                  </tr>
                ))
              ) : escalated.length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-16 text-center text-slate-500">
                  {filter === 'escalated' ? 'No escalated queries! 🎉' : 'No queries found'}
                </td></tr>
              ) : (
                escalated.map(q => (
                  <EscalationRow key={q._id} query={q}
                    onResolve={handleResolve}
                    onAssign={handleAssign}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}