// FAQBrowser.jsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Search, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
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

  return (
    <div className="card-dark overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-dark-600/40 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {faq.sectionId && <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">§{faq.sectionId}</span>}
            <span className="badge-category">{faq.category}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-${c}-500/10 text-${c}-400 border border-${c}-500/20`}>{faq.importance}</span>
          </div>
          <p className="text-sm font-medium text-slate-200">
            <Highlight text={faq.question} term={searchTerm} />
          </p>
          {!open && (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              <Highlight text={summary} term={searchTerm} />
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-600">{faq.usageCount} uses</span>
          {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </button>
      {open && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }}
          className="border-t border-dark-500/50 px-4 py-4">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            <Highlight text={faq.answer} term={searchTerm} />
          </p>
          {faq.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {faq.tags.map(t => <span key={t} className="text-xs text-slate-600 bg-dark-600 px-2 py-0.5 rounded-full">{t}</span>)}
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

  useEffect(() => { fetchFAQs(search) }, [category])

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
          <h1 className="text-xl font-bold text-white">FAQ Browser</h1>
          <p className="text-sm text-slate-500">{total} entries in the knowledge base</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search FAQs..." className="input-dark pl-10 pr-20" />
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-1.5 px-3 text-sm">Search</button>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              category === c ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'border-dark-500 text-slate-500 bg-dark-700 hover:text-slate-300'
            }`}>{c}</button>
        ))}
      </div>

      <div className="space-y-2">
        {loading
          ? Array(8).fill(0).map((_, i) => <div key={i} className="card-dark h-14 animate-pulse" />)
          : faqs.length === 0
            ? <div className="text-center py-16 text-slate-500">No FAQs found</div>
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
    api.get('/announcements').then(r => setAnnouncements(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const priorityConfig = {
    urgent: { class: 'bg-rose-500/15 text-rose-400 border-rose-500/20', label: '🚨 Urgent' },
    important: { class: 'bg-amber-500/15 text-amber-400 border-amber-500/20', label: '⚠️ Important' },
    general: { class: 'bg-blue-500/15 text-blue-400 border-blue-500/20', label: '📢 General' },
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-orange-600 flex items-center justify-center">
          <ExternalLink size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Announcements</h1>
          <p className="text-sm text-slate-500">Important notices from the Vicharanashala team</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="card-dark h-24 animate-pulse" />)}</div>
      ) : announcements.length === 0 ? (
        <div className="card-dark p-12 text-center">
          <p className="text-slate-500">No announcements yet. Check back later.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(ann => {
            const pc = priorityConfig[ann.priority] || priorityConfig.general
            return (
              <motion.div key={ann._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`card-dark p-5 ${ann.isPinned ? 'border-amber-500/20' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs border px-2.5 py-0.5 rounded-full font-medium ${pc.class}`}>{pc.label}</span>
                      {ann.isPinned && <span className="text-xs text-amber-400">📌 Pinned</span>}
                    </div>
                    <h3 className="font-semibold text-white mb-2">{ann.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{ann.content}</p>
                    {ann.deadline && (
                      <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
                        ⏰ Deadline: {new Date(ann.deadline).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 mt-3">{new Date(ann.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
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
    api.get('/users/my-queries').then(r => setMyQueries(r.data)).catch(() => {})
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-white mb-8">Profile</h1>
      <div className="card-dark p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name}</h2>
            <p className="text-slate-400">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge-category capitalize">{user?.role}</span>
              <span className="badge-category capitalize">{user?.phase} phase</span>
            </div>
          </div>
        </div>
        {user?.college && <p className="text-sm text-slate-500">🏛️ {user.college}</p>}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-dark-500/50">
          <div className="text-center"><div className="text-2xl font-bold text-white">{user?.stats?.queriesRaised || 0}</div><div className="text-xs text-slate-500">Queries Raised</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-white">{user?.stats?.answersGiven || 0}</div><div className="text-xs text-slate-500">Answers Given</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-white">{user?.stats?.reputation || 0}</div><div className="text-xs text-slate-500">Reputation</div></div>
        </div>
      </div>
      {myQueries.length > 0 && (
        <div className="card-dark p-5">
          <h3 className="font-semibold text-white mb-4">My Queries ({myQueries.length})</h3>
          <div className="space-y-2">
            {myQueries.map(q => (
              <div key={q._id} className="flex items-center justify-between p-3 bg-dark-700 rounded-xl">
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
      <h1 className="text-xl font-bold text-white mb-8">Settings</h1>
      <div className="space-y-4">
        <div className="card-dark p-5">
          <h3 className="font-semibold text-white mb-4">Appearance</h3>
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-slate-300">Theme</p><p className="text-xs text-slate-500">Current: {theme}</p></div>
            <button onClick={toggleTheme} className="btn-secondary text-sm">{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</button>
          </div>
        </div>
        <div className="card-dark p-5">
          <h3 className="font-semibold text-white mb-4">AI Preferences</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Default Explain Mode</label>
              <div className="flex gap-2">
                {['beginner', 'intermediate', 'detailed'].map(m => (
                  <button key={m} onClick={() => setPrefs(p => ({ ...p, explainMode: m }))}
                    className={`flex-1 py-2 rounded-xl text-sm border transition-all capitalize ${prefs.explainMode === m ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'border-dark-500 text-slate-500 bg-dark-700'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-slate-300">Notifications</p><p className="text-xs text-slate-500">Receive platform updates</p></div>
              <button onClick={() => setPrefs(p => ({ ...p, notifications: !p.notifications }))}
                className={`w-12 h-6 rounded-full border transition-all relative ${prefs.notifications ? 'bg-blue-600 border-blue-500' : 'bg-dark-600 border-dark-500'}`}>
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
