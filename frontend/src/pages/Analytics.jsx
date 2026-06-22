import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, AlertTriangle, Brain, Target, Users, Zap, BookOpen } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts'
import api from '../utils/api'

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#06B6D4', '#EC4899', '#84CC16']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-dark-700 border border-dark-400 rounded-xl px-3 py-2.5 text-xs">
        <p className="text-slate-400 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
        ))}
      </div>
    )
  }
  return null
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue', delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="card-dark p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-${color}-500/15 border border-${color}-500/20 flex items-center justify-center`}>
          <Icon size={20} className={`text-${color}-400`} />
        </div>
      </div>
    </motion.div>
  )
}

export default function Analytics() {
  const [overview, setOverview] = useState(null)
  const [categoryData, setCategoryData] = useState([])
  const [trending, setTrending] = useState({ trending: [], topQuestions: [] })
  const [confidence, setConfidence] = useState([])
  const [dailyActivity, setDailyActivity] = useState([])
  const [gaps, setGaps] = useState({ gaps: [], unanswered: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [ov, cat, tr, conf, daily] = await Promise.all([
        api.get('/analytics/overview').catch(() => ({ data: {} })),
        api.get('/analytics/category-breakdown').catch(() => ({ data: [] })),
        api.get('/analytics/trending-confusions').catch(() => ({ data: { trending: [], topQuestions: [] } })),
        api.get('/analytics/confidence-distribution').catch(() => ({ data: [] })),
        api.get('/analytics/daily-activity').catch(() => ({ data: [] })),
      ])
      setOverview(ov.data)
      setCategoryData(cat.data.map(c => ({ name: c._id, count: c.count, open: c.open, escalated: c.escalated })))
      setTrending(tr.data)
      setConfidence(conf.data.map(c => ({ name: c._id, value: c.count })))
      setDailyActivity(daily.data)

      // Try gaps (mentor only)
      api.get('/analytics/faq-gaps').then(r => setGaps(r.data)).catch(() => {})
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array(4).fill(0).map((_, i) => <div key={i} className="card-dark h-28 animate-pulse" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {Array(4).fill(0).map((_, i) => <div key={i} className="card-dark h-64 animate-pulse" />)}
        </div>
      </div>
    )
  }

  const confColors = { high: '#10B981', medium: '#F59E0B', low: '#F43F5E' }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center">
          <BarChart3 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Confusion Analytics</h1>
          <p className="text-sm text-slate-500">Real-time insight into what's confusing 500+ interns</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Queries" value={overview?.totalQueries || 0} sub="All time" color="blue" delay={0} />
        <StatCard icon={AlertTriangle} label="Open Queries" value={overview?.openQueries || 0} sub="Awaiting answer" color="amber" delay={0.1} />
        <StatCard icon={BookOpen} label="FAQ Entries" value={overview?.totalFAQs || 0} sub="Knowledge base size" color="emerald" delay={0.2} />
        <StatCard icon={Target} label="Resolution Rate" value={`${overview?.resolutionRate || 0}%`} sub="Queries answered" color="violet" delay={0.3} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="card-dark p-5">
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-400" /> Confusion by Category
          </h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3B" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={50} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="open" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Open" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-slate-600 text-sm">No data yet</div>
          )}
        </motion.div>

        {/* AI Confidence Distribution */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="card-dark p-5">
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
            <Brain size={14} className="text-violet-400" /> AI Confidence Distribution
          </h3>
          {confidence.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={confidence} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                    {confidence.map((entry, i) => (
                      <Cell key={i} fill={confColors[entry.name] || COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4">
                {confidence.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: confColors[c.name] || COLORS[i] }} />
                    <span className="text-slate-400 capitalize">{c.name}</span>
                    <span className="text-slate-600">({c.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-60 flex items-center justify-center text-slate-600 text-sm">Ask AI questions to see confidence data</div>
          )}
        </motion.div>

        {/* Daily Activity */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="card-dark p-5 md:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
            <Zap size={14} className="text-amber-400" /> Daily Activity (Last 14 Days)
          </h3>
          {dailyActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyActivity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="queryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3B" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                <Area type="monotone" dataKey="queries" stroke="#3B82F6" fill="url(#queryGrad)" name="Queries" strokeWidth={2} />
                <Area type="monotone" dataKey="aiCalls" stroke="#8B5CF6" fill="url(#aiGrad)" name="AI Calls" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-600 text-sm">No activity data yet</div>
          )}
        </motion.div>
      </div>

      {/* Trending Topics */}
      {trending.trending.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="card-dark p-5">
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
            <TrendingUp size={14} className="text-rose-400" /> 🔥 Trending Confusions (Last 7 Days)
          </h3>
          <div className="space-y-3">
            {trending.trending.map((t, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-lg font-bold font-mono text-slate-700 w-6">#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300">{t._id}</span>
                    <span className="text-xs text-slate-500">{t.count} queries</span>
                  </div>
                  <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(t.count / (trending.trending[0]?.count || 1)) * 100}%` }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* FAQ Gaps */}
      {gaps.unanswered?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="card-dark p-5 border-amber-500/10">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" /> FAQ Gaps — Unanswered Queries
          </h3>
          <p className="text-xs text-slate-500 mb-4">These questions have no answers yet. Consider adding FAQ entries for these topics.</p>
          <div className="space-y-2">
            {gaps.unanswered.map((q, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl border border-dark-500/50">
                <span className="badge-category">{q.category}</span>
                <span className="text-sm text-slate-300 flex-1 truncate">{q.title}</span>
                <span className="text-xs text-slate-600 flex items-center gap-1 flex-shrink-0">
                  <Users size={11} /> {q.views} views
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
