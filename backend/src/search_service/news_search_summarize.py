"""
News sentiment module:
- Fetch raw news from UnifiedSearchService
- Classify sentiment in one PydanticAI pass
"""

from __future__ import annotations

import argparse
import asyncio
import os
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field
from pydantic_ai import Agent

from src.app_config import app_config
from src.search_service.base import SearchResponse
from src.search_service.unified_search import UnifiedSearchService


class SentimentClass(str, Enum):
    bullish = "bullish"
    bearish = "bearish"
    neutral = "neutral"


class SentimentOutput(BaseModel):
    article_index: int = Field(ge=1)
    sentiment: SentimentClass
    reasoning: str = Field(min_length=10, max_length=1500, description="Concise explanation of the sentiment classification")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")


class SentimentBatchOutput(BaseModel):
    items: list[SentimentOutput] = Field(min_length=1)


class RawNewsArticle(BaseModel):
    title: str
    url: str
    source: Optional[str] = None
    published_at: Optional[str] = None
    snippet: Optional[str] = None
    content: Optional[str] = None


class PerNewsSentiment(BaseModel):
    article_index: int
    title: str
    url: str
    source: Optional[str] = None
    published_at: Optional[str] = None
    sentiment: SentimentClass
    reasoning: str
    confidence: float


class NewsSentimentResult(BaseModel):
    query: str
    generated_at: datetime
    sentiments: list[PerNewsSentiment]
    raw_articles: list[RawNewsArticle]


SYSTEM_PROMPT = """
You are a market-news sentiment classifier for gold and macro-sensitive assets.

Rules:
- Use ONLY the provided raw news articles.
- Classify EACH article independently as one of: bullish, bearish, neutral.
- "Bullish" means news context likely supports higher gold prices or safe-haven demand.
- "Bearish" means news context likely pressures gold lower (e.g., stronger USD/yields, risk-on).
- "Neutral" means mixed/unclear signals or insufficient evidence.
- Reasoning MUST be between 10-1500 characters, concise and factual for that specific article.
- Confidence MUST be a decimal number between 0.0 and 1.0 based on clarity and consistency of evidence.
- You MUST return one item per article and map correctly by article_index (starting from 1).
- Return valid JSON with the exact structure: {"items": [{"article_index": int, "sentiment": "bullish"|"bearish"|"neutral", "reasoning": str, "confidence": float}]}
"""


