import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore, useThemeStore, useUIStore } from '../../store'
import {
  Brain, Home, MessageSquarePlus, MessagesSquare, BarChart3,
  Bell, User, Settings, BookOpen, LogOut, Menu, X, Sun, Moon,
  ChevronRight, Zap, Shield
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/home', icon: Home, label: 'Home', desc: 'AI Intelligence Hub' },
  { to: '/ask', icon: Brain, label: 'Ask AI', desc: 'RAG-powered answers' },
  { to: '/raise-query', icon: MessageSquarePlus, label: 'Raise Query', desc: 'Post a question' },
  { to: '/discussions', icon: MessagesSquare, label: 'Discussions', desc: 'Community Q&A' },
  { to: '/faq', icon: BookOpen, label: 'FAQ Browser', desc: 'Browse knowledge base' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', desc: 'Confusion insights' },
  { to: '/announcements', icon: Bell, label: 'Announcements', desc: 'Important notices' },
]

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

  const handleLogout = () => { logout(); navigate('/login') }

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-dark-500/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={18} className="text-white" />
          </div>
          {(sidebarOpen || mobile) && (
            <div>
              <div className="font-bold text-white text-lg leading-tight tracking-tight">VINS</div>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">AI Intelligence</div>
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
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-600'
              }`
            }>
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} />
                {(sidebarOpen || mobile) && (
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{label}</div>
                    {isActive && <div className="text-[10px] text-slate-500 truncate">{desc}</div>}
                  </div>
                )}
                {isActive && (sidebarOpen || mobile) && <ChevronRight size={14} className="text-blue-400/60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-dark-500/50 space-y-1">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => mobile && setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive ? 'bg-dark-600 text-slate-200' : 'text-slate-400 hover:text-slate-200 hover:bg-dark-600'
              }`
            }>
            <Icon size={18} />
            {(sidebarOpen || mobile) && <span className="text-sm">{label}</span>}
          </NavLink>
        ))}
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200">
          <LogOut size={18} />
          {(sidebarOpen || mobile) && <span className="text-sm">Logout</span>}
        </button>

        {/* User card */}
        {(sidebarOpen || mobile) && user && (
          <div className="mt-3 p-3 bg-dark-700 rounded-xl border border-dark-500/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-200 truncate">{user.name}</div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
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
        className="hidden lg:flex flex-col bg-dark-800 border-r border-dark-500/50 flex-shrink-0 overflow-hidden"
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
              className="fixed left-0 top-0 bottom-0 w-72 bg-dark-800 border-r border-dark-500/50 z-50 lg:hidden overflow-y-auto">
              <SidebarContent mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="bg-dark-800/80 backdrop-blur-md border-b border-dark-500/50 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => { toggleSidebar(); setMobileOpen(o => !o) }}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-600 transition-colors lg:flex hidden">
            <Menu size={18} />
          </button>
          <button onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-600 transition-colors lg:hidden">
            <Menu size={18} />
          </button>

          <div className="flex-1" />

          <button onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-600 transition-colors">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer"
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
