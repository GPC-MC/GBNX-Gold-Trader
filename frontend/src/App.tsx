import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoginPage from './components/Auth/LoginPage';
import Navbar from './components/Layout/Navbar';
import Market from './components/Market/Market';
import Portfolio from './components/Portfolio/Portfolio';
import AIStudio from './components/AIStudio/AIStudio';
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
              <div className="min-h-screen" style={{ backgroundColor: '#0B1220' }}>
                <Navbar />
                <Routes>
                  <Route path="/" element={<Portfolio />} />
                  <Route path="/market" element={<Market />} />
                  <Route path="/news" element={<MarketNews />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/ai-studio" element={<AIStudio />} />
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