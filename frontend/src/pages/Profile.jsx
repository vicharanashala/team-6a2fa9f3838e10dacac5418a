import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Star, Clock, ExternalLink } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', college: '', batch: '' });
  const [stats, setStats] = useState({ queriesRaised: 0, answersGiven: 0, bookmarks: 0, reputation: 0 });
  const [bookmarkedQueries, setBookmarkedQueries] = useState([]);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', college: user.college || '', batch: user.batch || '' });
      setStats(user.stats || {});
    }
  }, [user]);

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const res = await api.get('/queries/bookmarked');
        setBookmarkedQueries(res.data.queries || []);
      } catch { /* silent */ }
    };
    if (user) fetchBookmarks();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!formData.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    if (/^\d/.test(formData.name)) {
      toast.error('Name cannot start with a number');
      return;
    }
    if (/^\d+$/.test(formData.name.replace(/\s/g, ''))) {
      toast.error('Name cannot contain only numbers');
      return;
    }

    setLoading(true);
    try {
      const res = await api.patch('/users/profile', formData);
      updateUser(res.data.user);
      setIsEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-32 skeleton-base rounded animate-pulse mx-auto mb-2" />
          <div className="h-4 w-48 skeleton-base rounded animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-slate-900 mb-1">My Profile</h1>
          <p className="text-slate-500 text-sm">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="card-dark p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 pb-6 border-b dark:border-dark-500/50 border-slate-200/60">
            <div className="flex items-center gap-5 mb-4 md:mb-0">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white text-2xl md:text-3xl font-bold flex-shrink-0 shadow-lg ring-2 ring-blue-500/20 dark:ring-blue-500/20">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold dark:text-slate-100 text-slate-900">{user.name}</h2>
                <p className="text-slate-400 text-sm capitalize">{user.role} · {user.phase} phase</p>
                <span className="badge-category mt-1.5 inline-block">{user.college || 'No college set'}</span>
              </div>
            </div>
            <button onClick={() => setIsEditing(!isEditing)}
              className="btn-secondary text-sm px-5 py-2">
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[{ label: 'Queries Raised', value: stats.queriesRaised }, { label: 'Answers Given', value: stats.answersGiven }, { label: 'Bookmarks', value: stats.bookmarks }, { label: 'Reputation', value: stats.reputation }].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                className="card-dark card-hover p-4 text-center preference-card">
                <p className="text-2xl font-bold dark:text-white text-slate-900">{s.value}</p>
                <p className="text-xs dark:text-slate-400 text-slate-400 mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="card-dark p-6 md:p-8">
            <h3 className="text-lg font-semibold dark:text-white text-slate-900 mb-5">Edit Profile</h3>
            <div className="space-y-4">
              {[
                { name: 'name', label: 'Full Name', placeholder: 'Your full name' },
                { name: 'college', label: 'College', placeholder: 'Your college' },
                { name: 'batch', label: 'Batch Year', placeholder: 'e.g. 2024' },
              ].map(f => (
                <div key={f.name}>
                  <label className="text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5 block">{f.label}</label>
                  <input type="text" name={f.name} value={formData[f.name]}
                    onChange={e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                    className="input-dark" placeholder={f.placeholder} />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsEditing(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSaveProfile} disabled={isLoading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Account & Status */}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              title: 'Account Details',
              items: [
                { label: 'Email', value: user.email },
                { label: 'Role', value: <span className="capitalize dark:text-white text-slate-900">{user.role}</span> },
                { label: 'Member Since', value: new Date(user.createdAt).toLocaleDateString() },
              ]
            },
            {
              title: 'Status',
              items: [
                { label: 'Account Status', value: user.isActive ? <span className="text-emerald-400">Active</span> : <span className="text-rose-400">Inactive</span> },
                { label: 'Last Seen', value: user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'Unknown' },
                { label: 'Phase', value: <span className="capitalize text-blue-400">{user.phase}</span> },
              ]
            }
          ].map(section => (
            <div key={section.title} className="card-dark p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">{section.title}</h3>
              <div className="space-y-3">
                {section.items.map(item => (
                  <div key={item.label} className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bookmarked Queries */}
        <div className="card-dark p-6 md:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Star size={16} className="text-amber-400" />
            <h2 className="text-lg font-semibold dark:text-white text-slate-900">Bookmarked Queries</h2>
            {bookmarkedQueries.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">
                {bookmarkedQueries.length}
              </span>
            )}
          </div>
          {bookmarkedQueries.length === 0 ? (
            <div className="text-center py-8">
              <Star size={24} className="dark:text-slate-600 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No bookmarked queries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookmarkedQueries.map(q => (
                <div key={q._id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl dark:bg-dark-700 bg-slate-50 border dark:border-dark-500/50 border-slate-200/60 hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium dark:text-slate-200 text-slate-700 line-clamp-1 mb-1">
                      {q.refinedTitle || q.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{q.author?.name}</span>
                      <span className="flex items-center gap-1"><Clock size={10} />{new Date(q.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/discussions/${q._id}`)}
                    className="flex-shrink-0 p-2 rounded-lg dark:text-slate-400 text-slate-500 hover:text-blue-400 dark:hover:text-blue-400 dark:hover:bg-dark-600 hover:bg-blue-50 transition-colors"
                    title="Open query">
                    <ExternalLink size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}