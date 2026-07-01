// FAQBrowser.jsx
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import api from '../utils/api'

const CATEGORIES = ['All', 'NOC', 'Offer Letter', 'ViBe', 'Rosetta', 'Team Formation', 'Coursework', 'Mentor Support', 'AI/Yaksha', 'Certificate', 'Timing', 'About', 'General']

function Highlight({ text, term }) {
  if (!term || !term.trim()) return <>{text}</>
  const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-amber-400/30 text-amber-200 rounded px-0.5">{part}</mark>
          : part
      )}
    </>
  )
}

function getSummary(answer) {
  const first = answer.split(/[.\n]/)[0].trim()
  return first.length > 120 ? first.slice(0, 117) + '…' : first + (answer.length > first.length ? '…' : '')
}

function FAQItem({ faq, searchTerm }) {
  const [open, setOpen] = useState(false)
  const importanceColor = { critical: 'rose', high: 'amber', medium: 'blue', low: 'slate' }
  const c = importanceColor[faq.importance] || 'slate'
  const summary = getSummary(faq.answer)

  const readTime = Math.max(
  1,
  Math.ceil(faq.answer.trim().split(/\s+/).length / 200)
)

  return (
    <div className="card-dark overflow-hidden">
      <button
  onClick={() => {
    setOpen(o => !o)

    let recent = JSON.parse(
      localStorage.getItem('recentFAQs') || '[]'
    )

    recent = recent.filter(
      item => item._id !== faq._id
    )

    recent.unshift({
      _id: faq._id,
      question: faq.question
    })

    recent = recent.slice(0, 5)

    localStorage.setItem(
      'recentFAQs',
      JSON.stringify(recent)
    )

    window.dispatchEvent(
      new Event('recentFAQUpdated')
    )
  }}
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-dark-600/40 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {faq.sectionId && <span className="text-xs font-mono text-blue-400 dark:text-blue-400 text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded">§{faq.sectionId}</span>}
            <span className="badge-category">{faq.category}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${
              c === 'rose' ? 'bg-rose-500/10 text-rose-400 dark:text-rose-400 text-rose-600 border-rose-500/20' :
              c === 'amber' ? 'bg-amber-500/10 text-amber-400 dark:text-amber-400 text-amber-600 border-amber-500/20' :
              c === 'blue' ? 'bg-blue-500/10 text-blue-400 dark:text-blue-400 text-blue-600 border-blue-500/20' :
              'bg-slate-500/10 text-slate-400 dark:text-slate-400 text-slate-600 border-slate-500/20'
            }`}>{faq.importance}</span>
          </div>
                     <p className="text-xs text-slate-500 mb-1">
  ⏱️ {readTime} min read
</p>
          <p className="text-sm font-medium dark:text-slate-200 text-slate-700">
            <Highlight text={faq.question} term={searchTerm} />
          </p>
          {!open && (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              <Highlight text={summary} term={searchTerm} />
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-500">{faq.usageCount} uses</span>
          {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </button>
      {open && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }}
          className="border-t border-dark-500/50 px-4 py-4">
          <p className="text-sm dark:text-slate-300 text-slate-700 leading-relaxed whitespace-pre-wrap">
            <Highlight text={faq.answer} term={searchTerm} />
          </p>
          {faq.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {faq.tags.map(t => <span key={t} className="text-xs text-slate-500 bg-dark-600 px-2 py-0.5 rounded-full">{t}</span>)}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

export function FAQBrowser() {
  const [searchParams] = useSearchParams()
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [category, setCategory] = useState(searchParams.get('category') || 'All')
  const [total, setTotal] = useState(0)
  const [recentFAQs, setRecentFAQs] = useState([])
  

  // Live search debounce
  const searchTimerRef = useRef(null)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => fetchFAQs(search), 300)
    return () => clearTimeout(searchTimerRef.current)
  }, [search])

  useEffect(() => {
  fetchFAQs(search)

  const loadRecent = () => {
    const recent = JSON.parse(
      localStorage.getItem('recentFAQs') || '[]'
    )
    setRecentFAQs(recent)
  }

  loadRecent()

  window.addEventListener(
    'recentFAQUpdated',
    loadRecent
  )

  return () => {
    window.removeEventListener(
      'recentFAQUpdated',
      loadRecent
    )
  }
}, [category])

  const fetchFAQs = async (term) => {
    setLoading(true)
    try {
      const params = { limit: 100 }
      if (category !== 'All') params.category = category
      if (term) params.search = term
      const res = await api.get('/faq', { params })
      setFaqs(res.data.faqs)
      setTotal(res.data.total)
      setActiveSearch(term || '')
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleSearch = (e) => { e.preventDefault(); fetchFAQs(search) }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center">
          <BookOpen size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold dark:text-white text-slate-900">FAQ Browser</h1>
          <p className="text-sm text-slate-500">{total} entries in the knowledge base</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="relative mb-5">
<input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search FAQs..." className="input-dark pr-20 text-sm" />
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-1.5 px-3 text-sm">Search</button>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              category === c ? 'filter-btn-active' : 'filter-btn'
            }`}>{c}</button>
        ))}
      </div>
       {recentFAQs.length > 0 && (
        <div className="card-dark p-4 mb-6">
          <h3 className="text-white font-semibold mb-3">
            Recently Viewed FAQs
          </h3>

          <div className="space-y-2">
            {recentFAQs.map(item => (
              <div
                key={item._id}
                className="text-sm text-slate-300 bg-dark-700 p-2 rounded"
              >
                {item.question}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {loading
          ? Array(8).fill(0).map((_, i) => <div key={i} className="card-dark h-14 animate-pulse" />)
          : faqs.length === 0
            ? <div className="text-center py-16 text-slate-500 dark:text-slate-500 text-slate-500">No FAQs found</div>
            : faqs.map(faq => <FAQItem key={faq._id} faq={faq} searchTerm={activeSearch} />)
        }
      </div>
    </div>
  )
}

// Announcements.jsx content
export function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/announcements').then(r => setAnnouncements(Array.isArray(r.data) ? r.data : r.data?.announcements || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const pinned = announcements.filter(a => a.isPinned)
  const regular = announcements.filter(a => !a.isPinned)

  const priorityConfig = {
    urgent: { cls: 'bg-rose-500/15 text-rose-400 border-rose-500/20', label: 'Urgent' },
    important: { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20', label: 'Important' },
    general: { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20', label: 'General' },
  }

  function AnnCard({ ann, index }) {
    const pc = priorityConfig[ann.priority] || priorityConfig.general
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.25 }}
        className={`card-dark card-hover p-5 relative overflow-hidden group ${ann.isPinned ? 'border-amber-500/20' : ''} ${!ann.isRead ? 'ring-1 ring-blue-500/10' : ''}`}>
        {!ann.isRead && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-violet-500 rounded-full" />
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 pl-2">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className={`text-[11px] border px-2.5 py-0.5 rounded-full font-semibold ${pc.cls}`}>{pc.label}</span>
              {ann.isPinned && (
                <span className="text-[11px] text-amber-400 flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M16 4h2a2 2 0 0 1 2 2v1l-6 5-1-1.5L16 4zm-8 0v14l-2-2-1 1.5-6-5V6a2 2 0 0 1 2-2h2v14a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V4h2a2 2 0 0 1 2 2v1.5l-6 5-4-4z"/></svg>
                  Pinned
                </span>
              )}
            </div>
            <h3 className="font-semibold dark:text-white text-slate-900 mb-1.5 leading-snug">{ann.title}</h3>
            <p className="text-sm dark:text-slate-400 text-slate-500 leading-relaxed line-clamp-2">{ann.content}</p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {ann.deadline && (
                <span className="text-[11px] text-rose-400 flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                  Due {new Date(ann.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
              <span className="text-[11px] dark:text-slate-600 text-slate-400">
                {new Date(ann.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3.5 mb-8">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-600 to-orange-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
        </div>
        <div>
          <h1 className="text-xl font-bold dark:text-white text-slate-900">Announcements</h1>
          <p className="text-sm dark:text-slate-500 text-slate-400">Important notices from the Vicharanashala team</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0,1,2,3].map(i => (
            <div key={i} className="card-dark p-5">
              <div className="flex flex-col gap-3">
                <div className="skeleton h-3 w-24 rounded-full" />
                <div className="skeleton h-5 w-3/4 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="card-dark p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-dark-700 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="dark:text-slate-600 text-slate-300"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
          </div>
          <p className="text-base font-medium dark:text-slate-400 text-slate-600 mb-1">No announcements yet</p>
          <p className="text-sm dark:text-slate-600 text-slate-400">Check back later for important updates</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest dark:text-amber-400/70 text-amber-600">Pinned</span>
                <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 to-transparent" />
              </div>
              <div className="space-y-3">
                {pinned.map((ann, i) => <AnnCard key={ann._id} ann={ann} index={i} />)}
              </div>
            </div>
          )}
          {regular.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <div className="flex items-center gap-2 mb-3 mt-6">
                  <span className="text-[11px] font-bold uppercase tracking-widest dark:text-slate-500 text-slate-400">Latest</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-300/40 to-transparent dark:from-slate-700/40 to-transparent" />
                </div>
              )}
              <div className="space-y-3">
                {regular.map((ann, i) => <AnnCard key={ann._id} ann={ann} index={pinned.length + i} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Profile.jsx content
export function Profile() {
  const { user } = require('../store').useAuthStore()
  const [myQueries, setMyQueries] = useState([])
  useEffect(() => {
    api.get('/users/my-queries').then(r => setMyQueries(Array.isArray(r.data) ? r.data : r.data?.queries || [])).catch(() => {})
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold dark:text-white text-slate-900 mb-8">Profile</h1>
      <div className="card-dark p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold dark:text-white text-slate-900">{user?.name}</h2>
            <p className="text-slate-400">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge-category capitalize">{user?.role}</span>
              <span className="badge-category capitalize">{user?.phase} phase</span>
            </div>
          </div>
        </div>
        {user?.college && <p className="text-sm text-slate-500">🏛️ {user.college}</p>}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-dark-500/50">
          <div className="text-center"><div className="text-2xl font-bold dark:text-white text-slate-900">{user?.stats?.queriesRaised || 0}</div><div className="text-xs text-slate-500">Queries Raised</div></div>
          <div className="text-center"><div className="text-2xl font-bold dark:text-white text-slate-900">{user?.stats?.answersGiven || 0}</div><div className="text-xs text-slate-500">Answers Given</div></div>
          <div className="text-center"><div className="text-2xl font-bold dark:text-white text-slate-900">{user?.stats?.reputation || 0}</div><div className="text-xs text-slate-500">Reputation</div></div>
        </div>
      </div>
      {myQueries.length > 0 && (
        <div className="card-dark p-5">
          <h3 className="font-semibold dark:text-white text-slate-900 mb-4">My Queries ({myQueries.length})</h3>
          <div className="space-y-2">
            {myQueries.map(q => (
              <div key={q._id} className="flex items-center justify-between p-3 bg-dark-700/60 dark:bg-dark-700/60 rounded-xl faq-related-card bg-slate-100/60">
                <span className="text-sm text-slate-300 truncate flex-1">{q.title}</span>
                <span className="badge-category ml-2">{q.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Settings.jsx content
export function Settings() {
  const { user, updatePreferences } = require('../store').useAuthStore()
  const { theme, toggleTheme } = require('../store').useThemeStore()
  const [prefs, setPrefs] = useState({ explainMode: user?.preferences?.explainMode || 'intermediate', notifications: user?.preferences?.notifications ?? true })
  const toast = require('react-hot-toast').default

  const save = async () => {
    await updatePreferences(prefs)
    toast.success('Settings saved!')
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold dark:text-white text-slate-900 mb-8">Settings</h1>
      <div className="space-y-4">
        <div className="card-dark p-5">
          <h3 className="font-semibold dark:text-white text-slate-900 mb-4">Appearance</h3>
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-slate-300">Theme</p><p className="text-xs text-slate-500">Current: {theme}</p></div>
            <button onClick={toggleTheme} className="btn-secondary text-sm">{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</button>
          </div>
        </div>
        <div className="card-dark p-5">
          <h3 className="font-semibold dark:text-white text-slate-900 mb-4">AI Preferences</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Default Explain Mode</label>
              <div className="flex gap-2">
                {['beginner', 'intermediate', 'detailed'].map(m => (
                  <button key={m} onClick={() => setPrefs(p => ({ ...p, explainMode: m }))}
                    className={`flex-1 py-2 rounded-xl text-sm border transition-all capitalize explain-mode-btn ${prefs.explainMode === m ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'border-dark-500/50 dark:text-slate-300 text-slate-600 bg-dark-700/60 dark:bg-dark-700/60 bg-slate-100/60'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-slate-300">Notifications</p><p className="text-xs text-slate-500">Receive platform updates</p></div>
              <button onClick={() => setPrefs(p => ({ ...p, notifications: !p.notifications }))}
                className={`w-12 h-6 rounded-full border transition-all relative ${prefs.notifications ? 'toggle-track-on' : 'toggle-track-off'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${prefs.notifications ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </div>
        <button onClick={save} className="btn-primary w-full">Save Settings</button>
      </div>
    </div>
  )
}

export default FAQBrowser
