import React from 'react';
import { Activity, BarChart3, BookOpen, Bot, ShieldAlert } from 'lucide-react';

const AIStudio: React.FC = () => {
  const agents: AgentCard[] = [
    {
      id: 'gold-ai-assistant',
      icon: Bot,
      label: 'GoldAI Assistant',
      description: 'Chat with AI for trading insights'
    },
    {
      id: 'market-analyst-agent',
      icon: BarChart3,
      label: 'Market Analyst Agent',
      description: 'Market overview and macro signals'
    },
    {
      id: 'technical-analyst-agent',
      icon: Activity,
      label: 'Technical Analyst Agent',
      description: 'Indicators, trends, and setups'
    },
    {
      id: 'risk-manager-agent',
      icon: ShieldAlert,
      label: 'Risk Manager Agent',
      description: 'Position sizing and risk checks'
    },
    {
      id: 'knowledge-base-agent',
      icon: BookOpen,
      label: 'Knowledge Base Agent',
      description: 'Search and summarize your docs'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6 mb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-[0.18em] text-gold-500">AI STUDIO</div>
            <h1 className="mt-2 text-3xl font-bold text-white">AI Studio</h1>
            <p className="mt-2 text-sm text-gray-400">Agent gallery (you can wire each agent later).</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(({ id, icon: Icon, label, description }) => (
            <div
              key={id}
              className="p-6 rounded-2xl border border-gold-500/10 bg-ink-800/55 hover:border-gold-500/20 hover:bg-ink-800/65 transition-all duration-200 text-center"
            >
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-gold-500/20 bg-gold-500/10 shadow-glow">
                <Icon size={30} className="text-gold-200" />
              </div>
              <h3 className="font-semibold text-base text-white">{label}</h3>
              <p className="mt-2 text-sm text-gray-400">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

type AgentId =
  | 'gold-ai-assistant'
  | 'market-analyst-agent'
  | 'technical-analyst-agent'
  | 'risk-manager-agent'
  | 'knowledge-base-agent';

type AgentCard = {
  id: AgentId;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  description: string;
};

export default AIStudio;
