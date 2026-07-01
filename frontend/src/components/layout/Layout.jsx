import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore, useThemeStore, useUIStore } from '../../store'
import {
  Brain, Home, MessageSquarePlus, MessagesSquare, BarChart3,
  Bell, User, Settings, BookOpen, LogOut, Menu, Sun, Moon,
  ChevronRight, Zap, Shield, ExternalLink, Image as ImageIcon, Star
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import api from '../../utils/api'

const bottomItems = [
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const baseNavItems = [
    { to: '/home', icon: Home, label: 'Home', desc: 'AI Intelligence Hub' },
    { to: '/ask', icon: Brain, label: 'Ask AI', desc: 'RAG-powered answers' },
    { to: '/upload-photos', icon: ImageIcon, label: 'Upload Photos', desc: 'Ask with screenshots' },
    { to: '/raise-query', icon: MessageSquarePlus, label: 'Raise Query', desc: 'Post a question' },
    { to: '/discussions', icon: MessagesSquare, label: 'Discussions', desc: 'Community Q&A' },
    { to: '/faq', icon: BookOpen, label: 'FAQ Browser', desc: 'Browse knowledge base' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics', desc: 'Confusion insights' },
    { to: '/announcements', icon: Bell, label: 'Announcements', desc: 'Important notices' },
  ]

  const mentorNavItems = [
    { to: '/answer-queue', icon: Star, label: 'Answer Queue', desc: 'Answer student questions' },
  ]

  const navItems = user?.role === 'mentor' || user?.role === 'admin'
    ? [...baseNavItems, ...mentorNavItems]
    : baseNavItems

  const handleLogout = () => { logout(); navigate('/login') }

  // --- Notification state ---
  const [notifOpen, setNotifOpen] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [localReadIds, setLocalReadIds] = useState(new Set())
  const notifRef = useRef(null)

  // Toggle and mark visible notifications as read
  const handleNotifToggle = () => {
    setNotifOpen(o => {
      if (!o) {
        // Opening: mark all fetched announcements as read locally
        const allIds = announcements.map(a => a._id)
        if (allIds.length > 0) {
          setLocalReadIds(prev => new Set([...prev, ...allIds]))
        }
      }
      return !o
    })
  }

  const isAnnRead = (ann) => ann.isRead || localReadIds.has(ann._id)

  // Mark a single announcement as read
  const onReadAnnouncement = (id) => {
    setLocalReadIds(prev => new Set([...prev, id]))
  }

  // --- Notification item renderer ---
  const priorityIcon = { urgent: '🔴', important: '🟡', general: '🔵' }
  function NotifItem({ ann, isRead, onRead, onClose, navigate }) {
    const icon = priorityIcon[ann.priority] || '🔵'
    const preview = ann.content?.length > 80 ? ann.content.slice(0, 80) + '…' : ann.content
    return (
      <button onClick={() => { onRead(ann._id); onClose(); navigate('/announcements') }}
        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-dark-600/40 dark:hover:bg-slate-100/60 transition-colors text-left border-b dark:border-dark-500/30 border-slate-200/40 last:border-0 ${!isRead ? 'bg-blue-500/[0.03] dark:bg-blue-500/[0.04]' : ''}`}>
        <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold dark:text-slate-200 text-slate-900 truncate">{ann.title}</span>
            {!isAnnRead(ann) && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">{preview}</p>
          <p className="text-[10px] dark:text-slate-600 text-slate-400 mt-1">
            {new Date(ann.createdAt).toLocaleDateString()}
            {ann.deadline && ` · Due ${new Date(ann.deadline).toLocaleDateString()}`}
          </p>
        </div>
      </button>
    )
  }

  useEffect(() => {
    if (notifOpen) {
      setNotifLoading(true)
      api.get('/announcements').then(r => {
        setAnnouncements(Array.isArray(r.data) ? r.data : r.data?.announcements || [])
      }).catch(() => {}).finally(() => setNotifLoading(false))
    }
  }, [notifOpen])

  // Close on outside click + Escape key
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (e.key === 'Escape') setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', handler)
    }
  }, [])

  const pinnedAnnouncements = announcements.filter(a => a.isPinned)
  const latestAnnouncements = announcements.filter(a => !a.isPinned).slice(0, 5)
  const unreadCount = announcements.filter(a => !isAnnRead(a)).length
  const badgeLabel = unreadCount === 0 ? null : unreadCount > 9 ? '9+' : String(unreadCount)

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b dark:border-dark-500/50 border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={18} className="text-white" />
          </div>
          {(sidebarOpen || mobile) && (
            <div>
              <div className="font-bold dark:text-white text-slate-900 text-lg leading-tight tracking-tight">VINS</div>
              <div className="text-[10px] dark:text-slate-500 text-slate-400 font-mono uppercase tracking-widest">AI Intelligence</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, desc }) => (
          <NavLink key={to} to={to} onClick={() => mobile && setMobileOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'dark:bg-blue-600/15 bg-blue-50 dark:text-blue-400 text-blue-600 border dark:border-blue-500/20 border-blue-200'
                  : 'dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-dark-600 hover:bg-slate-100'
              }`
            }>
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-blue-400' : 'dark:text-slate-500 text-slate-400 group-hover:dark:text-slate-300 group-hover:text-slate-600'} />
                {(sidebarOpen || mobile) && (
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{label}</div>
                    {isActive && <div className="text-[10px] dark:text-slate-500 text-slate-400 truncate">{desc}</div>}
                  </div>
                )}
                {isActive && (sidebarOpen || mobile) && <ChevronRight size={14} className="text-blue-400/60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t dark:border-dark-500/50 border-slate-200/60 space-y-1">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => mobile && setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive ? 'dark:bg-dark-600 dark:text-slate-200 bg-slate-100 text-slate-900' : 'dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-dark-600 hover:bg-slate-100'
              }`
            }>
            <Icon size={18} />
            {(sidebarOpen || mobile) && <span className="text-sm">{label}</span>}
          </NavLink>
        ))}
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl dark:text-slate-400 text-slate-500 dark:hover:text-rose-400 hover:text-rose-600 dark:hover:bg-rose-500/10 hover:bg-rose-50 transition-all duration-200">
          <LogOut size={18} />
          {(sidebarOpen || mobile) && <span className="text-sm">Logout</span>}
        </button>

        {/* User card */}
        {(sidebarOpen || mobile) && user && (
          <div className="mt-3 p-3 dark:bg-dark-700 bg-white rounded-xl border dark:border-dark-500/50 border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium dark:text-slate-200 text-slate-900 truncate">{user.name}</div>
                <div className="text-[10px] dark:text-slate-500 text-slate-400 flex items-center gap-1">
                  {user.role === 'mentor' && <Shield size={8} />}
                  {user.role}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 240 : 72 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col dark:bg-dark-800 bg-white/90 border-r dark:border-dark-500/50 border-slate-200/80 flex-shrink-0 overflow-hidden dark:shadow-none shadow-sm"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 dark:bg-dark-800 bg-white/90 border-r dark:border-dark-500/50 border-slate-200/80 z-50 lg:hidden overflow-y-auto shadow-xl">
              <SidebarContent mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="relative z-40 dark:bg-dark-800/80 bg-white/80 backdrop-blur-md border-b dark:border-dark-500/50 border-slate-200/50 px-4 py-3 flex items-center gap-2 flex-shrink-0 shadow-sm">

          {/* Mobile menu toggle */}
          <button onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-dark-600 hover:bg-slate-100 transition-colors lg:hidden">
            <Menu size={18} />
          </button>

          <div className="flex-1" />

          <button onClick={() => navigate('/announcements')}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-600 transition-colors relative"
            title="Announcements">
            <Bell size={18} />
            {/* Optional dot indicator for unread announcements */}
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
          </button>

          {/* Theme toggle */}
          <button onClick={toggleTheme} aria-label="Toggle theme"
            className="p-2 rounded-lg dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-dark-600 hover:bg-slate-100 transition-colors">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button onClick={handleNotifToggle} aria-label="Notifications"
              className="relative p-2 rounded-lg dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-dark-600 hover:bg-slate-100 transition-colors">
              <motion.div
                animate={{ rotate: notifOpen ? 15 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Bell size={18} />
              </motion.div>
              {badgeLabel && (
                <motion.span key={badgeLabel} initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white dark:ring-dark-800">
                  {badgeLabel}
                </motion.span>
              )}
            </button>

            {/* Notification Dropdown */}
            <AnimatePresence>
              {notifOpen && (
                <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl border dark:border-dark-500/60 border-slate-200/80 overflow-hidden z-[100]
                    bg-white dark:bg-dark-800">
                  <div className="px-4 py-3 border-b dark:border-dark-500/50 border-slate-200/60 flex items-center justify-between flex-shrink-0">
                    <span className="text-sm font-semibold dark:text-white text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 font-medium">
                        {unreadCount} new
                      </span>
                    )}
                  </div>

                  <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
                    {notifLoading ? (
                      <div className="p-4 space-y-3">
                        {[0,1,2].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}
                      </div>
                    ) : announcements.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell size={24} className="dark:text-slate-600 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No notifications yet</p>
                      </div>
                    ) : (
                      <>
                        {pinnedAnnouncements.length > 0 && (
                          <>
                            <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider dark:text-slate-500 text-slate-400 border-b dark:border-dark-500/30 border-slate-200/50">
                              📌 Pinned
                            </div>
                            {pinnedAnnouncements.map(ann => (
                              <NotifItem key={ann._id} ann={ann} isRead={isAnnRead(ann)} onRead={onReadAnnouncement} onClose={() => setNotifOpen(false)} navigate={navigate} />
                            ))}
                          </>
                        )}
                        {latestAnnouncements.length > 0 && (
                          <>
                            <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider dark:text-slate-500 text-slate-400 border-b dark:border-dark-500/30 border-slate-200/50">
                              Latest
                            </div>
                            {latestAnnouncements.map(ann => (
                              <NotifItem key={ann._id} ann={ann} isRead={isAnnRead(ann)} onRead={onReadAnnouncement} onClose={() => setNotifOpen(false)} navigate={navigate} />
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <div className="px-4 py-3 border-t dark:border-dark-500/50 border-slate-200/60 flex-shrink-0">
                    <button onClick={() => { setNotifOpen(false); navigate('/announcements') }}
                      className="w-full text-center text-xs font-medium text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors py-1">
                      View All Announcements →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Admin Panel button (admin only) */}
          {user?.role === 'admin' && (
            <button onClick={() => navigate('/admin')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 dark:focus:ring-offset-dark-800">
              <Shield size={13} />
              Admin Panel
            </button>
          )}

          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            onClick={() => navigate('/profile')}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
