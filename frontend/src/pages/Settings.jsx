import { useState, useEffect } from 'react';
import { useAuthStore, useThemeStore } from '../store';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, updatePreferences } = useAuthStore();
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
    try {
      const updatedPrefs = { ...preferences, [key]: value };
      await updatePreferences(updatedPrefs);
      setPreferences(updatedPrefs);
      toast.success('Settings updated successfully!');
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeToggle = () => {
    toggleTheme();
    handlePreferenceChange('theme', theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Customize your experience</p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Appearance */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
            <h2 className="text-xl font-bold text-white mb-6">Appearance</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-slate-700">
                <div>
                  <h3 className="text-lg font-semibold text-white">Dark Mode</h3>
                  <p className="text-sm text-slate-400 mt-1">Toggle between light and dark themes</p>
                </div>
                <button
                  onClick={handleThemeToggle}
                  disabled={isLoading}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    theme === 'dark' ? 'bg-purple-600' : 'bg-slate-600'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      theme === 'dark' ? 'translate-x-1' : 'translate-x-7'
                    }`}
                  />
                </button>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Theme Preference</h3>
                <div className="space-y-3">
                  {[
                    { value: 'light', label: '☀️ Light', desc: 'Light theme for bright environments' },
                    { value: 'dark', label: '🌙 Dark', desc: 'Dark theme for comfortable viewing' },
                    { value: 'system', label: '🖥️ System', desc: 'Follow system preferences' }
                  ].map(option => (
                    <label key={option.value} className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <input
                        type="radio"
                        name="theme"
                        value={option.value}
                        checked={preferences.theme === option.value}
                        onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                        disabled={isLoading}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="text-white font-medium">{option.label}</p>
                        <p className="text-xs text-slate-400">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Interaction */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
            <h2 className="text-xl font-bold text-white mb-6">AI Interaction</h2>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Explanation Level</h3>
              <p className="text-sm text-slate-400 mb-4">Choose how detailed AI explanations should be</p>
              <div className="space-y-3">
                {[
                  { value: 'beginner', label: '👶 Beginner', desc: 'Simple explanations for basics' },
                  { value: 'intermediate', label: '📚 Intermediate', desc: 'Balanced explanations (Recommended)' },
                  { value: 'detailed', label: '🧑‍🎓 Detailed', desc: 'In-depth technical explanations' }
                ].map(option => (
                  <label key={option.value} className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                    <input
                      type="radio"
                      name="explainMode"
                      value={option.value}
                      checked={preferences.explainMode === option.value}
                      onChange={(e) => handlePreferenceChange('explainMode', e.target.value)}
                      disabled={isLoading}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-white font-medium">{option.label}</p>
                      <p className="text-xs text-slate-400">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
            <h2 className="text-xl font-bold text-white mb-6">Notifications</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Enable Notifications</h3>
                  <p className="text-sm text-slate-400 mt-1">Get alerts for important updates and messages</p>
                </div>
                <button
                  onClick={() => handlePreferenceChange('notifications', !preferences.notifications)}
                  disabled={isLoading}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    preferences.notifications ? 'bg-purple-600' : 'bg-slate-600'
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
                <div className="bg-slate-700/50 rounded-lg p-4 text-sm text-slate-300">
                  <p className="mb-2 font-medium">You'll receive notifications for:</p>
                  <ul className="space-y-1 text-xs">
                    <li>✓ Answers to your queries</li>
                    <li>✓ Mentions and comments</li>
                    <li>✓ Important announcements</li>
                    <li>✓ Activity updates</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
            <h2 className="text-xl font-bold text-white mb-6">Privacy & Security</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                <div>
                  <h3 className="text-lg font-semibold text-white">Change Password</h3>
                  <p className="text-sm text-slate-400 mt-1">Update your account password regularly</p>
                </div>
                <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                  Change
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Two-Factor Authentication</h3>
                  <p className="text-sm text-slate-400 mt-1">Add an extra layer of security</p>
                </div>
                <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                  Enable
                </button>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
            <h2 className="text-xl font-bold text-white mb-6">Account</h2>
            
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-left font-medium">
                📥 Download Your Data
              </button>
              <button className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-left font-medium">
                🔒 Deactivate Account
              </button>
              <button className="w-full px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-left font-medium">
                ⚠️ Delete Account Permanently
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 Your preferences are saved automatically and synced across all your devices.
          </p>
        </div>
      </div>
    </div>
  );
}
