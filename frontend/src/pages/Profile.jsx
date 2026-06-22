import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    college: '',
    batch: ''
  });
  const [stats, setStats] = useState({
    queriesRaised: 0,
    answersGiven: 0,
    bookmarks: 0,
    reputation: 0
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        college: user.college || '',
        batch: user.batch || ''
      });
      setStats(user.stats || {});
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const res = await api.patch('/users/profile', formData);
      updateUser(res.data.user);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-slate-400">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 mb-8 backdrop-blur">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-8 border-b border-slate-700">
            <div className="flex items-center gap-6 mb-6 md:mb-0">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                <p className="text-slate-400">{user.role}</p>
                <p className="text-purple-400 text-sm mt-1">Phase: <span className="font-semibold capitalize">{user.phase}</span></p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Queries Raised</p>
              <p className="text-2xl font-bold text-white mt-2">{stats.queriesRaised}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Answers Given</p>
              <p className="text-2xl font-bold text-white mt-2">{stats.answersGiven}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Bookmarks</p>
              <p className="text-2xl font-bold text-white mt-2">{stats.bookmarks}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Reputation</p>
              <p className="text-2xl font-bold text-purple-400 mt-2">{stats.reputation}</p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 backdrop-blur">
            <h3 className="text-xl font-bold text-white mb-6">Edit Profile Information</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">College</label>
                <input
                  type="text"
                  name="college"
                  value={formData.college}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Your college"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Batch Year</label>
                <input
                  type="text"
                  name="batch"
                  value={formData.batch}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="e.g., 2024"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="flex-1 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
            <h3 className="text-lg font-semibold text-white mb-4">Account Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-400">Email</p>
                <p className="text-white font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-slate-400">Role</p>
                <p className="text-white font-medium capitalize">{user.role}</p>
              </div>
              <div>
                <p className="text-slate-400">Member Since</p>
                <p className="text-white font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
            <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-400">Account Status</p>
                <p className="text-white font-medium">
                  {user.isActive ? (
                    <span className="text-green-400">Active</span>
                  ) : (
                    <span className="text-red-400">Inactive</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Last Seen</p>
                <p className="text-white font-medium">{new Date(user.lastSeen).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
