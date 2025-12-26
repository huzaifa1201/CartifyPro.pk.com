import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUpdateProfile } from '../services/api';
import { Card, Button, Input } from '../components/UI';
import { User, Lock, Mail, Save, Globe, ArrowRight } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    country: user?.country || '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await apiUpdateProfile(user.uid, {
        name: formData.name,
        country: formData.country
      });
      alert("Profile updated successfully!");
      if (formData.password) {
        alert("Password updated (simulated).");
      }
    } catch (e) {
      alert("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile Settings</h1>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-3xl mb-3">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-full">{user?.role.toUpperCase()}</p>
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-9 text-gray-400" size={18} />
            <Input
              label="Email Address"
              value={user?.email}
              disabled
              className="pl-10 bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-500 cursor-not-allowed border-gray-200 dark:border-slate-700"
            />
          </div>

          {/* Country Selection */}
          <div className="relative">
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Country</label>
            <div className="relative">
              <Globe className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <select
                className="w-full pl-10 h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                required
              >
                <option value="" disabled>Select your Country</option>
                <option value="Pakistan">Pakistan</option>
                <option value="India">India</option>
                <option value="UAE">UAE (Dubai)</option>
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-gray-400">
                <ArrowRight size={14} className="rotate-90" />
              </div>
            </div>
          </div>

          <div className="relative">
            <User className="absolute left-3 top-9 text-gray-400" size={18} />
            <Input
              label="Full Name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="pl-10"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-9 text-gray-400" size={18} />
            <Input
              label="New Password"
              type="password"
              placeholder="Leave blank to keep current"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="pl-10"
            />
          </div>

          <Button type="submit" className="w-full shadow-lg shadow-blue-500/20" isLoading={loading}>
            <Save size={18} className="mr-2" /> Save Changes
          </Button>
        </form>
      </Card>
    </div>
  );
};
