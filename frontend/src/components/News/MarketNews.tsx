import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Globe, RefreshCw, TrendingUp, Zap, Newspaper, AlertTriangle } from 'lucide-react';

interface NewsArticle {
  title: string;
  summary: string;
  source_url: string;
  source_name: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  ai_reasoning?: string;
  market_impact?: 'bullish' | 'bearish' | 'neutral';
  impact_level?: 'high' | 'medium' | 'low'; // Tier 1, 2, 3
}

interface NewsResponse {
  articles: NewsArticle[];
  count: number;
}

const MarketNews: React.FC = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [refreshingNews, setRefreshingNews] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshingNews(true);
      } else {
        setNewsLoading(true);
      }

      const response = await fetch('https://bf1bd891617c.ngrok-free.app/latest_news', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: 'gold'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: NewsResponse = await response.json();
      setNews(data.articles || []);
    } catch (err) {
      console.error('Error fetching news:', err);
      const mockNews: NewsArticle[] = [
        // Tier 1: Hero News
        {
          title: 'Gold Eclipses $3,900 as Government Shutdown Begins',
          summary:
            'Gold futures opened at a record $3,887.70 per ounce and later pushed above $3,900 amid heightened safe-haven demand triggered by the U.S. government shutdown.',
          source_url: 'https://finance.yahoo.com/gold-shutdown',
          source_name: 'finance.yahoo.com',
          sentiment: 'positive',
          ai_reasoning:
            'Government shutdown historically increases safe-haven demand → bullish bias likely to persist short-term.',
          market_impact: 'bullish',
          impact_level: 'high'
        },
        // Tier 2: Directional Signals (Bullish)
        {
          title: 'Gold hits record high as Rate Cut bets increase',
          summary:
            'Spot gold reached a record high driven by heightened expectations of an interest rate cut by the Federal Reserve next month.',
          source_url: 'https://www.reuters.com/gold-record-high',
          source_name: 'reuters.com',
          sentiment: 'positive',
          ai_reasoning:
            'Lower rates reduce opportunity cost of holding non-yielding bullion → gold typically rallies.',
          market_impact: 'bullish',
          impact_level: 'medium'
        },
        // Tier 2: Directional Signals (Bearish)
        {
          title: 'Central Banks Reduce Gold Reserves in Q4',
          summary:
            'Major central banks have reduced their gold holdings by 2.3% in Q4, signaling increased confidence in traditional currency markets.',
          source_url: 'https://www.bloomberg.com/central-banks-gold',
          source_name: 'bloomberg.com',
          sentiment: 'negative',
          ai_reasoning:
            'Institutional selling pressure creates overhead resistence → short-term bearish correction possible.',
          market_impact: 'bearish',
          impact_level: 'medium'
        },
        // Tier 2: Directional Signals (Bearish)
        {
          title: 'Dollar Strength Weighs on Precious Metals',
          summary:
            'The U.S. dollar index rose 1.5% this week as economic data exceeded expectations, putting pressure on gold prices.',
          source_url: 'https://www.marketwatch.com/dollar-strength',
          source_name: 'marketwatch.com',
          sentiment: 'negative',
          ai_reasoning:
            'Stronger USD makes gold more expensive for foreign buyers → inverse correlation pressures price down.',
          market_impact: 'bearish',
          impact_level: 'medium'
        },
        // Tier 3: Context
        {
          title: 'Mining Output Remains Stable Despite Geopolitical Tensions',
          summary:
            'Global gold mining production maintained steady levels despite ongoing geopolitical tensions in key regions.',
          source_url: 'https://www.mining.com/gold-production',
          source_name: 'mining.com',
          sentiment: 'neutral',
          ai_reasoning:
            'Supply chain functionality remains intact → Neutral supply-side impact.',
          market_impact: 'neutral',
          impact_level: 'low'
        },
        {
          title: 'Jewelry Demand in India Shows Slight Uptick',
          summary: 'Physical demand in India increased by 2% ahead of festival season, providing some floor support.',
          source_url: 'https://www.cnbc.com/gold-india',
          source_name: 'cnbc.com',
          sentiment: 'neutral',
          ai_reasoning: 'Seasonal physical demand supports base prices but unlikely to drive major trend.',
          market_impact: 'neutral',
          impact_level: 'low'
        }
      ];
      setNews(mockNews);
    } finally {
      setNewsLoading(false);
      setRefreshingNews(false);
    }
  };

  const handleRefreshNews = () => {
    fetchNews(true);
  };

  // Group news by tiers
  // Tier 1: High impact
  const tier1News = news.filter(n => n.impact_level === 'high');

  // Tier 2: Medium impact OR (Standard Bullish/Bearish that isn't High/Low)
  const tier2News = news.filter(n =>
    n.impact_level === 'medium' ||
    (!n.impact_level && (n.market_impact === 'bullish' || n.market_impact === 'bearish'))
  );

  // Tier 3: Low impact OR (Neutral that isn't High/Medium) OR (No market_impact defined)
  const tier3News = news.filter(n =>
    n.impact_level === 'low' ||
    (!n.impact_level && (n.market_impact === 'neutral' || !n.market_impact))
  );


  const renderAIInsight = (text: string, isHero = false) => (
    <div className={clsx(
      "relative overflow-hidden rounded-xl border flex flex-col justify-center",
      isHero
        ? "bg-gold-500/20 border-gold-500/30 p-4"
        : "bg-ink-900/60 border-gold-500/15 p-3 mt-auto"
    )}>
      {/* Background accent */}
      {!isHero && <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-gold-400/5 blur-2xl rounded-full pointer-events-none" />}

      <div className="flex items-center gap-2 mb-2">
        <div className={clsx(
          "p-1 rounded-md flex items-center justify-center",
          isHero ? "bg-gold-400 text-ink-950" : "bg-gold-500/10 text-gold-400"
        )}>
          <Zap size={isHero ? 16 : 14} fill={isHero ? "currentColor" : "none"} />
        </div>
        <span className={clsx(
          "font-bold tracking-wider",
          isHero ? "text-gold-300 text-sm" : "text-gold-500/90 text-[10px] uppercase"
        )}>
          {isHero ? "AI SIGNAL REASONING" : "SIGNAL INSIGHT"}
        </span>
      </div>
      <p className={clsx(
        "leading-relaxed font-medium",
        isHero ? "text-gold-100/90 text-base" : "text-gray-300 text-xs"
      )}>
        {text}
      </p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl border border-gold-500/15 bg-gradient-to-br from-ink-800 to-ink-900 flex items-center justify-center shadow-lg shadow-black/20">
            <Globe size={24} className="text-gold-300" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-[0.2em] text-gold-500 uppercase">Signal Board</div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Market News</h1>
          </div>
        </div>

        <button
          onClick={handleRefreshNews}
          disabled={refreshingNews}
          className={clsx(
            'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200',
            refreshingNews
              ? 'bg-ink-900/40 border-gold-500/10 text-gray-500 cursor-not-allowed'
              : 'bg-gold-500/10 border-gold-500/20 text-gold-300 hover:bg-gold-500/15 hover:border-gold-500/30 hover:shadow-lg hover:shadow-gold-500/5'
          )}
        >
          <RefreshCw size={16} className={refreshingNews ? 'animate-spin' : ''} />
          <span>{refreshingNews ? 'Scanning Markets…' : 'Update Signals'}</span>
        </button>
      </div>

      {newsLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mb-4"></div>
          <div className="text-gold-500/50 animate-pulse">Analyzing Market Flows...</div>
        </div>
      ) : (
        <div className="space-y-12">

          {/* TIER 1: MARKET MOVING (HERO NEWS) */}
          {tier1News.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Market Moving</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {tier1News.map((article, idx) => (
                  <div key={idx} className="col-span-1 lg:col-span-2 group relative overflow-hidden rounded-3xl border border-gold-500/30 bg-gradient-to-br from-ink-800/80 to-ink-900/80 backdrop-blur-md p-6 sm:p-8 shadow-2xl shadow-black/50 transition-all hover:border-gold-500/50">
                    <div className="absolute top-0 right-0 p-6">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 text-white px-3 py-1 text-xs font-bold shadow-lg shadow-rose-900/20">
                        <AlertTriangle size={12} strokeWidth={3} />
                        HIGH IMPACT
                      </span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="flex-1 space-y-4">
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-gold-500/80">
                          <span>{article.source_name}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-600" />
                          <span>Just now</span>
                        </div>
                        <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="block group-hover:opacity-80 transition-opacity">
                          <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                            {article.title}
                          </h3>
                        </a>
                        <p className="text-gray-300 text-lg leading-relaxed max-w-2xl">
                          {article.summary}
                        </p>
                      </div>

                      {article.ai_reasoning && (
                        <div className="w-full md:w-80 shrink-0 self-stretch flex">
                          {renderAIInsight(article.ai_reasoning, true)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TIER 2: DIRECTIONAL SIGNALS */}
          {tier2News.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-gray-400" />
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Directional Signals</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tier2News.map((article, idx) => {
                  const isBullish = article.market_impact === 'bullish';
                  const BorderColorClass = isBullish ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-rose-500/20 hover:border-rose-500/40';
                  const BgColorClass = isBullish ? 'bg-gradient-to-b from-emerald-950/10 to-ink-800/40' : 'bg-gradient-to-b from-rose-950/10 to-ink-800/40';

                  return (
                    <div key={idx} className={clsx(
                      "rounded-2xl border p-5 flex flex-col transition-all duration-300 group backdrop-blur-sm",
                      BorderColorClass,
                      BgColorClass
                    )}>
                      <div className="flex items-center justify-between mb-4">
                        <span className={clsx(
                          "text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider",
                          isBullish ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        )}>
                          {article.market_impact}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">{article.source_name}</span>
                      </div>

                      <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="block mb-4">
                        <h3 className="text-lg font-bold text-gray-100 mb-2 leading-snug group-hover:text-white transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {article.summary}
                        </p>
                      </a>

                      {article.ai_reasoning && renderAIInsight(article.ai_reasoning)}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* TIER 3: CONTEXT & BACKGROUND */}
          {tier3News.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Newspaper size={16} className="text-gray-500" />
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Market Context</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {tier3News.map((article, idx) => (
                  <div key={idx} className="rounded-xl border border-white/5 bg-ink-850/30 p-4 hover:bg-ink-850/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">{article.source_name}</span>
                    </div>
                    <a href={article.source_url} target="_blank" rel="noopener noreferrer">
                      <h3 className="text-sm font-medium text-gray-300 hover:text-white transition-colors line-clamp-2 mb-1">
                        {article.title}
                      </h3>
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!newsLoading && news.length > 0 && (
        <div className="border-t border-white/5 pt-8 text-center">
          <p className="text-xs text-gray-600">
            Market data & signals generated by AI • Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default MarketNews;
