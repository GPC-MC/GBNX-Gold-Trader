import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw } from 'lucide-react';

interface NewsArticle {
  title: string;
  summary: string;
  source_url: string;
  source_name: string;
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
          summary: "On Wednesday, October 1, 2025, gold futures opened at a record $3,887.70 per ounce, up about 1.2% from the prior day, and later pushed above $3,900 amid heightened safe-haven demand triggered by the U.S. government shutdown ([finance.yahoo.com](https://finance.yahoo.com/personal-finance/investing/article/gold-price-today-wednesday-october-1-gold-eclipses-3900-as-government-shutdown-begins-113229852.html?utm_source=openai)).",
          source_url: "https://finance.yahoo.com/personal-finance/investing/article/gold-price-today-wednesday-october-1-gold-eclipses-3900-as-government-shutdown-begins-113229852.html",
          source_name: "finance.yahoo.com"
        },
        {
          title: "Gold hits record high as US government shuts down",
          summary: "Spot gold reached a record high—peaking at around $3,898.18 per ounce—while U.S. December futures climbed to $3,914.50, fueled by safe-haven demand amid a U.S. government shutdown and heightened expectations of an interest rate cut by the Federal Reserve.",
          source_url: "https://www.reuters.com/world/india/gold-hits-record-high-us-shutdown-risks-rate-cut-bets-2025-10-01/",
          source_name: "reuters.com"
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
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe className="text-yellow-400" size={32} />
              <div>
                <h1 className="text-3xl font-bold text-yellow-400">Market News</h1>
                <p className="text-gray-400 mt-1">Latest gold market news and updates</p>
              </div>
            </div>
            <button
              onClick={handleRefreshNews}
              disabled={refreshingNews}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                refreshingNews
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
              }`}
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
              <div key={i} className="bg-gray-800 rounded-2xl p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-600 rounded mb-3"></div>
                  <div className="h-3 bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-600 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-600 rounded w-2/3"></div>
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
                    className="bg-gray-800 rounded-2xl p-6 hover:bg-gray-750 transition-all duration-200 border border-gray-700 hover:border-yellow-500/30"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded font-semibold">
                        LIVE
                      </div>
                      <span className="text-xs text-gray-400">{article.source_name}</span>
                    </div>

                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <h3 className="text-lg font-semibold text-white mb-3 hover:text-yellow-400 transition-colors duration-200 line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-4 leading-relaxed">
                        {article.summary}
                      </p>
                    </a>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <a
                        href={article.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-yellow-400 hover:text-yellow-300 font-medium"
                      >
                        Read More →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Globe size={64} className="mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No News Available</h3>
                <p className="text-gray-500">Check back later for the latest market updates</p>
              </div>
            )}
          </div>
        )}

        {!newsLoading && news.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              Showing {news.length} news articles • Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketNews;
