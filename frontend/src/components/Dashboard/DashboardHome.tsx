import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import {
  Bot,
  Briefcase,
  LayoutGrid,
  Newspaper,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useGoldData } from '../../hooks/useGoldData';
import type { GoldPrice, Portfolio } from '../../types';

type WidgetId = 'price' | 'news' | 'assistant' | 'portfolio' | 'actions';

interface WidgetOption {
  id: WidgetId;
  title: string;
  description: string;
  icon: LucideIcon;
}

interface NewsArticle {
  title: string;
  source_url: string;
  source_name: string;
  market_impact?: 'bullish' | 'bearish' | 'neutral';
  impact_level?: 'high' | 'medium' | 'low';
}

const MAX_WIDGETS = 4;
const STORAGE_KEY = 'gbnx.dashboard.widgets';

const DEFAULT_WIDGETS: WidgetId[] = ['price', 'news', 'assistant', 'portfolio'];

const WIDGET_OPTIONS: WidgetOption[] = [
  {
    id: 'price',
    title: 'Live Price',
    description: 'Gold spot price, support, and volatility.',
    icon: TrendingUp
  },
  {
    id: 'news',
    title: 'Market News',
    description: 'Latest headlines and macro signals.',
    icon: Newspaper
  },
  {
    id: 'assistant',
    title: 'AI Assistant',
    description: 'Ask the assistant for strategy and risk ideas.',
    icon: Bot
  },
  {
    id: 'portfolio',
    title: 'Portfolio Snapshot',
    description: 'Positions, P&L, and total value.',
    icon: Briefcase
  },
  {
    id: 'actions',
    title: 'Quick Actions',
    description: 'Jump to your most-used screens.',
    icon: LayoutGrid
  }
];

const normalizeSelection = (raw: unknown): WidgetId[] => {
  if (!Array.isArray(raw)) {
    return DEFAULT_WIDGETS.slice(0, MAX_WIDGETS);
  }

  const allowed = new Set(WIDGET_OPTIONS.map(option => option.id));
  const unique = Array.from(new Set(raw)).filter((item): item is WidgetId => allowed.has(item));

  return unique.slice(0, MAX_WIDGETS);
};

