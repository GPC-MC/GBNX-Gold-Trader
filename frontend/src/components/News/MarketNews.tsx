import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Brain, Globe, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';

interface NewsArticle {
  title: string;
  summary: string;
  source_url: string;
  source_name: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  ai_reasoning?: string;
  market_impact?: 'bullish' | 'bearish' | 'neutral';
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
        {
          title: 'Gold Eclipses $3,900 as Government Shutdown Begins',
          summary:
            'Gold futures opened at a record $3,887.70 per ounce, up about 1.2% from the prior day, and later pushed above $3,900 amid heightened safe-haven demand triggered by the U.S. government shutdown.',
          source_url:
            'https://finance.yahoo.com/personal-finance/investing/article/gold-price-today-wednesday-october-1-gold-eclipses-3900-as-government-shutdown-begins-113229852.html',
          source_name: 'finance.yahoo.com',
          sentiment: 'positive',
          ai_reasoning:
            'Government shutdown creates economic uncertainty, historically driving investors toward safe-haven assets like gold. The 1.2% price increase and breaking $3,900 threshold indicates strong market momentum.',
          market_impact: 'bullish'
        },
        {
          title: 'Gold hits record high as US government shuts down',
          summary:
            'Spot gold reached a record high—peaking at around $3,898.18 per ounce—while U.S. December futures climbed to $3,914.50, fueled by safe-haven demand amid a U.S. government shutdown and heightened expectations of an interest rate cut by the Federal Reserve.',
          source_url:
            'https://www.reuters.com/world/india/gold-hits-record-high-us-shutdown-risks-rate-cut-bets-2025-10-01/',
          source_name: 'reuters.com',
          sentiment: 'positive',
          ai_reasoning:
            'Multiple bullish catalysts: government shutdown uncertainty, Fed rate cut expectations, and record-breaking price levels. The combination suggests sustained upward pressure on gold prices.',
          market_impact: 'bullish'
        },
        {
          title: 'Central Banks Reduce Gold Reserves',
          summary:
            'Major central banks have reduced their gold holdings by 2.3% in Q4, signaling increased confidence in traditional currency markets and reduced hedging against economic uncertainty.',
          source_url: 'https://www.bloomberg.com/news/central-banks-gold',
          source_name: 'bloomberg.com',
          sentiment: 'negative',
          ai_reasoning:
            'Central bank selling indicates institutional confidence in fiat currencies and reduced need for safe-haven positioning. This could pressure gold prices as major buyers reduce demand.',
          market_impact: 'bearish'
        },
        {
          title: 'Dollar Strengthens Against Major Currencies',
          summary:
            'The U.S. dollar index rose 1.5% this week as economic data exceeded expectations, potentially pressuring gold prices which typically move inversely to the dollar.',
          source_url: 'https://www.marketwatch.com/story/dollar-strength',
          source_name: 'marketwatch.com',
          sentiment: 'negative',
          ai_reasoning:
            'Strong dollar makes gold more expensive for foreign buyers and reduces its appeal as an inflation hedge. The inverse correlation typically puts downward pressure on gold prices.',
          market_impact: 'bearish'
        },
        {
          title: 'Mining Output Remains Stable Despite Geopolitical Tensions',
          summary:
            'Global gold mining production maintained steady levels despite ongoing geopolitical tensions, with major producers reporting no significant disruptions to operations.',
          source_url: 'https://www.mining.com/gold-production',
          source_name: 'mining.com',
          sentiment: 'neutral',
          ai_reasoning:
            'Stable production ensures adequate supply while geopolitical tensions support safe-haven demand. The mixed signals suggest a balanced outlook without strong directional bias.',
          market_impact: 'neutral'
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

  const sentimentClasses = (sentiment?: NewsArticle['sentiment']) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20';
      case 'negative':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/20';
      case 'neutral':
      default:
        return 'bg-white/10 text-gray-300 border-white/10';
    }
  };

  const impactPill = (impact?: NewsArticle['market_impact']) => {
    if (!impact) return null;

    if (impact === 'bullish') {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1">
          <TrendingUp size={14} className="text-emerald-300" />
          <span className="text-xs font-semibold text-emerald-300">BULLISH</span>
        </div>
      );
    }

    if (impact === 'bearish') {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1">
          <TrendingDown size={14} className="text-rose-300" />
          <span className="text-xs font-semibold text-rose-300">BEARISH</span>
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
        <span className="text-xs font-semibold text-gray-300">NEUTRAL</span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6 mb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border border-gold-500/15 bg-ink-900/40 flex items-center justify-center">
              <Globe size={20} className="text-gold-300/80" />
            </div>
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-gold-500">MARKET NEWS</div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white">Market News</h1>
              <p className="mt-1 text-sm text-gray-400">Latest gold market news and updates</p>
            </div>
          </div>

          <button
            onClick={handleRefreshNews}
            disabled={refreshingNews}
            className={clsx(
              'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200',
              refreshingNews
                ? 'bg-ink-900/40 border-gold-500/10 text-gray-500 cursor-not-allowed'
                : 'bg-gold-500/10 border-gold-500/25 text-gold-300 hover:bg-gold-500/15 hover:border-gold-500/35'
            )}
          >
            <RefreshCw size={18} className={refreshingNews ? 'animate-spin' : ''} />
            <span>{refreshingNews ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Feed */}
      {newsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gold-500/10 bg-ink-850/40 p-6 shadow-panel backdrop-blur-sm"
            >
              <div className="animate-pulse">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-14 rounded bg-ink-800/70" />
                  <div className="h-6 w-20 rounded bg-ink-800/70" />
                </div>
                <div className="h-6 w-28 rounded-full bg-ink-800/70 mb-4" />
                <div className="h-5 rounded bg-ink-800/70 mb-2" />
                <div className="h-5 w-3/4 rounded bg-ink-800/70 mb-4" />
                <div className="h-3 rounded bg-ink-800/70 mb-2" />
                <div className="h-3 rounded bg-ink-800/70 mb-2" />
                <div className="h-3 w-2/3 rounded bg-ink-800/70 mb-4" />
                <div className="rounded-xl border border-gold-500/10 bg-ink-900/40 p-4">
                  <div className="h-3 w-1/3 rounded bg-ink-800/70 mb-2" />
                  <div className="h-3 rounded bg-ink-800/70 mb-1" />
                  <div className="h-3 rounded bg-ink-800/70 mb-1" />
                  <div className="h-3 w-3/4 rounded bg-ink-800/70" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {news.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((article, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-gold-500/12 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6 flex flex-col transition-all duration-200 hover:border-gold-500/30"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="text-xs px-2 py-1 rounded font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/20">
                        LIVE
                      </div>
                      {article.sentiment && (
                        <div
                          className={clsx(
                            'text-xs px-2 py-1 rounded font-semibold border',
                            sentimentClasses(article.sentiment)
                          )}
                        >
                          {article.sentiment.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{article.source_name}</span>
                  </div>

                  {article.market_impact && <div className="mb-3">{impactPill(article.market_impact)}</div>}

                  <a
                    href={article.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <h3 className="text-lg font-semibold mb-3 text-gray-100 transition-colors duration-200 line-clamp-2 hover:text-gold-300">
                      {article.title}
                    </h3>
                    <p className="text-sm line-clamp-3 leading-relaxed mb-3 text-gray-400">
                      {article.summary}
                    </p>
                  </a>

                  {article.ai_reasoning && (
                    <div className="mt-auto">
                      <div className="rounded-xl border border-gold-500/12 bg-gold-500/5 p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain size={14} className="text-gold-500" />
                          <span className="text-xs font-semibold tracking-[0.18em] text-gold-500">AI REASONING</span>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-400">{article.ai_reasoning}</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gold-500/10">
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-gold-300 hover:text-gold-500 transition-colors duration-200"
                    >
                      Read Full Article →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Globe size={56} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No News Available</h3>
              <p className="text-sm text-gray-500">Check back later for the latest market updates</p>
            </div>
          )}
        </div>
      )}

      {!newsLoading && news.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Showing {news.length} news articles • Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default MarketNews;
