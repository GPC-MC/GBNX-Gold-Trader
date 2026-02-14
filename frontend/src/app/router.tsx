import React from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from '../components/Auth/ProtectedRoute';
import DashboardLayout from '../components/Layout/DashboardLayout';
import DashboardHome from '../components/Dashboard/DashboardHome';
import Market from '../components/Market/Market';
import Portfolio from '../components/Portfolio/Portfolio';
import AIStudio from '../components/AIStudio/AIStudio';
import TradePage from '../components/Transactions/TradePage';
import BalancesPage from '../components/Transactions/BalancesPage';
import GoldAIAssistantPage from '../components/GoldAIAssistant/GoldAIAssistantPage';
import MarketAnalystAgentPage from '../components/MarketAnalystAgent/MarketAnalystAgentPage';
import TechnicalAnalystAgentPage from '../components/TechnicalAnalystAgent/TechnicalAnalystAgentPage';
import RiskManagerAgentPage from '../components/RiskManagerAgent/RiskManagerAgentPage';
import KnowledgeBaseAgentPage from '../components/KnowledgeBaseAgent/KnowledgeBaseAgentPage';
import SentimentAnalysisAgentPage from '../components/SentimentAnalysisAgent/SentimentAnalysisAgentPage';
import Profile from '../components/Profile/Profile';
import MarketNews from '../components/News/MarketNews';
import LandingPage from '../components/Landing/LandingPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/gold-ai-assistant',
    element: (
      <ProtectedRoute>
        <GoldAIAssistantPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/market-analyst-agent',
    element: (
      <ProtectedRoute>
        <MarketAnalystAgentPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/technical-analyst-agent',
    element: (
      <ProtectedRoute>
        <TechnicalAnalystAgentPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/risk-manager-agent',
    element: (
      <ProtectedRoute>
        <RiskManagerAgentPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/knowledge-base-agent',
    element: (
      <ProtectedRoute>
        <KnowledgeBaseAgentPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/sentiment-analysis-agent',
    element: (
      <ProtectedRoute>
        <SentimentAnalysisAgentPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardHome /> },
      { path: 'market', element: <Market /> },
      { path: 'news', element: <MarketNews /> },
      { path: 'portfolio', element: <Portfolio /> },
      { path: 'trade', element: <TradePage /> },
      { path: 'balances', element: <BalancesPage /> },
      { path: 'ai-studio', element: <AIStudio /> },
      { path: 'profile', element: <Profile /> },
    ],
  },

  // Backwards-compatible redirects
  { path: '/market', element: <Navigate to="/dashboard/market" replace /> },
  { path: '/news', element: <Navigate to="/dashboard/news" replace /> },
  { path: '/portfolio', element: <Navigate to="/dashboard/portfolio" replace /> },
  { path: '/trade', element: <Navigate to="/dashboard/trade" replace /> },
  { path: '/balances', element: <Navigate to="/dashboard/balances" replace /> },
  { path: '/ai-studio', element: <Navigate to="/dashboard/ai-studio" replace /> },
  {
    path: '/dashboard/ai-studio/gold-ai-assistant',
    element: <Navigate to="/gold-ai-assistant" replace />,
  },
  { path: '/profile', element: <Navigate to="/dashboard/profile" replace /> },

  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
