import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Globe, RefreshCw, TrendingUp, Zap, Newspaper, AlertTriangle } from 'lucide-react';
import {
  fallbackNewsSignals,
  fetchNewsSignals,
  type NewsSignalArticle,
} from '../../services/newsApi';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getPublishedLabel = (publishedAt?: string) => {
  if (!publishedAt) {
    return 'Recent';
  }

  const timestamp = Date.parse(publishedAt);
  if (Number.isNaN(timestamp)) {
    return 'Recent';
  }

  const diffMs = Date.now() - timestamp;
  const diffHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
  if (diffHours < 1) {
    return 'Just now';
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  return `${Math.round(diffHours / 24)}d ago`;
};

const MarketNews: React.FC = () => {
  const [news, setNews] = useState<NewsSignalArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [refreshingNews, setRefreshingNews] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    if (!newsLoading && !refreshingNews) {
      return;
    }

    setLoadingProgress(0);
    let progress = 0;
    const interval = window.setInterval(() => {
      const step = Math.floor(Math.random() * 8) + 2; // 2 -> 9
      progress = Math.min(progress + step, 92);
      setLoadingProgress(progress);
    }, 170);

    return () => {
      window.clearInterval(interval);
    };
  }, [newsLoading, refreshingNews]);

  const fetchNews = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshingNews(true);
      } else {
        setNewsLoading(true);
      }

      const signals = await fetchNewsSignals({
        query: 'latest news about gold',
        maxResults: 10,
        maxArticles: 10,
        recency: 'week',
      });
      setNews(signals);
    } catch (err) {
      console.error('Error fetching news:', err);
      setNews(fallbackNewsSignals);
    } finally {
      setLoadingProgress(100);
      await wait(180);
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
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-gold-500/15 pb-6">
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mb-6"></div>
          <div className="w-full max-w-md">
            <div className="mb-2 flex items-center justify-between text-xs tracking-[0.16em] uppercase">
              <span className="text-gold-400/80">Analyzing Market Flows</span>
              <span className="text-gold-300 font-semibold">{loadingProgress}%</span>
            </div>
            <div className="h-2 rounded-full border border-gold-500/20 bg-ink-900/60 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold-600 via-gold-400 to-amber-300 transition-all duration-200"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>
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
                          <span>{getPublishedLabel(article.published_at)}</span>
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
                  <div key={idx} className="rounded-xl border border-gold-500/15 bg-ink-850/30 p-4 hover:bg-ink-850/50 transition-colors">
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
        <div className="border-t border-gold-500/15 pt-8 text-center">
          <p className="text-xs text-gray-600">
            Market data & signals generated by AI • Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default MarketNews;
