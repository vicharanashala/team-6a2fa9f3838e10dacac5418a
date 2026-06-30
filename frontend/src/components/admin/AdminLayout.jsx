import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store'
import {
  BarChart3, Users, Zap, BookOpen, AlertTriangle,
  Shield, ArrowLeft
} from 'lucide-react'
import { useEffect } from 'react'

const adminNavItems = [
  { to: '/admin', icon: BarChart3, label: 'Dashboard', desc: 'Overview & Stats', end: true },
  { to: '/admin/users', icon: Users, label: 'Users', desc: 'User Management' },
  { to: '/admin/announcements', icon: Zap, label: 'Announcements', desc: 'Post & Manage' },
  { to: '/admin/faqs', icon: BookOpen, label: 'FAQ Mgmt', desc: 'Knowledge Base' },
  { to: '/admin/escalations', icon: AlertTriangle, label: 'Escalations', desc: 'Query Moderation' },
]

export default function AdminLayout({ children }) {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/home')
    }
  }, [user, navigate])

  if (user && user.role !== 'admin') return null

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Admin Banner */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
        <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
          <Shield size={16} className="text-rose-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-rose-300">Admin Panel</p>
          <p className="text-xs text-rose-400/60">You have full administrative access</p>
        </div>
        <button onClick={() => navigate('/home')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors active:scale-95 px-3 py-1.5 rounded-lg hover:bg-dark-600">
          <ArrowLeft size={13} /> Back to App
        </button>
      </motion.div>

      {/* Admin Nav — sticky */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="flex gap-2 flex-wrap sticky top-2 z-10 bg-dark-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-dark-500/30"
        style={typeof document !== 'undefined' && document.body.classList.contains('dark') ? {} : { background: 'rgba(241,245,249,0.9)' }}>
        {adminNavItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm active:scale-95 ${
                isActive
                  ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-sm'
                  : 'border-dark-500/40 text-slate-400 hover:text-slate-200 hover:bg-dark-600/70 bg-dark-700/50'
              }`
            }>
            <Icon size={14} />
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </motion.div>

      {/* Content */}
      {children || <Outlet />}
    </div>
  )
}