import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Plus, Edit3, Trash2, Pin, Search, Check, X, ChevronUp, ChevronDown } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const PRIORITIES = ['general', 'important', 'urgent']
const AUDIENCES = ['all', 'bronze', 'silver', 'gold']

function AnnouncementModal({ existing, onClose, onSave }) {
  const [form, setForm] = useState(existing || {
    title: '',
    content: '',
    priority: 'general',
    isPinned: false,
    targetAudience: 'all',
    deadline: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (payload.deadline) payload.deadline = new Date(payload.deadline)
      if (existing?._id) {
        await api.patch(`/announcements/${existing._id}`, payload)
      } else {
        await api.post('/announcements', payload)
      }
      toast.success(existing?._id ? 'Announcement updated!' : 'Announcement created!')
      onSave()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const priorityColors = {
    urgent: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    important: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    general: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg card-dark p-6 z-10">
        <h2 className="text-lg font-bold text-white mb-5">{existing?._id ? 'Edit Announcement' : 'New Announcement'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="input-dark" placeholder="Announcement title..." required />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Content *</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              className="input-dark min-h-[120px] resize-y" placeholder="Write your announcement..." required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Priority</label>
              <div className="flex gap-2">
                {PRIORITIES.map(p => (
                  <button type="button" key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                    className={`text-xs px-3 py-1.5 rounded-lg border capitalize transition-all ${form.priority === p ? priorityColors[p] : 'filter-btn'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Audience</label>
              <select value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}
                className="input-dark text-sm">
                {AUDIENCES.map(a => <option key={a} value={a} className="capitalize">{a}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))}
                className="w-4 h-4 rounded accent-amber-500" />
              <span className="text-sm text-slate-300">Pin this announcement</span>
            </label>
            <input type="date" value={form.deadline?.split('T')[0] || ''}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              className="input-dark text-sm w-auto" placeholder="Optional deadline" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? 'Saving...' : <><Check size={14} /> {existing?._id ? 'Update' : 'Publish'}</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [allAnnouncements, setAllAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [pubRes, allRes] = await Promise.all([
        api.get('/announcements').catch(() => ({ data: [] })),
        api.get('/announcements/admin/all').catch(() => ({ data: [] })),
      ])
      setAnnouncements(pubRes.data)
      setAllAnnouncements(allRes.data)
      // fetch stats
      api.get('/announcements/admin/stats').then(r => setStats(r.data)).catch(() => {})
    } catch (e) {}
    setLoading(false)
  }

  const handleSave = () => { fetchData() }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return
    try {
      await api.delete(`/announcements/${id}`)
      toast.success('Announcement deleted')
      fetchData()
    } catch (e) { toast.error('Failed to delete') }
  }

  const handleTogglePin = async (ann) => {
    try {
      await api.patch(`/announcements/${ann._id}`, { isPinned: !ann.isPinned })
      fetchData()
    } catch (e) { toast.error('Failed to update') }
  }

  const displayList = showAll ? allAnnouncements : announcements

  const priorityConfig = {
    urgent: { cls: 'bg-rose-500/15 text-rose-400 border-rose-500/20', label: '🚨 Urgent' },
    important: { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20', label: '⚠️ Important' },
    general: { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20', label: '📢 General' },
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-orange-600 flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold dark:text-white text-slate-900">Announcement Management</h1>
              <p className="text-sm text-slate-500">{announcements.length} active announcements</p>
            </div>
          </div>
          <button onClick={() => { setEditing(null); setShowModal(true) }}
            className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> New Announcement
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      {stats && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'blue' },
            { label: 'Urgent', value: stats.byPriority?.urgent || 0, color: 'rose' },
            { label: 'Pinned', value: stats.pinnedCount || 0, color: 'amber' },
          ].map(s => (
            <div key={s.label} className="card-dark p-4 text-center">
              <p className="text-2xl font-bold dark:text-white text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Toggle */}
      <div className="flex items-center gap-3">
        <button onClick={() => setShowAll(false)}
          className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${!showAll ? 'filter-btn-active' : 'filter-btn'}`}>
          Active Only
        </button>
        <button onClick={() => setShowAll(true)}
          className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${showAll ? 'filter-btn-active' : 'filter-btn'}`}>
          Show All (incl. deleted)
        </button>
      </div>

      {/* List */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="space-y-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="card-dark h-24 animate-pulse" />)
        ) : displayList.length === 0 ? (
          <div className="card-dark p-12 text-center text-slate-500">No announcements found</div>
        ) : (
          displayList.map(ann => {
            const pc = priorityConfig[ann.priority] || priorityConfig.general
            return (
              <motion.div key={ann._id} layout
                className={`card-dark p-5 ${ann.isPinned ? 'border-amber-500/20' : ''} ${!ann.isActive ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs border px-2.5 py-0.5 rounded-full font-medium ${pc.cls}`}>{pc.label}</span>
                      {ann.isPinned && <span className="text-xs text-amber-400">📌 Pinned</span>}
                      {!ann.isActive && <span className="text-xs text-slate-600">🗑️ Deleted</span>}
                      {ann.targetAudience !== 'all' && <span className="badge-category">{ann.targetAudience} phase</span>}
                    </div>
                    <h3 className="font-semibold dark:text-white text-slate-900 mb-1">{ann.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{ann.content}</p>
                    {ann.deadline && (
                      <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
                        ⏰ Deadline: {new Date(ann.deadline).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 mt-2">
                      By {ann.author?.name || 'Admin'} · {new Date(ann.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => handleTogglePin(ann)}
                      className={`p-1.5 rounded-lg transition-colors ${ann.isPinned ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-dark-600'}`}
                      title={ann.isPinned ? 'Unpin' : 'Pin'}>
                      <Pin size={14} />
                    </button>
                    <button onClick={() => { setEditing(ann); setShowModal(true) }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Edit">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(ann._id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <AnnouncementModal existing={editing} onClose={() => setShowModal(false)} onSave={handleSave} />
        )}
      </AnimatePresence>
    </div>
  )
}