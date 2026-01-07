import React, { useState } from 'react';
import { Bot, Sparkles, BarChart3 } from 'lucide-react';
import AIAssistant from '../AIAssistant/AIAssistant';

type StudioFeature = 'gold-ai' | 'analytics' | 'insights';

const AIStudio: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<StudioFeature>('gold-ai');

  const features = [
    { id: 'gold-ai' as StudioFeature, icon: Bot, label: 'GoldAI Assistant', description: 'Chat with AI for trading insights' },
    { id: 'analytics' as StudioFeature, icon: BarChart3, label: 'AI Analytics', description: 'Coming Soon' },
    { id: 'insights' as StudioFeature, icon: Sparkles, label: 'Smart Insights', description: 'Coming Soon' }
  ];

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0B1220' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI Studio Header */}
        <div className="border rounded-2xl mb-8" style={{ backgroundColor: '#121826', borderColor: 'rgba(212, 175, 55, 0.15)', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: '#E5E7EB' }}>AI Studio</h1>
              <p className="text-lg" style={{ color: '#6B7280' }}>Powerful AI tools for intelligent trading</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium mb-1" style={{ color: '#6B7280', letterSpacing: '0.03em' }}>CURRENT GOLD PRICE</div>
              <div className="font-semibold text-xl" style={{ color: '#16A34A' }}>
                $2,345 <span className="text-sm" style={{ color: '#9CA3AF' }}>+0.8%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Tabs */}
        <div className="border rounded-2xl mb-8 p-6" style={{ backgroundColor: '#121826', borderColor: 'rgba(212, 175, 55, 0.15)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map(({ id, icon: Icon, label, description }) => (
              <button
                key={id}
                onClick={() => setActiveFeature(id)}
                className="p-5 rounded-xl border transition-all duration-200 text-left"
                style={{
                  backgroundColor: activeFeature === id ? 'rgba(212, 175, 55, 0.15)' : '#161E2E',
                  borderColor: activeFeature === id ? '#D4AF37' : 'rgba(212, 175, 55, 0.2)',
                  boxShadow: activeFeature === id ? '0 0 20px rgba(212, 175, 55, 0.3)' : 'none'
                }}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: activeFeature === id ? 'rgba(212, 175, 55, 0.2)' : 'rgba(156, 163, 175, 0.1)'
                    }}
                  >
                    <Icon
                      size={24}
                      style={{ color: activeFeature === id ? '#D4AF37' : '#9CA3AF' }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3
                      className="font-semibold text-lg"
                      style={{ color: activeFeature === id ? '#D4AF37' : '#E5E7EB' }}
                    >
                      {label}
                    </h3>
                  </div>
                </div>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Feature Content */}
        <div>
          {activeFeature === 'gold-ai' && <GoldAIAssistantFeature />}
          {activeFeature === 'analytics' && <ComingSoonFeature title="AI Analytics" />}
          {activeFeature === 'insights' && <ComingSoonFeature title="Smart Insights" />}
        </div>
      </div>
    </div>
  );
};

// GoldAI Assistant Feature - Wrapper for the existing AIAssistant
const GoldAIAssistantFeature: React.FC = () => {
  return (
    <div>
      <AIAssistant />
    </div>
  );
};

// Coming Soon Placeholder
const ComingSoonFeature: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div
      className="rounded-2xl p-12 text-center border"
      style={{
        backgroundColor: '#121826',
        borderColor: 'rgba(212, 175, 55, 0.15)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
      }}
    >
      <Sparkles size={64} className="mx-auto mb-4" style={{ color: '#6B7280' }} />
      <h2 className="text-2xl font-bold mb-2" style={{ color: '#E5E7EB' }}>{title}</h2>
      <p className="text-lg" style={{ color: '#6B7280' }}>
        This feature is coming soon. Stay tuned for powerful AI-driven insights!
      </p>
    </div>
  );
};

export default AIStudio;
