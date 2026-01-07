"""
Search Service Module

This module provides unified search functionality across multiple providers:
- Perplexity Search (enabled)
- Tavily Search (enabled)
- Google Custom Search API (available but not enabled by default)
- NewsAPI (available but not enabled by default)

Usage:
    from src.search_service import UnifiedSearchService

    search_service = UnifiedSearchService()
    results = await search_service.search("AI technology trends", provider="all")
"""

from src.search_service.base import (
    BaseSearchProvider,
    SearchResult,
    ImageResult,
    truncate_content,
    truncate_combined_content,
    MAX_CONTENT_PER_RESULT,
    MAX_TOTAL_CONTENT,
    MAX_RESULTS_FOR_SUMMARY,
)
from src.search_service.perplexity_search import PerplexitySearchProvider
from src.search_service.tavily_search import TavilySearchProvider
from src.search_service.google_search import GoogleSearchProvider
from src.search_service.news_api_search import NewsAPISearchProvider
from src.search_service.unified_search import UnifiedSearchService

__all__ = [
    "BaseSearchProvider",
    "SearchResult",
    "ImageResult",
    "truncate_content",
    "truncate_combined_content",
    "MAX_CONTENT_PER_RESULT",
    "MAX_TOTAL_CONTENT",
    "MAX_RESULTS_FOR_SUMMARY",
    "PerplexitySearchProvider",
    "TavilySearchProvider",
    "GoogleSearchProvider",
    "NewsAPISearchProvider",
    "UnifiedSearchService",
]
