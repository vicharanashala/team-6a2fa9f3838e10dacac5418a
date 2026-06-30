import { useState, useEffect } from 'react';
import { useAuthStore, useThemeStore } from '../store';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function Settings() {
  const { user, updatePreferences, updateUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    theme: 'system',
    explainMode: 'intermediate',
    notifications: true
  });

  useEffect(() => {
    if (user?.preferences) {
      setPreferences(user.preferences);
    }
  }, [user]);

  const handlePreferenceChange = async (key, value) => {
    setIsLoading(true);
    const updatedPrefs = { ...preferences, [key]: value };
    setPreferences(updatedPrefs);
    if (key === 'theme') {
      toggleTheme();
    }
    try {
      const res = await api.patch('/auth/preferences', updatedPrefs);
      updateUser(res.data.user);
      toast.success('Settings updated successfully!');
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
          <Monitor size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-500">Customize your experience</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Appearance */}
        <div className="card-dark p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Sun size={14} className="text-amber-400" /> Appearance
          </h2>
          <div className="flex items-center justify-between py-3 border-b border-dark-500/50">
            <div>
              <p className="text-sm font-medium text-slate-200">Dark Mode</p>
              <p className="text-xs text-slate-500 mt-0.5">Toggle between light and dark themes</p>
            </div>
            <button
              onClick={toggleTheme}
              disabled={isLoading}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-dark-500'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-1' : 'translate-x-7'
                }`}
              />
            </button>
          </div>

          <div className="py-3">
            <p className="text-sm font-medium text-slate-200 mb-3">Theme Preference</p>
            <div className="space-y-2">
              {[
                { value: 'light', label: 'Light', icon: Sun, desc: 'Light theme for bright environments' },
                { value: 'dark', label: 'Dark', icon: Moon, desc: 'Dark theme for comfortable viewing' },
                { value: 'system', label: 'System', icon: Monitor, desc: 'Follow system preferences' }
              ].map(option => (
                <label key={option.value} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors settings-option-card">
                  <input
                    type="radio"
                    name="themePref"
                    value={option.value}
                    checked={preferences.theme === option.value}
                    onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                    disabled={isLoading}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <option.icon size={15} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{option.label}</p>
                    <p className="text-xs text-slate-500">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* AI Interaction */}
        <div className="card-dark p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-lg">🤖</span> AI Interaction
          </h2>
          <div>
            <p className="text-sm font-medium text-slate-200 mb-3">Explanation Level</p>
            <p className="text-xs text-slate-500 mb-3">Choose how detailed AI explanations should be</p>
            <div className="space-y-2">
              {[
                { value: 'beginner', label: 'Beginner', icon: '👶', desc: 'Simple explanations for basics' },
                { value: 'intermediate', label: 'Intermediate', icon: '📚', desc: 'Balanced explanations (Recommended)' },
                { value: 'detailed', label: 'Detailed', icon: '🧑‍🎓', desc: 'In-depth technical explanations' }
              ].map(option => (
                <label key={option.value} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors settings-option-card">
                  <input
                    type="radio"
                    name="explainMode"
                    value={option.value}
                    checked={preferences.explainMode === option.value}
                    onChange={(e) => handlePreferenceChange('explainMode', e.target.value)}
                    disabled={isLoading}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="text-base">{option.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{option.label}</p>
                    <p className="text-xs text-slate-500">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card-dark p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-lg">🔔</span> Notifications
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Enable Notifications</p>
              <p className="text-xs text-slate-500 mt-0.5">Get alerts for important updates and messages</p>
            </div>
            <button
              onClick={() => handlePreferenceChange('notifications', !preferences.notifications)}
              disabled={isLoading}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                preferences.notifications ? 'bg-blue-600' : 'bg-dark-500'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  preferences.notifications ? 'translate-x-1' : 'translate-x-7'
                }`}
              />
            </button>
          </div>

          {preferences.notifications && (
            <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-xs text-slate-400">
              <p className="mb-1.5 font-medium text-slate-300">You'll receive notifications for:</p>
              <ul className="space-y-0.5 ml-3">
                <li>✓ Answers to your queries</li>
                <li>✓ Mentions and comments</li>
                <li>✓ Important announcements</li>
                <li>✓ Activity updates</li>
              </ul>
            </div>
          )}
        </div>

        {/* Privacy & Security */}
        <div className="card-dark p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-lg">🔒</span> Privacy & Security
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-dark-500/50">
              <div>
                <p className="text-sm font-medium text-slate-200">Change Password</p>
                <p className="text-xs text-slate-500 mt-0.5">Update your account password regularly</p>
              </div>
              <button className="btn-secondary text-sm py-1.5 px-3">Change</button>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-200">Two-Factor Authentication</p>
                <p className="text-xs text-slate-500 mt-0.5">Add an extra layer of security</p>
              </div>
              <button className="btn-secondary text-sm py-1.5 px-3">Enable</button>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="card-dark p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-lg">👤</span> Account
          </h2>
          <div className="space-y-2">
            <button className="w-full px-4 py-2.5 rounded-xl transition-colors text-sm text-left font-medium flex items-center gap-2 settings-btn">
              📥 Download Your Data
            </button>
            <button className="w-full px-4 py-2.5 rounded-xl transition-colors text-sm text-left font-medium flex items-center gap-2 settings-btn">
              🔒 Deactivate Account
            </button>
            <button className="w-full px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors text-sm text-left font-medium flex items-center gap-2">
              ⚠️ Delete Account Permanently
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p className="text-xs text-blue-300">
          💡 Your preferences are saved automatically and synced across all your devices.
        </p>
      </div>
    </div>
  );
}