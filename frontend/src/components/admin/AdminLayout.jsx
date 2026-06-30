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
        className="flex items-center gap-3 p-4 rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-500/8 to-violet-500/8 dark:from-rose-500/10 dark:to-violet-500/10 backdrop-blur-sm">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-violet-500/20 border border-rose-500/20 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/10">
          <Shield size={18} className="text-rose-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold dark:text-rose-300 text-rose-600">Admin Panel</p>
          <p className="text-xs dark:text-rose-400/60 text-rose-400/70">You have full administrative access</p>
        </div>
        <motion.button whileHover={{ x: -3 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/home')}
          className="flex items-center gap-1.5 text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:text-slate-900 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg dark:bg-slate-700/60 bg-slate-100/80 border dark:border-dark-500/50 border-slate-200/80 hover:dark:bg-slate-100 hover:bg-slate-200/80">
          <ArrowLeft size={13} /> Back to App
        </motion.button>
      </motion.div>

      {/* Admin Nav — sticky */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="flex gap-2 flex-wrap sticky top-2 z-10 backdrop-blur-md p-1.5 rounded-2xl admin-topbar dark:border-dark-500/30 border-slate-200/60">
        {adminNavItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm active:scale-95 ${
                isActive
                  ? 'admin-sidebar-link-active'
                  : 'admin-sidebar-link'
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