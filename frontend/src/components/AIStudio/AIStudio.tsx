import React from 'react';
import { Activity, BarChart3, BookOpen, Bot, ChevronRight, ShieldAlert, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const AIStudio: React.FC = () => {
  const agents: AgentCard[] = [
    {
      id: 'gold-ai-assistant',
      icon: Bot,
      avatarFile: 'uifaces-abstract-avatar (1).jpg',
      label: 'GoldAI Assistant',
      description: 'Chat with AI for trading insights'
    },
    {
      id: 'market-analyst-agent',
      icon: BarChart3,
      avatarFile: 'uifaces-abstract-avatar (2).jpg',
      label: 'Market Analyst Agent',
      description: 'Market overview and macro signals'
    },
    {
      id: 'technical-analyst-agent',
      icon: Activity,
      avatarFile: 'uifaces-abstract-avatar (3).jpg',
      label: 'Technical Analyst Agent',
      description: 'Indicators, trends, and setups'
    },
    {
      id: 'risk-manager-agent',
      icon: ShieldAlert,
      avatarFile: 'uifaces-abstract-avatar (4).jpg',
      label: 'Risk Manager Agent',
      description: 'Position sizing and risk checks'
    },
    {
      id: 'knowledge-base-agent',
      icon: BookOpen,
      avatarFile: 'uifaces-abstract-avatar (5).jpg',
      label: 'Knowledge Base Agent',
      description: 'Search and summarize your docs'
    },
    {
      id: 'sentiment-analysis-agent',
      icon: TrendingUp,
      avatarFile: 'uifaces-abstract-avatar (6).jpg',
      label: 'Sentiment Analysis Agent',
      description: 'Analyze market sentiment from text'
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
          {agents.map(({ id, icon: Icon, avatarFile, label, description }, index) => {
            const isHero = index === 0;
            const card = (
              <div className="group p-6 rounded-2xl border border-gold-500/10 bg-ink-800/55 text-center transform-gpu transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-gold-500/25 hover:bg-ink-800/65 hover:shadow-[0_12px_26px_rgba(0,0,0,0.35)]">
                <div
                  className={`
                    relative mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full 
                    border-2 border-gold-500/20 bg-gradient-to-br from-gold-500/10 to-transparent p-1
                    transition-[transform,box-shadow,border-color] duration-300 ease-out 
                    group-hover:scale-105 group-hover:border-gold-500/40 
                    ${isHero ? 'shadow-[0_0_25px_rgba(212,175,55,0.5)]' : 'shadow-none group-hover:shadow-glow'}
                  `}
                >
                  <img
                    src={`/avatars/${encodeURIComponent(avatarFile)}`}
                    alt={`${label} avatar`}
                    loading="lazy"
                    className="h-full w-full rounded-full object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-gold-500/25 bg-ink-900/80 backdrop-blur-sm transition-[border-color,transform] duration-200 ease-out group-hover:border-gold-500/45 group-hover:scale-105">
                    <Icon size={14} className="text-gold-300" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="font-semibold text-base text-white">{label}</h3>
                <p className="mt-2 text-sm text-gray-400">{description}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold-300">
                  Open <ChevronRight size={16} />
                </div>
              </div>
            );

            return (
              <Link
                key={id}
                to={`/${id}`}
                className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20"
              >
                {card}
              </Link>
            );
          })}
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
  | 'knowledge-base-agent'
  | 'sentiment-analysis-agent';

type AgentCard = {
  id: AgentId;
  icon: React.ElementType;
  avatarFile: string;
  label: string;
  description: string;
};

export default AIStudio;