class NewsSentimentAnalyzer:
    def __init__(
        self,
        model_name: str = "gpt-4.1-mini",
        max_articles_for_context: int = 10,
    ):
        self._configure_model_env()
        model = model_name if ":" in model_name else f"openai:{model_name}"

        self.search_service = UnifiedSearchService()
        self.agent = Agent(
            model=model,
            system_prompt=SYSTEM_PROMPT,
            output_type=SentimentBatchOutput,
            retries=2,
        )
        self.max_articles_for_context = max_articles_for_context

    def _configure_model_env(self) -> None:
        """
        Let PydanticAI use LiteLLM endpoint if configured in env/app config.
        """
        if app_config.LITE_LLM_ENDPOINT_URL:
            os.environ["OPENAI_BASE_URL"] = app_config.LITE_LLM_ENDPOINT_URL
        if app_config.LITE_LLM_API_KEY:
            os.environ["OPENAI_API_KEY"] = app_config.LITE_LLM_API_KEY

    async def analyze_news_sentiment(
        self,
        query: str,
        max_results: int = 10,
        search_recency_filter: Optional[str] = "week",
    ) -> NewsSentimentResult:
        if not query or not query.strip():
            raise ValueError("query must not be empty")

        raw_response = await self.search_service.search_raw_news(
            query=query,
            max_results=max_results,
            search_recency_filter=search_recency_filter,
        )
        raw_articles = self._to_raw_articles(raw_response)

        if not raw_articles:
            raise ValueError("No raw news results found for this query")

        llm_prompt = self._build_analysis_prompt(query, raw_articles)
        run_result = await self.agent.run(llm_prompt)
        per_news = self._merge_with_raw_articles(
            raw_articles=raw_articles,
            ai_items=run_result.output.items,
        )

        return NewsSentimentResult(
            query=query,
            generated_at=datetime.now(timezone.utc),
            sentiments=per_news,
            raw_articles=raw_articles,
        )

    def _to_raw_articles(self, response: SearchResponse) -> list[RawNewsArticle]:
        articles: list[RawNewsArticle] = []
        for item in response.results[: self.max_articles_for_context]:
            published_at = (
                item.published_at.isoformat() if item.published_at else None
            )
            articles.append(
                RawNewsArticle(
                    title=item.title,
                    url=str(item.url),
                    source=item.source,
                    published_at=published_at,
                    snippet=item.snippet,
                    content=item.content or item.raw_content,
                )
            )
        return articles

    def _build_analysis_prompt(
        self,
        query: str,
        raw_articles: list[RawNewsArticle],
    ) -> str:
        lines = [
            f"Query: {query}",
            f"Today: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
            "Raw articles:",
            "Return format requirements:",
            "- Return JSON with key `items`.",
            "- `items` must have exactly one entry per article.",
            "- Every entry includes: article_index, sentiment, reasoning, confidence.",
        ]
        for idx, article in enumerate(raw_articles, 1):
            snippet = self._clip(article.snippet, 500)
            content = self._clip(article.content, 800)
            lines.append(
                "\n".join(
                    [
                        f"[{idx}] Title: {article.title}",
                        f"[{idx}] Source: {article.source or 'N/A'}",
                        f"[{idx}] Published: {article.published_at or 'N/A'}",
                        f"[{idx}] URL: {article.url}",
                        f"[{idx}] Snippet: {snippet or 'N/A'}",
                        f"[{idx}] Content: {content or 'N/A'}",
                    ]
                )
            )
        return "\n\n".join(lines)

    @staticmethod
    def _clip(text: Optional[str], max_chars: int) -> Optional[str]:
        if not text:
            return text
        if len(text) <= max_chars:
            return text
        return text[:max_chars].rstrip() + "..."

    def _merge_with_raw_articles(
        self,
        raw_articles: list[RawNewsArticle],
        ai_items: list[SentimentOutput],
    ) -> list[PerNewsSentiment]:
        ai_map: dict[int, SentimentOutput] = {}
        article_count = len(raw_articles)

        for item in ai_items:
            if 1 <= item.article_index <= article_count and item.article_index not in ai_map:
                ai_map[item.article_index] = item

        merged: list[PerNewsSentiment] = []
        for idx, article in enumerate(raw_articles, 1):
            item = ai_map.get(idx)
            if item is None:
                item = SentimentOutput(
                    article_index=idx,
                    sentiment=SentimentClass.neutral,
                    reasoning="Insufficient model output for this article; defaulted to neutral.",
                    confidence=0.0,
                )

            merged.append(
                PerNewsSentiment(
                    article_index=idx,
                    title=article.title,
                    url=article.url,
                    source=article.source,
                    published_at=article.published_at,
                    sentiment=item.sentiment,
                    reasoning=item.reasoning,
                    confidence=item.confidence,
                )
            )
        return merged


async def _quick_test_main() -> None:
    parser = argparse.ArgumentParser(
        description="Quick test: raw news -> PydanticAI sentiment classification."
    )
    parser.add_argument(
        "--query",
        default="latest gold market news",
        help="Search query for news sentiment analysis.",
    )
    parser.add_argument(
        "--max-results",
        type=int,
        default=10,
        help="Max raw news results fetched from UnifiedSearchService.",
    )
    parser.add_argument(
        "--recency",
        default="week",
        help="Perplexity recency filter: day|week|month|year.",
    )
    parser.add_argument(
        "--model",
        default="gpt-4.1-mini",
        help="Model passed to PydanticAI Agent.",
    )
    parser.add_argument(
        "--max-articles",
        type=int,
        default=10,
        help="Max raw articles included in sentiment context.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print full JSON output.",
    )
    args = parser.parse_args()

    analyzer = NewsSentimentAnalyzer(
        model_name=args.model,
        max_articles_for_context=args.max_articles,
    )
    result = await analyzer.analyze_news_sentiment(
        query=args.query,
        max_results=args.max_results,
        search_recency_filter=args.recency,
    )

    if args.json:
        print(result.model_dump_json(indent=2))
        return

    print(f"query: {result.query}")
    print(f"generated_at: {result.generated_at.isoformat()}")
    print("\nper_news_sentiment:")
    for item in result.sentiments:
        source = item.source or "N/A"
        print(
            f"{item.article_index}. {item.title} [{source}] -> "
            f"{item.sentiment.value} (confidence={item.confidence})"
        )
        print(f"   {item.reasoning}")
        print(f"   {item.url}")


if __name__ == "__main__":
    asyncio.run(_quick_test_main())
