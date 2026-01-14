import React, { useState } from 'react';
import { X, Mail, Lock, User, Chrome } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'signup';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Mock authentication - check for admin/admin
    if (username === 'admin' && password === 'admin') {
      const userData = {
        id: 'admin-user',
        name: 'Admin User',
        email: 'admin@goldtrader.ai',
        picture: 'https://ui-avatars.com/api/?name=Admin+User&background=D4AF37&color=0B1220&bold=true'
      };
      login(userData);
      setIsLoading(false);
      onClose();
      navigate('/dashboard');
    } else {
      setIsLoading(false);
      setError('Invalid username or password. Use admin/admin for demo.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Mock signup - just create the user
    setIsLoading(true);
    const userData = {
      id: `user-${Date.now()}`,
      name: username,
      email: `${username}@goldtrader.ai`,
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=D4AF37&color=0B1220&bold=true`
    };

    setTimeout(() => {
      login(userData);
      setIsLoading(false);
      onClose();
      navigate('/dashboard');
    }, 500);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (window.gapi && window.gapi.auth2) {
        const authInstance = window.gapi.auth2.getAuthInstance();
        if (authInstance) {
          const googleUser = await authInstance.signIn();
          const profile = googleUser.getBasicProfile();
          const userData = {
            id: profile.getId(),
            name: profile.getName(),
            email: profile.getEmail(),
            picture: profile.getImageUrl()
          };
          login(userData);
          onClose();
          navigate('/dashboard');
          return;
        }
      }

      // Fallback if Google API is not available
      setError('Google sign-in is not available. Please use account login.');
    } catch (err) {
      setError('Google sign-in failed. Please try again or use account login.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const switchMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[#0B1220] border border-[#D4AF37]/20 rounded-2xl shadow-[0_0_60px_rgba(212,175,55,0.15)] overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-[#D4AF37]/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-white/5"
          >
            <X size={20} />
          </button>

          <div className="text-center">
            <div className="text-sm font-semibold tracking-[0.18em] text-[#D4AF37] mb-2">
              GOLD AI PLATFORM
            </div>
            <h2 className="text-xl font-bold text-white">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {mode === 'login'
                ? 'Sign in to access your dashboard'
                : 'Join Gold AI Platform today'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium transition hover:bg-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Chrome size={20} className="text-[#D4AF37]" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#D4AF37]/10" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-[#D4AF37]/10" />
          </div>

          {/* Account Login/Signup Form */}
          <form onSubmit={mode === 'login' ? handleAccountLogin : handleSignup}>
            {/* Username Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition"
                />
              </div>
            </div>

            {/* Confirm Password (Signup only) */}
            {mode === 'signup' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition"
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Demo Hint (Login only) */}
            {mode === 'login' && (
              <div className="mb-4 p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg text-[#F2D27C] text-sm">
                Demo: Use <span className="font-semibold">admin</span> / <span className="font-semibold">admin</span> to login
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#F2D27C] rounded-xl text-[#0B1220] font-semibold transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_30px_rgba(212,175,55,0.2)]"
            >
              {isLoading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Mode Switch */}
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-400">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              className="text-[#D4AF37] hover:text-[#F2D27C] font-medium transition"
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
