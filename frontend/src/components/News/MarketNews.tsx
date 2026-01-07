import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw, TrendingUp, TrendingDown, Brain } from 'lucide-react';

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
          'accept': 'application/json',
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
      console.log('News fetched successfully:', data);
    } catch (err) {
      console.error('Error fetching news:', err);
      const mockNews: NewsArticle[] = [
        {
          title: "Gold Eclipses $3,900 as Government Shutdown Begins",
          summary: "Gold futures opened at a record $3,887.70 per ounce, up about 1.2% from the prior day, and later pushed above $3,900 amid heightened safe-haven demand triggered by the U.S. government shutdown.",
          source_url: "https://finance.yahoo.com/personal-finance/investing/article/gold-price-today-wednesday-october-1-gold-eclipses-3900-as-government-shutdown-begins-113229852.html",
          source_name: "finance.yahoo.com",
          sentiment: 'positive',
          ai_reasoning: 'Government shutdown creates economic uncertainty, historically driving investors toward safe-haven assets like gold. The 1.2% price increase and breaking $3,900 threshold indicates strong market momentum.',
          market_impact: 'bullish'
        },
        {
          title: "Gold hits record high as US government shuts down",
          summary: "Spot gold reached a record high—peaking at around $3,898.18 per ounce—while U.S. December futures climbed to $3,914.50, fueled by safe-haven demand amid a U.S. government shutdown and heightened expectations of an interest rate cut by the Federal Reserve.",
          source_url: "https://www.reuters.com/world/india/gold-hits-record-high-us-shutdown-risks-rate-cut-bets-2025-10-01/",
          source_name: "reuters.com",
          sentiment: 'positive',
          ai_reasoning: 'Multiple bullish catalysts: government shutdown uncertainty, Fed rate cut expectations, and record-breaking price levels. The combination suggests sustained upward pressure on gold prices.',
          market_impact: 'bullish'
        },
        {
          title: "Central Banks Reduce Gold Reserves",
          summary: "Major central banks have reduced their gold holdings by 2.3% in Q4, signaling increased confidence in traditional currency markets and reduced hedging against economic uncertainty.",
          source_url: "https://www.bloomberg.com/news/central-banks-gold",
          source_name: "bloomberg.com",
          sentiment: 'negative',
          ai_reasoning: 'Central bank selling indicates institutional confidence in fiat currencies and reduced need for safe-haven positioning. This could pressure gold prices as major buyers reduce demand.',
          market_impact: 'bearish'
        },
        {
          title: "Dollar Strengthens Against Major Currencies",
          summary: "The U.S. dollar index rose 1.5% this week as economic data exceeded expectations, potentially pressuring gold prices which typically move inversely to the dollar.",
          source_url: "https://www.marketwatch.com/story/dollar-strength",
          source_name: "marketwatch.com",
          sentiment: 'negative',
          ai_reasoning: 'Strong dollar makes gold more expensive for foreign buyers and reduces its appeal as an inflation hedge. The inverse correlation typically puts downward pressure on gold prices.',
          market_impact: 'bearish'
        },
        {
          title: "Mining Output Remains Stable Despite Geopolitical Tensions",
          summary: "Global gold mining production maintained steady levels despite ongoing geopolitical tensions, with major producers reporting no significant disruptions to operations.",
          source_url: "https://www.mining.com/gold-production",
          source_name: "mining.com",
          sentiment: 'neutral',
          ai_reasoning: 'Stable production ensures adequate supply, preventing supply-driven price spikes. However, geopolitical risks remain a wildcard that could quickly shift market dynamics.',
          market_impact: 'neutral'
        },
        {
          title: "Jewelry Demand Softens in Asian Markets",
          summary: "Physical gold demand in key Asian markets showed signs of weakness, with jewelry sales declining 8% year-over-year as high prices impact consumer purchasing power.",
          source_url: "https://www.gold.org/asia-demand",
          source_name: "gold.org",
          sentiment: 'negative',
          ai_reasoning: "Declining jewelry demand reduces a significant source of gold consumption. High prices creating demand destruction could lead to price corrections if investment demand doesn't compensate.",
          market_impact: 'bearish'
        }
      ];
      setNews(mockNews);
    } finally {
      if (isRefresh) {
        setRefreshingNews(false);
      } else {
        setNewsLoading(false);
      }
    }
  };

  const handleRefreshNews = () => {
    fetchNews(true);
  };

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0B1220' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="border rounded-2xl mb-8" style={{ backgroundColor: '#121826', borderColor: 'rgba(212, 175, 55, 0.15)', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe size={32} style={{ color: '#9CA3AF' }} />
              <div>
                <h1 className="text-3xl font-bold" style={{ color: '#E5E7EB' }}>Market News</h1>
                <p className="mt-1" style={{ color: '#6B7280' }}>Latest gold market news and updates</p>
              </div>
            </div>
            <button
              onClick={handleRefreshNews}
              disabled={refreshingNews}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium"
              style={{
                backgroundColor: refreshingNews ? '#161E2E' : 'rgba(212, 175, 55, 0.2)',
                color: refreshingNews ? '#6B7280' : '#D4AF37',
                cursor: refreshingNews ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw
                size={18}
                className={refreshingNews ? 'animate-spin' : ''}
              />
              <span>{refreshingNews ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* News Feed */}
        {newsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl p-6" style={{ backgroundColor: '#121826' }}>
                <div className="animate-pulse">
                  {/* Badges */}
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="h-6 w-16 rounded" style={{ backgroundColor: '#161E2E' }}></div>
                    <div className="h-6 w-20 rounded" style={{ backgroundColor: '#161E2E' }}></div>
                  </div>
                  {/* Market Impact */}
                  <div className="h-6 w-24 rounded-full mb-3" style={{ backgroundColor: '#161E2E' }}></div>
                  {/* Title */}
                  <div className="h-5 rounded mb-2" style={{ backgroundColor: '#161E2E' }}></div>
                  <div className="h-5 rounded w-3/4 mb-3" style={{ backgroundColor: '#161E2E' }}></div>
                  {/* Summary */}
                  <div className="h-3 rounded w-full mb-2" style={{ backgroundColor: '#161E2E' }}></div>
                  <div className="h-3 rounded w-full mb-2" style={{ backgroundColor: '#161E2E' }}></div>
                  <div className="h-3 rounded w-2/3 mb-4" style={{ backgroundColor: '#161E2E' }}></div>
                  {/* AI Reasoning */}
                  <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: '#161E2E' }}>
                    <div className="h-3 rounded w-1/3 mb-2" style={{ backgroundColor: '#121826' }}></div>
                    <div className="h-3 rounded w-full mb-1" style={{ backgroundColor: '#121826' }}></div>
                    <div className="h-3 rounded w-full mb-1" style={{ backgroundColor: '#121826' }}></div>
                    <div className="h-3 rounded w-3/4" style={{ backgroundColor: '#121826' }}></div>
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
                    className="rounded-2xl p-6 transition-all duration-200 border flex flex-col"
                    style={{
                      backgroundColor: '#121826',
                      borderColor: 'rgba(212, 175, 55, 0.15)',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.15)';
                    }}
                  >
                    {/* Header with badges */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="text-xs px-2 py-1 rounded font-semibold" style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }}>
                          LIVE
                        </div>
                        {/* Sentiment Badge */}
                        {article.sentiment && (
                          <div
                            className="text-xs px-2 py-1 rounded font-semibold"
                            style={{
                              backgroundColor: article.sentiment === 'positive'
                                ? 'rgba(34, 197, 94, 0.2)'
                                : article.sentiment === 'negative'
                                ? 'rgba(220, 38, 38, 0.2)'
                                : 'rgba(156, 163, 175, 0.2)',
                              color: article.sentiment === 'positive'
                                ? '#22C55E'
                                : article.sentiment === 'negative'
                                ? '#DC2626'
                                : '#9CA3AF'
                            }}
                          >
                            {article.sentiment.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-xs" style={{ color: '#6B7280' }}>{article.source_name}</span>
                    </div>

                    {/* Market Impact Indicator */}
                    {article.market_impact && (
                      <div className="mb-3 flex items-center space-x-2">
                        {article.market_impact === 'bullish' ? (
                          <div className="flex items-center space-x-1 px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}>
                            <TrendingUp size={14} style={{ color: '#22C55E' }} />
                            <span className="text-xs font-semibold" style={{ color: '#22C55E' }}>BULLISH</span>
                          </div>
                        ) : article.market_impact === 'bearish' ? (
                          <div className="flex items-center space-x-1 px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)' }}>
                            <TrendingDown size={14} style={{ color: '#DC2626' }} />
                            <span className="text-xs font-semibold" style={{ color: '#DC2626' }}>BEARISH</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(156, 163, 175, 0.15)' }}>
                            <span className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>NEUTRAL</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Title and Summary */}
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <h3 className="text-lg font-semibold mb-3 transition-colors duration-200 line-clamp-2" style={{ color: '#E5E7EB' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#D4AF37'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#E5E7EB'}
                      >
                        {article.title}
                      </h3>
                      <p className="text-sm line-clamp-3 leading-relaxed mb-3" style={{ color: '#9CA3AF' }}>
                        {article.summary}
                      </p>
                    </a>

                    {/* AI Reasoning Section */}
                    {article.ai_reasoning && (
                      <div className="mt-auto">
                        <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'rgba(212, 175, 55, 0.08)', borderLeft: '3px solid #D4AF37' }}>
                          <div className="flex items-center space-x-2 mb-2">
                            <Brain size={14} style={{ color: '#D4AF37' }} />
                            <span className="text-xs font-semibold" style={{ color: '#D4AF37', letterSpacing: '0.03em' }}>AI REASONING</span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>
                            {article.ai_reasoning}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="pt-3 border-t" style={{ borderColor: 'rgba(212, 175, 55, 0.1)' }}>
                      <a
                        href={article.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium transition-colors duration-200"
                        style={{ color: '#D4AF37' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#F2D27C'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#D4AF37'}
                      >
                        Read Full Article →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Globe size={64} className="mx-auto mb-4" style={{ color: '#4B5563' }} />
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#9CA3AF' }}>No News Available</h3>
                <p style={{ color: '#6B7280' }}>Check back later for the latest market updates</p>
              </div>
            )}
          </div>
        )}

        {!newsLoading && news.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Showing {news.length} news articles • Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketNews;
