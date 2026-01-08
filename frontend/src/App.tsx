import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoginPage from './components/Auth/LoginPage';
import DashboardLayout from './components/Layout/DashboardLayout';
import Market from './components/Market/Market';
import Portfolio from './components/Portfolio/Portfolio';
import AIStudio from './components/AIStudio/AIStudio';
import GoldAIAssistantPage from './components/GoldAIAssistant/GoldAIAssistantPage';
import Profile from './components/Profile/Profile';
import MarketNews from './components/News/MarketNews';
import LandingPage from './components/Landing/LandingPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/gold-ai-assistant"
            element={
              <ProtectedRoute>
                <GoldAIAssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Portfolio />} />
            <Route path="market" element={<Market />} />
            <Route path="news" element={<MarketNews />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="ai-studio" element={<AIStudio />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Backwards-compatible redirects */}
          <Route path="/market" element={<Navigate to="/dashboard/market" replace />} />
          <Route path="/news" element={<Navigate to="/dashboard/news" replace />} />
          <Route path="/portfolio" element={<Navigate to="/dashboard" replace />} />
          <Route path="/ai-studio" element={<Navigate to="/dashboard/ai-studio" replace />} />
          <Route path="/dashboard/ai-studio/gold-ai-assistant" element={<Navigate to="/gold-ai-assistant" replace />} />
          <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
