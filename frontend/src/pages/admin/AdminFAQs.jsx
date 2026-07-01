import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Edit3, Trash2, ChevronDown, ChevronUp,
         Check, X, Star, ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const CATEGORIES = ['NOC', 'Offer Letter', 'ViBe', 'Rosetta', 'Team Formation', 'Coursework',
                    'Mentor Support', 'AI/Yaksha', 'Certificate', 'Timing', 'About', 'General']
const IMPORTANCES = ['critical', 'high', 'medium', 'low']
const SOURCES = ['official', 'mentor', 'community']

function FAQModal({ existing, onClose, onSave, categories }) {
  const [form, setForm] = useState(existing || {
    category: 'General',
    sectionId: '',
    question: '',
    answer: '',
    tags: [],
    importance: 'medium',
    source: 'official',
  })
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.question.trim() || !form.answer.trim() || !form.category) {
      toast.error('Question, answer, and category are required')
      return
    }
    setSaving(true)
    try {
      if (existing?._id) {
        await api.patch(`/faq/${existing._id}`, form)
      } else {
        await api.post('/faq', { ...form, verified: true })
      }
      toast.success(existing?._id ? 'FAQ updated!' : 'FAQ created!')
      onSave()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save FAQ')
    } finally { setSaving(false) }
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) {
      setForm(f => ({ ...f, tags: [...f.tags, tag] }))
    }
    setTagInput('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-2xl card-dark p-6 z-10 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold dark:text-white text-slate-900 mb-5">{existing?._id ? 'Edit FAQ' : 'Create New FAQ'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Category *</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="input-dark text-sm">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Section ID</label>
              <input value={form.sectionId} onChange={e => setForm(f => ({ ...f, sectionId: e.target.value }))}
                className="input-dark text-sm" placeholder="e.g. 12.11" />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Question *</label>
            <textarea value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              className="input-dark min-h-[60px] resize-y" placeholder="Enter the FAQ question..." required />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Answer *</label>
            <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
              className="input-dark min-h-[120px] resize-y" placeholder="Enter the answer..." required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Importance</label>
              <div className="flex gap-1.5">
                {IMPORTANCES.map(imp => (
                  <button type="button" key={imp} onClick={() => setForm(f => ({ ...f, importance: imp }))}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border capitalize transition-all ${
                      form.importance === imp
                        ? imp === 'critical' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                        : imp === 'high' ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                        : imp === 'medium' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                        : 'bg-slate-500/20 border-slate-500/30 text-slate-400'
                        : 'border-dark-500 text-slate-500 bg-dark-700'
                    }`}>
                    {imp}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Source</label>
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                className="input-dark text-sm">
                {SOURCES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Tags</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {form.tags.map(t => (
                <span key={t} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                  {t}
                  <button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="input-dark text-sm flex-1" placeholder="Add a tag..." />
              <button type="button" onClick={addTag} className="btn-secondary py-1.5 px-3 text-sm">Add</button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? 'Saving...' : <><Check size={14} /> {existing?._id ? 'Update FAQ' : 'Create FAQ'}</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function FAQRow({ faq, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const impColors = {
    critical: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    high: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    medium: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    low: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  }

  return (
    <>
      <tr className="border-b border-dark-500/30 hover:bg-dark-600/30 transition-colors">
        <td className="px-4 py-3">
          <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 text-left w-full">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {faq.sectionId && <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">§{faq.sectionId}</span>}
                <span className="badge-category text-xs">{faq.category}</span>
                <span className={`text-xs border px-2 py-0.5 rounded-full capitalize ${impColors[faq.importance] || impColors.medium}`}>{faq.importance}</span>
              </div>
              <p className="text-sm dark:text-slate-200 text-slate-800 line-clamp-1">{faq.question}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-0.5"><ThumbsUp size={10} className="text-emerald-400" /> {faq.helpfulVotes || 0}</span>
                <span className="flex items-center gap-0.5"><ThumbsDown size={10} className="text-rose-400" /> {faq.notHelpfulVotes || 0}</span>
                <span>{faq.usageCount || 0} uses</span>
              </div>
              {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
            </div>
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(faq)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
              <Edit3 size={13} />
            </button>
            <button onClick={() => onDelete(faq._id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={2} className="bg-dark-700/50 px-4 py-4">
            <div className="ml-4 border-l-2 border-blue-500/30 pl-4">
              <p className="text-sm dark:text-slate-300 text-slate-700 leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
              <div className="flex gap-3 mt-3 text-xs text-slate-600">
                <span>Source: <span className="capitalize text-slate-500">{faq.source}</span></span>
                <span>·</span>
                <span>Verified: {faq.verified ? <span className="text-emerald-400">✓ Yes</span> : <span className="text-rose-400">✗ No</span>}</span>
                {faq.tags?.length > 0 && (
                  <>
                    <span>·</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {faq.tags.map(t => <span key={t} className="text-slate-600">{t}</span>)}
                    </div>
                  </>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function AdminFAQs() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [importance, setImportance] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState(null)
  const limit = 20

  // Live search debounce
  const searchTimerRef = useRef(null)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => fetchFAQs(), 300)
    return () => clearTimeout(searchTimerRef.current)
  }, [search])

  useEffect(() => { fetchFAQs() }, [category, importance, page])

  const fetchFAQs = async () => {
    setLoading(true)
    try {
      const params = { limit: String(limit), page: String(page) }
      if (category !== 'All') params.category = category
      if (importance !== 'all') params.importance = importance
      if (search) params.search = search
      const res = await api.get('/faq', { params })
      setFaqs(res.data.faqs || [])
      setTotal(res.data.total || 0)
    } catch (e) {}
    setLoading(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchFAQs()
  }

  const handleEdit = (faq) => { setEditing(faq); setShowModal(true) }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this FAQ? This cannot be undone.')) return
    try {
      await api.delete(`/faq/${id}`)
      setFaqs(faqs => faqs.filter(f => f._id !== id))
      toast.success('FAQ deleted')
    } catch (e) { toast.error('Failed to delete FAQ') }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold dark:text-white text-slate-900">FAQ Management</h1>
              <p className="text-sm text-slate-500">{total} FAQs in knowledge base</p>
            </div>
          </div>
          <button onClick={() => { setEditing(null); setShowModal(true) }}
            className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> Create FAQ
          </button>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="card-dark p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search FAQs..."
              className="input-dark text-sm" />
          </div>
          <button type="submit" className="btn-primary py-2 px-4 text-sm">Search</button>
        </form>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Category:</span>
            <div className="flex flex-wrap gap-1.5">
              {['All', ...CATEGORIES].map(c => (
                <button key={c} onClick={() => { setCategory(c); setPage(1); }}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${category === c ? 'filter-btn-active' : 'filter-btn'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="text-xs text-slate-500">Importance:</span>
          {['all', ...IMPORTANCES].map(imp => (
            <button key={imp} onClick={() => { setImportance(imp); setPage(1); }}
              className={`text-xs px-2.5 py-1 rounded-lg border capitalize transition-all ${importance === imp ? 'filter-btn-active' : 'filter-btn'}`}>
              {imp}
            </button>
          ))}
        </div>
      </motion.div>

      {/* FAQ Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-500/50 bg-dark-700/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">FAQ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-dark-500/30">
                    <td className="px-4 py-3"><div className="h-10 skeleton rounded" /></td>
                    <td className="px-4 py-3"><div className="h-8 skeleton rounded" /></td>
                  </tr>
                ))
              ) : faqs.length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-16 text-center dark:text-slate-400 text-slate-500">No FAQs found</td></tr>
              ) : (
                faqs.map(faq => (
                  <FAQRow key={faq._id} faq={faq} onEdit={handleEdit} onDelete={handleDelete} />
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {Math.ceil(total / limit) > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-500/50">
            <p className="text-xs text-slate-500">{faqs.length} of {total} FAQs</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-dark-600 disabled:opacity-30">← Prev</button>
              <span className="px-3 py-1 text-xs text-slate-500">{page} / {Math.ceil(total / limit)}</span>
              <button onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))} disabled={page >= Math.ceil(total / limit)}
                className="px-3 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-dark-600 disabled:opacity-30">Next →</button>
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <FAQModal existing={editing} onClose={() => setShowModal(false)} onSave={fetchFAQs} categories={CATEGORIES} />
        )}
      </AnimatePresence>
    </div>
  )
}