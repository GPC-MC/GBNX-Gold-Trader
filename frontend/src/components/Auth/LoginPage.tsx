import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, Shield, BarChart3, Zap } from 'lucide-react';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Load Google API
    const loadGoogleAPI = () => {
      if (window.gapi) {
        initializeGoogleSignIn();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('auth2', initializeGoogleSignIn);
      };
      document.body.appendChild(script);
    };

    const initializeGoogleSignIn = () => {
      window.gapi.auth2.init({
        client_id: '519098945876-n9j606pa1lle3cjnk2jfeiqbfosolvoi.apps.googleusercontent.com', // Replace with actual client ID
      });
    };

    loadGoogleAPI();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      if (!window.gapi || !window.gapi.auth2) {
        alert('Google API not loaded. Please try again.');
        return;
      }

      const authInstance = window.gapi.auth2.getAuthInstance();
      const googleUser = await authInstance.signIn();
      const profile = googleUser.getBasicProfile();

      const userData = {
        id: profile.getId(),
        name: profile.getName(),
        email: profile.getEmail(),
        picture: profile.getImageUrl()
      };

      login(userData);
    } catch (error) {
      console.error('Google login error:', error);
      // For demo purposes, create a mock user
      const mockUser = {
        id: 'demo-user',
        name: 'Demo Trader',
        email: 'demo@goldtrader.ai',
        picture: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
      };
      login(mockUser);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-yellow-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      icon: TrendingUp,
      title: 'Real-time Gold Prices',
      description: 'Live market data and price tracking'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Technical indicators and chart analysis'
    },
    {
      icon: Shield,
      title: 'Risk Management',
      description: 'Smart risk assessment and alerts'
    },
    {
      icon: Zap,
      title: 'AI-Powered Insights',
      description: 'Intelligent trading recommendations'
    }
  ];

  return (
    <div className="min-h-screen text-white">
      <div className="flex min-h-screen">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 p-12 flex-col justify-center">
          <div className="max-w-md">
            <div className="text-yellow-400 font-bold text-4xl mb-6">
              ⚡ GoldTrader AI
            </div>
            <h1 className="text-4xl font-bold text-white mb-6">
              Professional Gold Trading Platform
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Make smarter trading decisions with AI-powered insights and real-time market analysis.
            </p>
            
            <div className="space-y-4">
              {features.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex items-start space-x-3">
                  <div className="bg-yellow-500/20 p-2 rounded-lg">
                    <Icon className="text-yellow-400" size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{title}</div>
                    <div className="text-sm text-gray-400">{description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Login */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="lg:hidden text-yellow-400 font-bold text-3xl mb-4">
                ⚡ GoldTrader AI
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-gray-400">Sign in to access your trading dashboard</p>
            </div>

            <div className="bg-gray-800/90 rounded-2xl p-8 border border-gray-700/80 backdrop-blur-sm">
              <button
                onClick={handleGoogleLogin}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-4 px-6 rounded-xl transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-3 shadow-lg"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-400">
                  By signing in, you agree to our{' '}
                  <a href="#" className="text-yellow-400 hover:text-yellow-300">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-yellow-400 hover:text-yellow-300">Privacy Policy</a>
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <div className="text-sm text-gray-400 mb-4">Demo Features Available:</div>
              <div className="flex justify-center space-x-6 text-xs text-gray-500">
                <span>✓ Live Charts</span>
                <span>✓ AI Assistant</span>
                <span>✓ Portfolio Tracking</span>
                <span>✓ Risk Analysis</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
