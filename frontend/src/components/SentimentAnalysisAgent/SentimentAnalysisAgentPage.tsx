import React, { useState, useMemo, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { ArrowLeft, Send, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SentimentResult {
  sentiment: string;
  score: number;
  magnitude: number;
  label: string;
  confidence: string;
}

interface SentimentResponse {
  result: SentimentResult;
  analysis: string;
  keywords: string[];
}

const SentimentAnalysisAgentPage: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<SentimentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const apiBaseUrl = useMemo(() => {
    const raw = (import.meta.env.VITE_AI_API_BASE_URL as string | undefined) || '';
    return raw.trim().replace(/\/+$/, '');
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
  }, [inputText]);

  const analyzeSentiment = async () => {
    const text = inputText.trim();
    if (!text || text.length < 10 || isAnalyzing) {
      setError('Please enter at least 10 characters to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`${apiBaseUrl}/analyze_sentiment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          source: 'user_input'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze sentiment');
      }

      const data: SentimentResponse = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
      console.error('Sentiment analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      analyzeSentiment();
    }
  };

  const getSentimentIcon = (label: string) => {
    switch (label) {
      case 'Bullish':
        return <TrendingUp className="text-emerald-400" size={24} />;
      case 'Bearish':
        return <TrendingDown className="text-rose-400" size={24} />;
      default:
        return <Minus className="text-gray-400" size={24} />;
    }
  };

  const getSentimentColor = (label: string) => {
    switch (label) {
      case 'Bullish':
        return 'border-emerald-400/30 bg-emerald-400/10';
      case 'Bearish':
        return 'border-rose-400/30 bg-rose-400/10';
      default:
        return 'border-gray-400/30 bg-gray-400/10';
    }
  };

  const getSentimentTextColor = (label: string) => {
    switch (label) {
      case 'Bullish':
        return 'text-emerald-300';
      case 'Bearish':
        return 'text-rose-300';
      default:
        return 'text-gray-300';
    }
  };

  const exampleTexts = [
    "Gold prices surge as Federal Reserve signals pause in rate hikes amid growing inflation concerns",
    "Market uncertainty drives investors toward safe-haven assets, with gold seeing increased demand",
    "Central banks continue accumulating gold reserves as geopolitical tensions escalate globally"
  ];

  const loadExample = (text: string) => {
    setInputText(text);
    setResults(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-950 to-ink-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            to="/dashboard/ai-studio"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gold-300 transition"
          >
            <ArrowLeft size={16} />
            Back to AI Studio
          </Link>
        </div>

        <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-gold-500/20 bg-gradient-to-br from-gold-500/10 to-transparent">
              <TrendingUp size={32} className="text-gold-300" />
            </div>
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-gold-500">AI AGENT</div>
              <h1 className="mt-1 text-3xl font-bold text-white">Sentiment Analysis Agent</h1>
              <p className="mt-2 text-sm text-gray-400">
                Analyze market sentiment from news, social media, or any text related to gold trading
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Input Text</h2>
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste news article, market commentary, or any text to analyze sentiment... (minimum 10 characters)"
                className="w-full min-h-[200px] rounded-xl border border-gold-500/15 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-gold-500/30 focus:outline-none focus:ring-2 focus:ring-gold-500/20 resize-none"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {inputText.length} characters (Press Ctrl/Cmd + Enter to analyze)
                </span>
                <button
                  onClick={analyzeSentiment}
                  disabled={isAnalyzing || inputText.trim().length < 10}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition',
                    isAnalyzing || inputText.trim().length < 10
                      ? 'cursor-not-allowed bg-gray-700 text-gray-400'
                      : 'bg-gold-500/20 border border-gold-500/30 text-gold-200 hover:bg-gold-500/30'
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold-300 border-t-transparent" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Analyze Sentiment
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4">
                  <AlertCircle className="text-rose-400 flex-shrink-0" size={20} />
                  <div className="text-sm text-rose-300">{error}</div>
                </div>
              )}
            </div>

            {results && (
              <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6 space-y-6">
                <h2 className="text-lg font-semibold text-white">Analysis Results</h2>

                <div className={clsx('rounded-xl border p-6', getSentimentColor(results.result.label))}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getSentimentIcon(results.result.label)}
                      <div>
                        <div className={clsx('text-2xl font-bold', getSentimentTextColor(results.result.label))}>
                          {results.result.label}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {results.result.confidence} Confidence
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Sentiment Score</div>
                      <div className={clsx('text-2xl font-bold', getSentimentTextColor(results.result.label))}>
                        {results.result.score.toFixed(3)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-ink-900/40 p-3">
                      <div className="text-xs text-gray-400">Magnitude</div>
                      <div className="text-lg font-semibold text-white">{results.result.magnitude.toFixed(3)}</div>
                    </div>
                    <div className="rounded-lg bg-ink-900/40 p-3">
                      <div className="text-xs text-gray-400">Type</div>
                      <div className="text-lg font-semibold text-white">{results.result.sentiment}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gold-500/10 bg-ink-900/40 p-4">
                  <h3 className="text-sm font-semibold text-gold-300 mb-2">Interpretation</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{results.analysis}</p>
                </div>

                {results.keywords.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3">Detected Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {results.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="rounded-lg border border-gold-500/20 bg-gold-500/10 px-3 py-1 text-xs font-medium text-gold-200"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-white mb-4">How It Works</h2>
              <div className="space-y-3 text-sm text-gray-300">
                <p>This agent analyzes text to determine market sentiment:</p>
                <ul className="space-y-2 list-disc list-inside">
                  <li>
                    <strong className="text-white">Bullish:</strong> Positive sentiment suggesting price increase
                  </li>
                  <li>
                    <strong className="text-white">Bearish:</strong> Negative sentiment suggesting price decrease
                  </li>
                  <li>
                    <strong className="text-white">Neutral:</strong> Mixed or unclear market direction
                  </li>
                </ul>
                <p className="mt-4 text-xs text-gray-400">
                  The sentiment score ranges from -1 (very negative) to +1 (very positive), while magnitude indicates the strength of the sentiment.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Try Examples</h2>
              <div className="space-y-3">
                {exampleTexts.map((text, index) => (
                  <button
                    key={index}
                    onClick={() => loadExample(text)}
                    className="w-full text-left rounded-xl border border-gold-500/10 bg-ink-900/40 p-3 text-sm text-gray-300 hover:border-gold-500/30 hover:bg-ink-900/60 transition"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentAnalysisAgentPage;
