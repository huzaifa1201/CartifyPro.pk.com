
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from '../components/UI';
import { Lock, Mail, User, ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Globe } from 'lucide-react';
import { MOCK_SUPER_ADMIN, APP_NAME } from '../constants';

export const AuthPage: React.FC = () => {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', country: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear messages when user types to provide immediate "reset" of feedback
    if (error) setError('');
    if (successMsg) setSuccessMsg('');
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const email = formData.email.trim();
    const name = formData.name.trim();

    // --- Validation Logic ---

    // 1. Email Format
    if (!email) {
      setError('Email is required.');
      setLoading(false);
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address (e.g., user@example.com).');
      setLoading(false);
      return;
    }

    // 2. Password & Name Checks
    if (view === 'register') {
      if (!name) {
        setError('Please enter your full name.');
        setLoading(false);
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
      if (!formData.country) {
        setError("Please select your country.");
        setLoading(false);
        return;
      }
    } else if (view === 'login') {
      if (!formData.password) {
        setError('Please enter your password.');
        setLoading(false);
        return;
      }
    }

    // --- API Calls ---

    try {
      if (view === 'login') {
        await login(email, formData.password);
        setSuccessMsg('Login successful! Redirecting...');
        // Delay redirect slightly to show success message
        setTimeout(() => {
          navigate('/');
        }, 1500);

      } else if (view === 'register') {
        await register(name, email, formData.password, formData.country);
        setSuccessMsg('Account created successfully! A verification email has been sent to your inbox.');
        // Clear form and switch to login
        setFormData({ ...formData, password: '', confirmPassword: '' });
        setTimeout(() => {
          setView('login');
          setSuccessMsg('Please verify your email and sign in.');
        }, 2000);

      } else if (view === 'forgot') {
        await resetPassword(email);
        setSuccessMsg(`Password reset instructions have been sent to ${email}.`);
      }
    } catch (err: any) {
      // Clean up error message
      let msg = err.message || 'An error occurred. Please try again.';
      if (msg.includes('Firebase:')) {
        msg = msg.replace('Firebase:', '').replace('Error', '').replace(/\(.*\)/, '').trim();
      }
      // Handle specific auth error codes for better UX
      if (msg.includes('auth/invalid-credential')) msg = "Incorrect email or password.";
      if (msg.includes('auth/user-not-found')) msg = "No account found with this email.";

      setError(msg);
    } finally {
      if (view !== 'login') {
        // Keep loading state true for login to prevent flickering before redirect
        setLoading(false);
      } else if (error) {
        setLoading(false);
      }
    }
  };

  // Helper to check if a specific field has an error context
  const hasError = (field: string) => {
    return error.toLowerCase().includes(field);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-gray-50 dark:bg-[#0f172a] px-4">
      <Card className="w-full max-w-md p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">

        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center text-white relative">
          {view !== 'login' && (
            <button
              onClick={() => { setView('login'); setError(''); setSuccessMsg(''); setFormData(prev => ({ ...prev, password: '', confirmPassword: '' })) }}
              className="absolute left-4 top-4 p-2 rounded-full hover:bg-white/20 transition-colors"
              title="Back to Login"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="text-3xl font-bold mb-2 tracking-tight">
            {view === 'login' && 'Welcome Back'}
            {view === 'register' && 'Join CartifyPro'}
            {view === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-blue-100 opacity-90 text-sm">
            {view === 'login' && 'Sign in to access your account'}
            {view === 'register' && 'Create your account to start shopping'}
            {view === 'forgot' && 'Enter your email to recover access'}
          </p>
        </div>

        {/* Form Section */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Register Name Field */}
            {view === 'register' && (
              <div className="relative group">
                <User className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <Input
                  name="name"
                  placeholder="Full Name"
                  className={`pl-10 h-12 ${hasError('name') ? 'border-red-300 focus:ring-red-200' : ''}`}
                  value={formData.name}
                  onChange={handleInputChange}
                  containerClassName="mb-0"
                />
              </div>
            )}

            {/* Country Dropdown (Register Only) */}
            {view === 'register' && (
              <div className="relative group">
                <Globe className="absolute left-3 top-3.5 transition-colors text-gray-400 group-focus-within:text-blue-500" size={18} />
                <select
                  name="country"
                  className={`w-full pl-10 h-12 bg-white dark:bg-slate-900 border text-gray-900 dark:text-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer ${hasError('country') ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 dark:border-slate-800'}`}
                  value={formData.country}
                  onChange={handleInputChange}
                >
                  <option value="" disabled>Select your Country</option>
                  <option value="Pakistan">Pakistan</option>
                  <option value="India">India</option>
                  <option value="UAE">UAE (Dubai)</option>
                </select>
                <div className="absolute right-3 top-4 pointer-events-none text-gray-400">
                  <ArrowRight size={14} className="rotate-90" />
                </div>
              </div>
            )}

            {/* Email Field (All Views) */}
            <div className="relative group">
              <Mail className={`absolute left-3 top-3.5 transition-colors ${hasError('email') ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} size={18} />
              <Input
                name="email"
                type="email"
                placeholder="Email Address"
                className={`pl-10 h-12 ${hasError('email') ? 'border-red-500/50 bg-red-50/50 dark:bg-red-900/10 text-red-900 dark:text-red-200 placeholder:text-red-300' : ''}`}
                value={formData.email}
                onChange={handleInputChange}
                containerClassName="mb-0"
              />
            </div>

            {/* Password Fields (Login & Register ONLY) */}
            {view !== 'forgot' && (
              <>
                <div className="relative group">
                  <Lock className={`absolute left-3 top-3.5 transition-colors ${hasError('password') ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} size={18} />
                  <Input
                    name="password"
                    type="password"
                    placeholder="Password"
                    className={`pl-10 h-12 ${hasError('password') ? 'border-red-500/50 bg-red-50/50 dark:bg-red-900/10 text-red-900 dark:text-red-200 placeholder:text-red-300' : ''}`}
                    value={formData.password}
                    onChange={handleInputChange}
                    containerClassName="mb-0"
                  />
                </div>

                {view === 'login' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setError(''); setSuccessMsg(''); }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Confirm Password (Register Only) */}
            {view === 'register' && (
              <div className="relative group">
                <Lock className={`absolute left-3 top-3.5 transition-colors ${hasError('match') ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} size={18} />
                <Input
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm Password"
                  className={`pl-10 h-12 ${hasError('match') ? 'border-red-300 focus:ring-red-200 bg-red-50' : ''}`}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  containerClassName="mb-0"
                />
              </div>
            )}

            {/* Feedback Messages */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-start gap-3 border border-red-100 dark:border-red-900/30 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm rounded-xl flex items-start gap-3 border border-green-100 dark:border-green-900/30 animate-in fade-in slide-in-from-top-2">
                <CheckCircle size={18} className="shrink-0 mt-0.5" />
                <span className="text-left font-semibold">{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" className={`w-full h-12 text-lg shadow-lg ${successMsg ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'shadow-blue-200'}`} isLoading={loading} disabled={!!successMsg && view === 'login'}>
              {successMsg && view === 'login' ? 'Success!' : (view === 'forgot' ? 'Send Reset Link' : (view === 'login' ? 'Sign In' : 'Create Account'))}
              {view !== 'forgot' && !successMsg && <ArrowRight size={18} />}
            </Button>
          </form>

          {/* Footer / Toggle View */}
          <div className="mt-8 text-center border-t border-gray-100 dark:border-slate-800 pt-6">
            {view === 'login' ? (
              <p className="text-gray-600 dark:text-gray-400">
                Don't have an account? <br />
                <button onClick={() => { setView('register'); setError(''); setSuccessMsg(''); }} className="text-blue-600 dark:text-blue-400 font-bold hover:underline mt-1">
                  Register for free
                </button>
              </p>
            ) : view === 'register' ? (
              <p className="text-gray-600 dark:text-gray-400">
                Already have an account? <br />
                <button onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }} className="text-blue-600 dark:text-blue-400 font-bold hover:underline mt-1">
                  Sign in here
                </button>
              </p>
            ) : (
              <button onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }} className="text-gray-500 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200">
                Back to Login
              </button>
            )}

            {/* Developer Hint Removed */}
          </div>
        </div>
      </Card>
    </div>
  );
};
