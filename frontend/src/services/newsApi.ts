export type MarketImpact = 'bullish' | 'bearish' | 'neutral';
export type ImpactLevel = 'high' | 'medium' | 'low';

export interface NewsSignalArticle {
  title: string;
  summary: string;
  source_url: string;
  source_name: string;
  ai_reasoning: string;
  market_impact: MarketImpact;
  impact_level: ImpactLevel;
  confidence: number;
  published_at?: string;
}

interface SentimentItemDto {
  article_index: number;
  title: string;
  url: string;
  source?: string | null;
  published_at?: string | null;
  sentiment: string;
  reasoning: string;
  confidence: number;
}

interface RawArticleDto {
  title: string;
  url: string;
  source?: string | null;
  published_at?: string | null;
  snippet?: string | null;
  content?: string | null;
}

interface NewsSentimentResponseDto {
  query: string;
  generated_at: string;
  sentiments: SentimentItemDto[];
  raw_articles?: RawArticleDto[];
}

interface FetchNewsSignalsOptions {
  query?: string;
  maxResults?: number;
  recency?: 'day' | 'week' | 'month' | 'year';
  model?: string;
  maxArticles?: number;
}

const clip = (text: string, maxChars: number) => {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars).trimEnd()}...`;
};

const resolveNewsApiBaseUrl = () => {
  const aiBase = ((import.meta.env.VITE_AI_API_BASE_URL as string | undefined) || '').trim();
  const backendBase = ((import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined) || '').trim();
  return (aiBase || backendBase).replace(/\/+$/, '');
};

const safeDomain = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return 'newswire';
  }
};

const normalizeImpact = (value: string): MarketImpact => {
  if (value === 'bullish' || value === 'bearish') {
    return value;
  }
  return 'neutral';
};

const deriveImpactLevel = (impact: MarketImpact, confidence: number): ImpactLevel => {
  const clamped = Math.max(0, Math.min(1, confidence));
  if (impact === 'neutral') {
    return clamped >= 0.8 ? 'medium' : 'low';
  }
  if (clamped >= 0.75) {
    return 'high';
  }
  if (clamped >= 0.45) {
    return 'medium';
  }
  return 'low';
};

const pickSummary = (raw?: RawArticleDto, reasoning?: string) => {
  const base = raw?.snippet?.trim() || raw?.content?.trim() || reasoning?.trim() || 'No summary available.';
  return clip(base, 260);
};

const mapToSignals = (payload: NewsSentimentResponseDto): NewsSignalArticle[] => {
  const rawByIndex = new Map<number, RawArticleDto>(
    (payload.raw_articles || []).map((article, idx) => [idx + 1, article]),
  );

  return (payload.sentiments || []).map((item) => {
    const raw = rawByIndex.get(item.article_index);
    const sourceUrl = item.url || raw?.url || '#';
    const impact = normalizeImpact(item.sentiment);
    const confidence = Number.isFinite(item.confidence) ? item.confidence : 0;

    return {
      title: item.title || raw?.title || 'Untitled',
      summary: pickSummary(raw, item.reasoning),
      source_url: sourceUrl,
      source_name: item.source || raw?.source || safeDomain(sourceUrl),
      ai_reasoning: item.reasoning || 'No reasoning provided by model.',
      market_impact: impact,
      impact_level: deriveImpactLevel(impact, confidence),
      confidence: Math.max(0, Math.min(1, confidence)),
      published_at: item.published_at || raw?.published_at || undefined,
    };
  });
};

export const fallbackNewsSignals: NewsSignalArticle[] = [
  {
    title: 'Gold extends rally as macro uncertainty grows',
    summary: 'Safe-haven demand remains firm as investors de-risk ahead of key macro data.',
    source_url: 'https://www.reuters.com',
    source_name: 'reuters.com',
    ai_reasoning: 'Risk-off positioning supports defensive allocations into bullion.',
    market_impact: 'bullish',
    impact_level: 'high',
    confidence: 0.8,
  },
  {
    title: 'Fed tone keeps metals bid despite stronger dollar',
    summary: 'Policy uncertainty limits downside in gold even as DXY stays elevated.',
    source_url: 'https://www.bloomberg.com',
    source_name: 'bloomberg.com',
    ai_reasoning: 'Competing forces from USD strength and rate-cut expectations create mixed direction.',
    market_impact: 'neutral',
    impact_level: 'medium',
    confidence: 0.58,
  },
  {
    title: 'ETF inflows resume as investors seek hedges',
    summary: 'Gold-backed ETF demand rises, signaling renewed allocation interest.',
    source_url: 'https://www.cnbc.com',
    source_name: 'cnbc.com',
    ai_reasoning: 'Fund flow momentum points to sustained institutional support for gold.',
    market_impact: 'bullish',
    impact_level: 'medium',
    confidence: 0.67,
  },
];

export const fetchNewsSignals = async (
  options: FetchNewsSignalsOptions = {},
): Promise<NewsSignalArticle[]> => {
  const apiBaseUrl = resolveNewsApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error('Missing VITE_AI_API_BASE_URL or VITE_BACKEND_API_BASE_URL');
  }

  const response = await fetch(`${apiBaseUrl}/news/sentiment`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: options.query || 'latest news about gold',
      max_results: options.maxResults ?? 10,
      recency: options.recency ?? 'week',
      model: options.model ?? 'gpt-4.1-mini',
      max_articles: options.maxArticles ?? options.maxResults ?? 10,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({} as { detail?: string }));
    const detail = typeof payload?.detail === 'string' ? payload.detail : `HTTP ${response.status}`;
    throw new Error(detail);
  }

  const data = (await response.json()) as NewsSentimentResponseDto;
  return mapToSignals(data);
};
