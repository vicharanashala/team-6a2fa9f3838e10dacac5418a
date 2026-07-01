import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Users, Shield, UserCheck, UserX, ChevronDown, ChevronUp,
         Trash2, X, Check, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const ROLES = ['all', 'student', 'mentor', 'admin']
const STATUS_OPTIONS = ['all', 'active', 'inactive']
const PHASES = ['all', 'bronze', 'silver', 'gold', 'platinum']

const roleColors = {
  admin: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  mentor: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  student: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
}

function UserRowSkeleton() {
  return (
    <tr className="border-b border-dark-500/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 skeleton-dark-700 rounded-full flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-28 skeleton-dark-700 rounded" />
            <div className="h-3 w-40 skeleton-dark-700 rounded" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-6 w-16 bg-dark-700 rounded-full animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-6 w-14 bg-dark-700 rounded-full animate-pulse" /></td>
      <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-32 skeleton-dark-700 rounded" /></td>
      <td className="px-4 py-3"><div className="h-4 w-20 skeleton-dark-700 rounded" /></td>
      <td className="px-4 py-3"><div className="h-5 w-14 bg-dark-700 rounded-full animate-pulse" /></td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <div className="h-7 w-7 skeleton-dark-700 rounded-lg" />
          <div className="h-7 w-7 skeleton-dark-700 rounded-lg" />
          <div className="h-7 w-7 skeleton-dark-700 rounded-lg" />
        </div>
      </td>
    </tr>
  )
}

function ExpandedUserRow({ user, onClose }) {
  const [newRole, setNewRole] = useState(user.role)
  const [saving, setSaving] = useState(false)

  const handleRoleSave = async () => {
    if (newRole === user.role) return
    setSaving(true)
    try {
      await api.patch(`/users/${user._id}/role`, { role: newRole })
      toast.success(`Role updated to ${newRole}`)
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update role')
    } finally { setSaving(false) }
  }

  return (
    <tr>
      <td colSpan={7} className="bg-dark-700/50 dark:bg-dark-700/50 px-4 py-4 bg-slate-100/50">
        <div className="flex items-start gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
            <div className="bg-dark-700 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Queries Raised</p>
              <p className="text-lg font-bold dark:text-white text-slate-900">{user.stats?.queriesRaised || 0}</p>
            </div>
            <div className="bg-dark-700 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Answers Given</p>
              <p className="text-lg font-bold dark:text-white text-slate-900">{user.stats?.answersGiven || 0}</p>
            </div>
            <div className="bg-dark-700 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Reputation</p>
              <p className="text-lg font-bold dark:text-white text-slate-900">{user.stats?.reputation || 0}</p>
            </div>
            <div className="bg-dark-700 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Last Seen</p>
              <p className="text-sm font-medium text-slate-300">{user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'Never'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-dark-600 transition-colors flex-shrink-0">
            <X size={14} />
          </button>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-sm text-slate-400">Change Role:</span>
          <div className="flex gap-2">
            {['student', 'mentor', 'admin'].map(r => (
              <button key={r} onClick={() => setNewRole(r)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all capitalize ${
                  newRole === r
                    ? r === 'admin' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                    : r === 'mentor' ? 'bg-violet-500/20 border-violet-500/30 text-violet-400'
                    : 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                    : 'border-dark-500 text-slate-500 bg-dark-700 hover:text-slate-300'
                }`}>
                {r}
              </button>
            ))}
          </div>
          {newRole !== user.role && (
            <button onClick={handleRoleSave} disabled={saving}
              className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 active:scale-95 transition-transform">
              {saving ? 'Saving...' : <><Check size={12} /> Save</>}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedUserId, setExpandedUserId] = useState(null)
  const limit = 15

  // Live search debounce
  const searchTimerRef = useRef(null)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => fetchUsers(), 300)
    return () => clearTimeout(searchTimerRef.current)
  }, [search])

  useEffect(() => { fetchUsers() }, [roleFilter, statusFilter, page])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = { page, limit: String(limit) }
      if (roleFilter !== 'all') params.role = roleFilter
      if (statusFilter === 'active') params.isActive = 'true'
      else if (statusFilter === 'inactive') params.isActive = 'false'
      if (search) params.search = search
      const res = await api.get('/users/', { params })
      setUsers(res.data.users || res.data || [])
      const totalCount = res.data.total || (Array.isArray(res.data) ? res.data.length : 0)
      setTotal(totalCount)
      setTotalPages(Math.ceil(totalCount / limit) || 1)
    } catch (e) {
      toast.error('Failed to fetch users')
    }
    setLoading(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const handleStatusToggle = async (userId, isActive) => {
    try {
      await api.patch(`/users/${userId}/status`, { isActive })
      setUsers(users => users.map(u => u._id === userId ? { ...u, isActive } : u))
      toast.success(`User ${isActive ? 'activated' : 'deactivated'}`)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update status')
    }
  }

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure? This will deactivate the user account.')) return
    try {
      await api.delete(`/users/${userId}`)
      setUsers(users => users.filter(u => u._id !== userId))
      toast.success('User deleted (deactivated)')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete user')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold dark:text-white text-slate-900">User Management</h1>
            <p className="text-sm text-slate-500">{total} users total</p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="card-dark p-4">
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
              className="input-dark text-sm" />
          </div>
          <button type="submit" className="btn-primary py-2 px-4 text-sm">Search</button>
        </form>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-500" />
            <span className="text-xs text-slate-500">Role:</span>
            {ROLES.map(r => (
              <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all capitalize ${roleFilter === r ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'border-dark-500 text-slate-500 bg-dark-700 hover:text-slate-300'}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Status:</span>
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all capitalize ${statusFilter === s ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'border-dark-500 text-slate-500 bg-dark-700 hover:text-slate-300'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="admin-table-header sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Phase</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">College</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(8).fill(0).map((_, i) => <UserRowSkeleton key={i} />)
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-dark-700 flex items-center justify-center mb-4">
                        <Users size={24} className="text-slate-600" />
                      </div>
                      <p className="text-slate-400 font-medium mb-1">No users found</p>
                      <p className="text-slate-600 text-sm">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user, i) => (
                  <>
                    <motion.tr key={user._id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                      className="border-b border-dark-500/30 hover:bg-dark-600/30 transition-colors duration-150"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium dark:text-slate-200 text-slate-700 truncate">{user.name}</p>
                            <p className="text-xs text-slate-600 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs border px-2.5 py-1 rounded-full font-medium ${roleColors[user.role] || roleColors.student}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge-category capitalize">{user.phase || 'bronze'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 hidden md:table-cell">{user.college || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          <span className="text-xs text-slate-500">{user.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 active:scale-95 transition-transform">
                          <button onClick={() => setExpandedUserId(expandedUserId === user._id ? null : user._id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-dark-600 transition-colors">
                            {expandedUserId === user._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {user.isActive ? (
                            <button onClick={() => handleStatusToggle(user._id, false)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors" title="Deactivate">
                              <UserX size={14} />
                            </button>
                          ) : (
                            <button onClick={() => handleStatusToggle(user._id, true)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Activate">
                              <UserCheck size={14} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(user._id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Delete user">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                    {expandedUserId === user._id && (
                      <ExpandedUserRow key="expanded" user={user} onClose={() => setExpandedUserId(null)} />
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-500/50">
            <p className="text-xs text-slate-500">Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-dark-600 disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all active:scale-95 ${page === p ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-dark-600'}`}>
                    {p}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-dark-600 disabled:opacity-30 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}