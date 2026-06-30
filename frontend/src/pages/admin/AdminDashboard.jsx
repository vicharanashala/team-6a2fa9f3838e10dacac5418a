import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Users, MessageSquare, AlertTriangle, BookOpen, TrendingUp,
         Clock, CheckCircle, XCircle, ArrowUp, ArrowDown, Zap } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#06B6D4']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="card-dark px-3 py-2.5 text-xs shadow-xl">
        <p className="text-slate-400 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
        ))}
      </div>
    )
  }
  return null
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue', delay = 0, trend }) {
  const colorMap = {
    blue: 'bg-blue-500/15 border-blue-500/20 text-blue-400',
    violet: 'bg-violet-500/15 border-violet-500/20 text-violet-400',
    emerald: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/15 border-amber-500/20 text-amber-400',
    rose: 'bg-rose-500/15 border-rose-500/20 text-rose-400',
    cyan: 'bg-cyan-500/15 border-cyan-500/20 text-cyan-400',
  }
  const accentMap = {
    blue: 'border-l-blue-500',
    violet: 'border-l-violet-500',
    emerald: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    rose: 'border-l-rose-500',
    cyan: 'border-l-cyan-500',
  }
  const c = colorMap[color] || colorMap.blue
  const accent = accentMap[color] || accentMap.blue

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`card-dark admin-stat-card border-l-2 ${accent} p-5 cursor-default card-hover`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold dark:text-white text-slate-900">{value}</p>
          {sub && <p className="text-xs dark:text-slate-500 text-slate-600 mt-1">{sub}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-0.5 mt-1.5 text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
              {Math.abs(trend)}% vs last week
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${c}`}>
          <Icon size={18} />
        </div>
      </div>
    </motion.div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="card-dark border-l-2 border-l-slate-600 p-5 h-28">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-3 w-20 skeleton rounded mb-3" />
          <div className="h-7 w-16 skeleton rounded mb-2" />
          <div className="h-3 w-28 skeleton rounded" />
        </div>
        <div className="w-10 h-10 skeleton rounded-xl" />
      </div>
    </div>
  )
}

function ChartSkeleton({ height = 220 }) {
  return (
    <div className="card-dark p-5">
      <div className="h-4 w-40 skeleton rounded mb-5" />
      <div className="bg-dark-700 rounded-xl flex items-center justify-center" style={{ height }}>
        <div className="flex items-end gap-1.5 h-16 px-4">
          {[6, 9, 7, 10, 8, 12, 11].map((h, i) => (
            <div key={i} className="w-4 skeleton rounded-t" style={{ height: `${h * 4}px`, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [userStats, setUserStats] = useState(null)
  const [dailyActivity, setDailyActivity] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [statusDist, setStatusDist] = useState([])
  const [loading, setLoading] = useState(true)

  const isAdmin = true

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [ov, users, daily, cats, status] = await Promise.all([
        api.get('/admin/analytics/overview').catch(() => ({ data: {} })),
        api.get('/admin/analytics/users').catch(() => ({ data: {} })),
        api.get('/analytics/daily-activity').catch(() => ({ data: [] })),
        api.get('/analytics/category-breakdown').catch(() => ({ data: [] })),
        api.get('/admin/analytics/queries').catch(() => ({ data: {} })),
      ])
      setOverview(ov.data)
      setUserStats(users.data)
      setDailyActivity(daily.data || [])
      setCategoryData(cats.data.map(c => ({ name: c._id, count: c.count, open: c.open })))
      setStatusDist(status.data.statusDistribution || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="mb-2">
          <div className="h-8 w-64 skeleton rounded mb-2" />
          <div className="h-4 w-96 skeleton rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton height={180} />
        </div>
        <ChartSkeleton height={240} />
      </div>
    )
  }

  const statusColors = { open: '#F59E0B', answered: '#10B981', escalated: '#F43F5E', closed: '#6B7280' }
  const statusPie = statusDist.map(s => ({
    name: s._id || 'unknown',
    value: s.count,
    color: statusColors[s._id] || '#6B7280'
  })).filter(s => s.value > 0)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold dark:text-white text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">Platform overview and management</p>
          </div>
        </div>
        <div className="flex gap-3 mt-4 flex-wrap">
          <button onClick={() => navigate('/admin/users')} className="btn-secondary text-sm flex items-center gap-1.5 active:scale-95 transition-transform">
            <Users size={14} /> Manage Users
          </button>
          <button onClick={() => navigate('/admin/announcements')} className="btn-secondary text-sm flex items-center gap-1.5 active:scale-95 transition-transform">
            <Zap size={14} /> Announcements
          </button>
          <button onClick={() => navigate('/admin/faqs')} className="btn-secondary text-sm flex items-center gap-1.5 active:scale-95 transition-transform">
            <BookOpen size={14} /> FAQ Management
          </button>
          <button onClick={() => navigate('/admin/escalations')} className="btn-secondary text-sm flex items-center gap-1.5 active:scale-95 transition-transform">
            <AlertTriangle size={14} /> Escalations
          </button>
        </div>
      </motion.div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={overview?.totalUsers || 0} sub={`${userStats?.activeUsers || 0} active this week`} color="blue" delay={0} />
        <StatCard icon={MessageSquare} label="Total Queries" value={overview?.totalQueries || 0} sub={`${overview?.openQueries || 0} open`} color="violet" delay={0.05} />
        <StatCard icon={AlertTriangle} label="Escalated" value={overview?.escalatedQueries || 0} sub="Require attention" color="rose" delay={0.1} />
        <StatCard icon={BookOpen} label="FAQs" value={overview?.totalFAQs || 0} sub="Knowledge base entries" color="emerald" delay={0.15} />
        <StatCard icon={CheckCircle} label="Answered" value={overview?.answeredQueries || 0} sub={`${overview?.resolutionRate || 0}% resolution`} color="cyan" delay={0.2} />
        <StatCard icon={TrendingUp} label="This Week" value={overview?.queriesThisWeek || 0} sub="New queries" color="amber" delay={0.25} />
        <StatCard icon={Clock} label="Avg Resolution" value={overview?.avgResolutionHours ? `${overview.avgResolutionHours}h` : 'N/A'} sub="Time to answer" color="violet" delay={0.3} />
        <StatCard icon={Users} label="Mentors" value={overview?.totalMentors || 0} sub={`${overview?.totalAdmins || 0} admins`} color="emerald" delay={0.35} />
      </div>

      {/* User Breakdown */}
      {userStats && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="card-dark p-5">
          <h3 className="text-sm font-semibold dark:text-white text-slate-900 mb-5 flex items-center gap-2">
            <Users size={14} className="text-blue-400" /> User Distribution
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Students', value: userStats.roleBreakdown?.student || 0, color: '#3B82F6' },
              { label: 'Mentors', value: userStats.roleBreakdown?.mentor || 0, color: '#8B5CF6' },
              { label: 'Admins', value: userStats.roleBreakdown?.admin || 0, color: '#10B981' },
              { label: 'Active (7d)', value: userStats.activeUsers || 0, color: '#F59E0B' },
            ].map(item => (
              <div key={item.label} className="text-center p-4 bg-dark-700/60 rounded-xl">
                <div className="text-2xl font-bold dark:text-white text-slate-900 mb-1">{item.value}</div>
                <div className="w-full h-1.5 bg-dark-500 rounded-full mt-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${userStats.totalUsers ? (item.value / userStats.totalUsers * 100) : 0}%`, background: item.color }} />
                </div>
                <div className="text-xs text-slate-500 mt-1.5">{item.label}</div>
              </div>
            ))}
          </div>
          {userStats.topAnswerers?.length > 0 && (
            <div className="mt-5 pt-5 border-t border-dark-500/50">
              <p className="text-xs text-slate-500 mb-3">Top Contributors</p>
              <div className="space-y-2">
                {userStats.topAnswerers.slice(0, 5).map((u, i) => (
                  <motion.div key={u._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-600/50 transition-colors">
                    <span className="text-xs font-mono text-slate-600 w-4">#{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm dark:text-slate-200 text-slate-700 truncate">{u.name}</p>
                      <p className="text-xs text-slate-600">{u.stats?.answersGiven || 0} answers</p>
                    </div>
                    <span className="badge-category">{u.role}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Activity */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="card-dark p-5">
          <h3 className="text-sm font-semibold dark:text-white text-slate-900 mb-5 flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-400" /> Daily Activity (14 Days)
          </h3>
          {dailyActivity.length > 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyActivity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3B" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                  <Area type="monotone" dataKey="queries" stroke="#3B82F6" fill="url(#qGrad)" name="Queries" strokeWidth={2} />
                  <Area type="monotone" dataKey="aiCalls" stroke="#8B5CF6" fill="url(#aiGrad)" name="AI Calls" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <div className="h-52 flex items-center justify-center flex-col gap-2 text-slate-600 text-sm">
              <TrendingUp size={24} className="opacity-40" />
              <span>No activity data yet</span>
            </div>
          )}
        </motion.div>

        {/* Query Status Distribution */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="card-dark p-5">
          <h3 className="text-sm font-semibold dark:text-white text-slate-900 mb-5 flex items-center gap-2">
            <MessageSquare size={14} className="text-violet-400" /> Query Status Distribution
          </h3>
          {statusPie.length > 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 flex-wrap">
                {statusPie.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="dark:text-slate-400 text-slate-600 capitalize">{s.name}</span>
                    <span className="text-slate-600">({s.value})</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="h-52 flex items-center justify-center flex-col gap-2 text-slate-600 text-sm">
              <MessageSquare size={24} className="opacity-40" />
              <span>No query data yet</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="card-dark p-5">
          <h3 className="text-sm font-semibold dark:text-white text-slate-900 mb-5 flex items-center gap-2">
            <BookOpen size={14} className="text-amber-400" /> Queries by Category
          </h3>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3B" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="open" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Open" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}