const WidgetCard: React.FC<{
  title: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon: Icon, action, children }) => (
  <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6 flex flex-col gap-4">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl border border-gold-500/20 bg-ink-900/60 flex items-center justify-center text-gold-300">
          <Icon size={18} />
        </div>
        <div>
          <div className="text-xs font-semibold tracking-[0.2em] text-gold-500">WIDGET</div>
          <div className="text-lg font-semibold text-white">{title}</div>
        </div>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const PriceWidget: React.FC<{ goldPrice: GoldPrice }> = ({ goldPrice }) => {
  const isUp = goldPrice.change >= 0;

  return (
    <WidgetCard
      title="Gold Price"
      icon={TrendingUp}
      action={
        <Link
          to="/dashboard/market"
          className="inline-flex items-center gap-2 rounded-lg border border-gold-500/20 bg-gold-500/10 px-3 py-2 text-xs font-semibold text-gold-200 hover:bg-gold-500/20"
        >
          Open market
        </Link>
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-white">${goldPrice.current.toFixed(2)}</div>
          <div className="mt-2 text-sm text-gray-400">Spot price</div>
        </div>
        <div
          className={clsx(
            'rounded-xl border px-3 py-2 text-sm font-semibold',
            isUp
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
              : 'border-rose-400/30 bg-rose-400/10 text-rose-300'
          )}
        >
          {isUp ? '+' : ''}
          {goldPrice.change.toFixed(2)} ({isUp ? '+' : ''}
          {goldPrice.changePercent.toFixed(2)}%)
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm text-gray-300">
        <div className="rounded-xl border border-gold-500/10 bg-ink-900/50 p-3">
          <div className="text-xs text-gray-500">Support</div>
          <div className="font-semibold text-white">${goldPrice.support.toFixed(0)}</div>
        </div>
        <div className="rounded-xl border border-gold-500/10 bg-ink-900/50 p-3">
          <div className="text-xs text-gray-500">Resistance</div>
          <div className="font-semibold text-white">${goldPrice.resistance.toFixed(0)}</div>
        </div>
        <div className="rounded-xl border border-gold-500/10 bg-ink-900/50 p-3">
          <div className="text-xs text-gray-500">Volatility</div>
          <div className="font-semibold text-white">{goldPrice.volatility.toFixed(1)}%</div>
        </div>
        <div className="rounded-xl border border-gold-500/10 bg-ink-900/50 p-3">
          <div className="text-xs text-gray-500">Sentiment</div>
          <div className="font-semibold text-white">{goldPrice.sentiment}</div>
        </div>
      </div>
    </WidgetCard>
  );
};

const PortfolioWidget: React.FC<{ portfolio: Portfolio }> = ({ portfolio }) => {
  const isUp = portfolio.profitToday >= 0;

  return (
    <WidgetCard
      title="Portfolio Snapshot"
      icon={Briefcase}
      action={
        <Link
          to="/dashboard/portfolio"
          className="inline-flex items-center gap-2 rounded-lg border border-gold-500/20 bg-gold-500/10 px-3 py-2 text-xs font-semibold text-gold-200 hover:bg-gold-500/20"
        >
          View portfolio
        </Link>
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-white">${portfolio.totalValue.toLocaleString()}</div>
          <div className="mt-2 text-sm text-gray-400">Total value</div>
        </div>
        <div
          className={clsx(
            'rounded-xl border px-3 py-2 text-sm font-semibold',
            isUp
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
              : 'border-rose-400/30 bg-rose-400/10 text-rose-300'
          )}
        >
          {isUp ? '+' : ''}
          {portfolio.profitToday.toFixed(0)} ({isUp ? '+' : ''}
          {portfolio.profitTodayPercent.toFixed(1)}%)
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm text-gray-300">
        <div className="rounded-xl border border-gold-500/10 bg-ink-900/50 p-3">
          <div className="text-xs text-gray-500">Gold</div>
          <div className="font-semibold text-white">{portfolio.holdings.gold.amount} oz</div>
        </div>
        <div className="rounded-xl border border-gold-500/10 bg-ink-900/50 p-3">
          <div className="text-xs text-gray-500">ETF</div>
          <div className="font-semibold text-white">{portfolio.holdings.etf.amount} sh</div>
        </div>
        <div className="rounded-xl border border-gold-500/10 bg-ink-900/50 p-3">
          <div className="text-xs text-gray-500">Cash</div>
          <div className="font-semibold text-white">${portfolio.holdings.cash.toLocaleString()}</div>
        </div>
      </div>
    </WidgetCard>
  );
};

const AssistantWidget: React.FC = () => (
  <WidgetCard
    title="AI Assistant"
    icon={Bot}
    action={
      <Link
        to="/gold-ai-assistant"
        className="inline-flex items-center gap-2 rounded-lg border border-gold-500/20 bg-gold-500/10 px-3 py-2 text-xs font-semibold text-gold-200 hover:bg-gold-500/20"
      >
        Open assistant
      </Link>
    }
  >
    <div className="rounded-xl border border-gold-500/10 bg-ink-900/50 p-4 text-sm text-gray-300">
      Ask about price action, macro catalysts, or risk sizing. The assistant responds with strategy context.
    </div>
    <div className="grid grid-cols-1 gap-2 text-sm">
      {[
        "Summarize today's market drivers",
        'Spot key levels for gold',
        'Suggest a risk-managed entry'
      ].map(prompt => (
        <div
          key={prompt}
          className="rounded-lg border border-gold-500/10 bg-ink-900/40 px-3 py-2 text-gray-200"
        >
          {prompt}
        </div>
      ))}
    </div>
  </WidgetCard>
);

const MarketNewsWidget: React.FC = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchNews = async () => {
      try {
        const response = await fetch('https://bf1bd891617c.ngrok-free.app/latest_news', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ keyword: 'gold' })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const articles = Array.isArray(data?.articles) ? data.articles : [];

        if (isMounted) {
          setNews(articles);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        if (isMounted) {
          setNews([
            {
              title: 'Gold extends rally as macro uncertainty grows',
              source_url: 'https://www.reuters.com',
              source_name: 'reuters.com',
              market_impact: 'bullish',
              impact_level: 'high'
            },
            {
              title: 'Fed tone keeps metals bid despite stronger dollar',
              source_url: 'https://www.bloomberg.com',
              source_name: 'bloomberg.com',
              market_impact: 'neutral',
              impact_level: 'medium'
            },
            {
              title: 'ETF inflows resume as investors seek hedges',
              source_url: 'https://www.cnbc.com',
              source_name: 'cnbc.com',
              market_impact: 'bullish',
              impact_level: 'medium'
            }
          ]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchNews();

    return () => {
      isMounted = false;
    };
  }, []);

  const headlines = news.slice(0, 3);

  return (
    <WidgetCard
      title="Market News"
      icon={Newspaper}
      action={
        <Link
          to="/dashboard/news"
          className="inline-flex items-center gap-2 rounded-lg border border-gold-500/20 bg-gold-500/10 px-3 py-2 text-xs font-semibold text-gold-200 hover:bg-gold-500/20"
        >
          View news
        </Link>
      }
    >
      {loading ? (
        <div className="text-sm text-gray-400">Loading headlines...</div>
      ) : headlines.length === 0 ? (
        <div className="text-sm text-gray-400">No headlines available right now.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 text-sm">
          {headlines.map(item => (
            <a
              key={`${item.title}-${item.source_url}`}
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-gold-500/10 bg-ink-900/50 p-3 transition hover:border-gold-500/30"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-gray-100">{item.title}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-gold-500">
                  {item.impact_level || 'signal'}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">{item.source_name || 'newswire'}</div>
            </a>
          ))}
        </div>
      )}
    </WidgetCard>
  );
};

const QuickActionsWidget: React.FC = () => (
  <WidgetCard title="Quick Actions" icon={LayoutGrid}>
    <div className="grid grid-cols-2 gap-3 text-sm">
      {[
        { label: 'Market', to: '/dashboard/market', icon: TrendingUp },
        { label: 'Portfolio', to: '/dashboard/portfolio', icon: Briefcase },
        { label: 'Market News', to: '/dashboard/news', icon: Newspaper },
        { label: 'AI Studio', to: '/dashboard/ai-studio', icon: Sparkles }
      ].map(action => (
        <Link
          key={action.label}
          to={action.to}
          className="flex items-center gap-2 rounded-xl border border-gold-500/15 bg-ink-900/50 px-3 py-3 text-gray-200 hover:border-gold-500/30"
        >
          <action.icon size={16} className="text-gold-300" />
          <span className="font-semibold">{action.label}</span>
        </Link>
      ))}
    </div>
    <div className="rounded-xl border border-gold-500/10 bg-ink-900/40 p-3 text-xs text-gray-400">
      Customize this board to surface the widgets you watch most often.
    </div>
  </WidgetCard>
);

const DashboardHome: React.FC = () => {
  const { goldPrice, portfolio } = useGoldData();
  const [selectedWidgets, setSelectedWidgets] = useState<WidgetId[]>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_WIDGETS;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return normalizeSelection(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error reading widget preferences:', error);
    }

    return DEFAULT_WIDGETS;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedWidgets));
  }, [selectedWidgets]);

  const widgetMap = useMemo(
    () => ({
      price: <PriceWidget goldPrice={goldPrice} />,
      news: <MarketNewsWidget />,
      assistant: <AssistantWidget />,
      portfolio: <PortfolioWidget portfolio={portfolio} />,
      actions: <QuickActionsWidget />
    }),
    [goldPrice, portfolio]
  );

  const isLimitReached = selectedWidgets.length >= MAX_WIDGETS;

  const handleToggleWidget = (id: WidgetId) => {
    setSelectedWidgets(prev => {
      if (prev.includes(id)) {
        return prev.filter(widget => widget !== id);
      }
      if (prev.length >= MAX_WIDGETS) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleReset = () => {
    setSelectedWidgets(DEFAULT_WIDGETS.slice(0, MAX_WIDGETS));
  };

  const widgetGridCols = selectedWidgets.length <= 1 ? 'lg:grid-cols-1' : 'lg:grid-cols-2';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-gold-500">CUSTOM DASHBOARD</div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-400">
            Choose up to {MAX_WIDGETS} widgets to customize your view.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-gold-500/15 bg-ink-850/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-gold-500">
            {selectedWidgets.length}/{MAX_WIDGETS} selected
          </div>
          <button
            onClick={handleReset}
            className="rounded-xl border border-gold-500/20 bg-ink-900/50 px-4 py-2 text-xs font-semibold text-gray-200 hover:border-gold-500/30 hover:text-white"
          >
            Reset to default
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-gold-500/15 bg-ink-900/40 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Widget library</div>
            <div className="text-xs text-gray-400">Tap a tile to add or remove a widget.</div>
          </div>
          {isLimitReached && (
            <div className="text-xs font-semibold text-gold-300">
              Limit reached. Remove one to add another.
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WIDGET_OPTIONS.map(option => {
            const isSelected = selectedWidgets.includes(option.id);
            const isDisabled = !isSelected && isLimitReached;
            const Icon = option.icon;

            return (
              <button
                key={option.id}
                onClick={() => handleToggleWidget(option.id)}
                disabled={isDisabled}
                className={clsx(
                  'flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition',
                  isSelected
                    ? 'border-gold-500/40 bg-gold-500/10 shadow-[0_0_20px_-10px_rgba(212,175,55,0.5)]'
                    : 'border-gold-500/10 bg-ink-900/40 hover:border-gold-500/30',
                  isDisabled && 'cursor-not-allowed opacity-60'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg border border-gold-500/20 bg-ink-900/60 text-gold-300">
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{option.title}</div>
                    <div className="text-xs text-gray-400">{option.description}</div>
                  </div>
                </div>
                <div
                  className={clsx(
                    'rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]',
                    isSelected
                      ? 'bg-gold-500/20 text-gold-200'
                      : 'bg-ink-900/60 text-gray-400'
                  )}
                >
                  {isSelected ? 'Selected' : 'Add'}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className={clsx('grid gap-6', widgetGridCols)}>
        {selectedWidgets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gold-500/20 bg-ink-900/40 p-8 text-center text-sm text-gray-400">
            No widgets selected. Pick up to {MAX_WIDGETS} from the library above.
          </div>
        ) : (
          selectedWidgets.map(widgetId => (
            <React.Fragment key={widgetId}>{widgetMap[widgetId]}</React.Fragment>
          ))
        )}
      </section>
    </div>
  );
};

export default DashboardHome;
