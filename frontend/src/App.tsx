import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoginPage from './components/Auth/LoginPage';
import Navbar from './components/Layout/Navbar';
import Market from './components/Market/Market';
import Portfolio from './components/Portfolio/Portfolio';
import AIAssistant from './components/AIAssistant/AIAssistant';
import Profile from './components/Profile/Profile';
import MarketNews from './components/News/MarketNews';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-900">
                <Navbar />
                <Routes>
                  <Route path="/" element={<Portfolio />} />
                  <Route path="/market" element={<Market />} />
                  <Route path="/news" element={<MarketNews />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/ai-assistant" element={<AIAssistant />} />
                  <Route path="/profile" element={<Profile />} />
                </Routes>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;