"""
News sentiment module:
- Fetch raw news from UnifiedSearchService
- Classify sentiment in one PydanticAI pass
"""

from __future__ import annotations

import os
from datetime import datetime
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
    sentiment: SentimentClass
    reasoning: str = Field(min_length=20, max_length=800)
    confidence: float = Field(ge=0.0, le=1.0)


class RawNewsArticle(BaseModel):
    title: str
    url: str
    source: Optional[str] = None
    published_at: Optional[str] = None
    snippet: Optional[str] = None
    content: Optional[str] = None


class NewsSentimentResult(BaseModel):
    query: str
    generated_at: datetime
    sentiment: SentimentOutput
    raw_articles: list[RawNewsArticle]


SYSTEM_PROMPT = """
You are a market-news sentiment classifier for gold and macro-sensitive assets.

Rules:
- Use ONLY the provided raw news articles.
- Classify overall sentiment as one of: bullish, bearish, neutral.
- "Bullish" means news context likely supports higher gold prices or safe-haven demand.
- "Bearish" means news context likely pressures gold lower (e.g., stronger USD/yields, risk-on).
- "Neutral" means mixed/unclear signals or insufficient evidence.
- Reasoning must be concise and factual. Mention the key drivers from the articles.
- Confidence is a float from 0 to 1 based on clarity and consistency of evidence.
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
            output_type=SentimentOutput,
            retries=1,
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

        return NewsSentimentResult(
            query=query,
            generated_at=datetime.utcnow(),
            sentiment=run_result.output,
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
            f"Today: {datetime.utcnow().strftime('%Y-%m-%d')}",
            "Raw articles:",
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
