"""
Unified Search Service

This module provides a unified interface to search across multiple providers
(Google Custom Search, NewsAPI, Tavily) with automatic fallback and aggregation.
"""

import asyncio
import time
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime

from src.search_service.base import (
    BaseSearchProvider,
    SearchResponse,
    SearchResult,
)
from src.search_service.google_search import GoogleSearchProvider
from src.search_service.news_api_search import NewsAPISearchProvider
from src.search_service.tavily_search import TavilySearchProvider
from src.search_service.perplexity_search import PerplexitySearchProvider


class UnifiedSearchService:
    """
    Unified search service that combines multiple search providers.

    This service allows searching across Google, NewsAPI, and Tavily,
    either individually or in combination.
    """

    def __init__(
        self,
        google_api_key: Optional[str] = None,
        google_search_engine_id: Optional[str] = None,
        newsapi_key: Optional[str] = None,
        tavily_api_key: Optional[str] = None,
        perplexity_api_key: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize unified search service with all providers

        Args:
            google_api_key: Google Custom Search API key
            google_search_engine_id: Google Custom Search Engine ID
            newsapi_key: NewsAPI key
            tavily_api_key: Tavily API key
            perplexity_api_key: Perplexity API key
            **kwargs: Additional provider-specific configuration
        """
        # Initialize providers (lazy loading - only if needed)
        self._google_provider = None
        self._newsapi_provider = None
        self._tavily_provider = None
        self._perplexity_provider = None

        # Store credentials
        self._google_api_key = google_api_key
        self._google_search_engine_id = google_search_engine_id
        self._newsapi_key = newsapi_key
        self._tavily_api_key = tavily_api_key
        self._perplexity_api_key = perplexity_api_key
        self._config = kwargs

    @property
    def google(self) -> GoogleSearchProvider:
        """Lazy-load Google search provider"""
        if self._google_provider is None:
            self._google_provider = GoogleSearchProvider(
                api_key=self._google_api_key,
                search_engine_id=self._google_search_engine_id,
                **self._config.get("google", {})
            )
        return self._google_provider

    @property
    def newsapi(self) -> NewsAPISearchProvider:
        """Lazy-load NewsAPI search provider"""
        if self._newsapi_provider is None:
            self._newsapi_provider = NewsAPISearchProvider(
                api_key=self._newsapi_key,
                **self._config.get("newsapi", {})
            )
        return self._newsapi_provider

    @property
    def tavily(self) -> TavilySearchProvider:
        """Lazy-load Tavily search provider"""
        if self._tavily_provider is None:
            self._tavily_provider = TavilySearchProvider(
                api_key=self._tavily_api_key,
                **self._config.get("tavily", {})
            )
        return self._tavily_provider

    @property
    def perplexity(self) -> PerplexitySearchProvider:
        """Lazy-load Perplexity search provider"""
        if self._perplexity_provider is None:
            self._perplexity_provider = PerplexitySearchProvider(
                api_key=self._perplexity_api_key,
                **self._config.get("perplexity", {})
            )
        return self._perplexity_provider


    async def search_and_summarize_all(
        self,
        query: str,
        max_results: int = 10,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Search across all providers sequentially, summarize each, and concatenate results

        This is the unified function that:
        1. Calls each service (Google, NewsAPI, Tavily) sequentially
        2. Summarizes each result using provider-specific summarization
        3. Concatenates the final summaries

        Args:
            query: Search query string
            max_results: Maximum number of results per provider
            **kwargs: Provider-specific parameters

        Returns:
            Dictionary with:
            - 'query': The search query
            - 'providers': Dict mapping provider names to their summarized results
            - 'combined_summary': Concatenated summary from all providers
            - 'total_results': Total number of results across all providers
            - 'metadata': Additional metadata
        """

        # start_time = time.perf_counter()
        # google_response = await self.google.search_and_summarize(query, max_results, **kwargs)
        # print(f"Google response time: {time.perf_counter() - start_time:.2f} seconds")
        # start_time = time.perf_counter()
        perplexity_response = await self.perplexity.search_and_summarize(query, max_results, **kwargs)
        # print(f"Perplexity response time: {time.perf_counter() - start_time:.2f} seconds")
        # response = google_response + perplexity_response

        return perplexity_response

    async def search_raw_news(
        self,
        query: str,
        max_results: int = 10,
        **kwargs
    ) -> SearchResponse:
        """
        Fetch raw news search results through the unified service.

        This intentionally skips LLM summarization and returns provider results
        directly, so downstream modules can perform their own post-processing.
        """
        return await self.perplexity.search(query=query, max_results=max_results, **kwargs)


        # import pdb; pdb.set_trace()
        # return {
        #     'query': query,
        #     'response': response,
        #     'total_results': response.total_results
        # }

if __name__ == "__main__":
    async def main():
        service = UnifiedSearchService()
        query = "latest news about US attacks Venezuela"
        query = "What is the weather in Tokyo?"

        print(f"Query: {query}\n")
        start_time = time.perf_counter()
        result = await service.search_and_summarize_all(
            query,
            max_results=30
        )
        end_time = time.perf_counter()
        response_time = end_time - start_time
        print(f"Results: {result}")
        print("\n" + "=" * 80)
        print(f"Response Time: {response_time:.2f} seconds")
    asyncio.run(main())
