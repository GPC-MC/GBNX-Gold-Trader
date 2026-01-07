"""
Unified Search Service

This module provides a unified interface to search across multiple providers
(Perplexity, Tavily) with automatic fallback and aggregation.
"""

import asyncio
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime

from src.search_service.base import (
    BaseSearchProvider,
    SearchResponse,
    SearchResult,
)
from src.search_service.perplexity_search import PerplexitySearchProvider
from src.search_service.tavily_search import TavilySearchProvider
from src.search_service.google_search import GoogleSearchProvider


class UnifiedSearchService:
    """
    Unified search service that combines multiple search providers.

    This service allows searching across Perplexity, Google, and Tavily,
    either individually or in combination.
    """

    def __init__(
        self,
        perplexity_api_key: Optional[str] = None,
        tavily_api_key: Optional[str] = None,
        google_api_key: Optional[str] = None,
        google_search_engine_id: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize unified search service with enabled providers

        Args:
            perplexity_api_key: Perplexity API key
            tavily_api_key: Tavily API key
            google_api_key: Google Custom Search API key
            google_search_engine_id: Google Custom Search Engine ID
            **kwargs: Additional provider-specific configuration
        """
        # Initialize providers (lazy loading - only if needed)
        self._perplexity_provider = None
        self._tavily_provider = None
        self._google_provider = None

        # Store credentials
        self._perplexity_api_key = perplexity_api_key
        self._tavily_api_key = tavily_api_key
        self._google_api_key = google_api_key
        self._google_search_engine_id = google_search_engine_id
        self._config = kwargs

    @property
    def perplexity(self) -> PerplexitySearchProvider:
        """Lazy-load Perplexity search provider"""
        if self._perplexity_provider is None:
            self._perplexity_provider = PerplexitySearchProvider(
                api_key=self._perplexity_api_key,
                **self._config.get("perplexity", {})
            )
        return self._perplexity_provider

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
    def google(self) -> GoogleSearchProvider:
        """Lazy-load Google search provider"""
        if self._google_provider is None:
            self._google_provider = GoogleSearchProvider(
                api_key=self._google_api_key,
                search_engine_id=self._google_search_engine_id,
                **self._config.get("google", {})
            )
        return self._google_provider

    async def search(
        self,
        query: str,
        provider: Literal["perplexity", "tavily", "google", "all"] = "all",
        max_results: int = 10,
        **kwargs
    ) -> SearchResponse | Dict[str, SearchResponse]:
        """
        Search using one or all providers

        Args:
            query: Search query string
            provider: Which provider to use ("perplexity", "tavily", "google", or "all")
            max_results: Maximum number of results per provider
            **kwargs: Provider-specific parameters

        Returns:
            SearchResponse if single provider, Dict[str, SearchResponse] if "all"
        """
        if provider == "perplexity":
            return await self.perplexity.search(query, max_results, **kwargs)
        elif provider == "tavily":
            return await self.tavily.search(query, max_results, **kwargs)
        elif provider == "google":
            return await self.google.search(query, max_results, **kwargs)
        elif provider == "all":
            return await self.search_all(query, max_results, **kwargs)
        else:
            raise ValueError(f"Unknown provider: {provider}")

    def search_sync(
        self,
        query: str,
        provider: Literal["perplexity", "tavily", "google", "all"] = "all",
        max_results: int = 10,
        **kwargs
    ) -> SearchResponse | Dict[str, SearchResponse]:
        """
        Synchronous version of search

        Args:
            query: Search query string
            provider: Which provider to use
            max_results: Maximum number of results per provider
            **kwargs: Provider-specific parameters

        Returns:
            SearchResponse if single provider, Dict[str, SearchResponse] if "all"
        """
        if provider == "perplexity":
            return self.perplexity.search_sync(query, max_results, **kwargs)
        elif provider == "tavily":
            return self.tavily.search_sync(query, max_results, **kwargs)
        elif provider == "google":
            return self.google.search_sync(query, max_results, **kwargs)
        elif provider == "all":
            return asyncio.run(self.search_all(query, max_results, **kwargs))
        else:
            raise ValueError(f"Unknown provider: {provider}")

    async def search_all(
        self,
        query: str,
        max_results: int = 10,
        **kwargs
    ) -> Dict[str, SearchResponse]:
        """
        Search across all enabled providers (Perplexity, Google, and Tavily) concurrently

        Args:
            query: Search query string
            max_results: Maximum number of results per provider
            **kwargs: Provider-specific parameters

        Returns:
            Dictionary mapping provider names to their SearchResponse objects
        """
        tasks = {
            "perplexity": self.perplexity.search(query, max_results, **kwargs.get("perplexity", {})),
            "google": self.google.search(query, max_results, **kwargs.get("google", {})),
            "tavily": self.tavily.search(query, max_results, **kwargs.get("tavily", {})),
        }

        # Execute all searches concurrently
        results = {}
        try:
            responses = await asyncio.gather(*tasks.values(), return_exceptions=True)
            for (provider_name, _), response in zip(tasks.items(), responses):
                if isinstance(response, Exception):
                    print(f"Error searching with {provider_name}: {response}")
                    # Create empty response on error
                    results[provider_name] = SearchResponse(
                        query=query,
                        provider=provider_name,
                        results=[],
                        total_results=0,
                        metadata={"error": str(response)}
                    )
                else:
                    results[provider_name] = response
        except Exception as e:
            print(f"Error in search_all: {e}")

        return results

    async def aggregate_results(
        self,
        query: str,
        max_results: int = 30,
        deduplicate: bool = True,
        **kwargs
    ) -> SearchResponse:
        """
        Search all providers and aggregate results into a single response

        Args:
            query: Search query string
            max_results: Maximum total results to return
            deduplicate: Remove duplicate URLs
            **kwargs: Provider-specific parameters

        Returns:
            Single SearchResponse with aggregated results from all providers
        """
        start_time = datetime.now()

        # Get results from all providers
        all_responses = await self.search_all(query, max_results=max_results, **kwargs)

        # Aggregate results
        aggregated_results: List[SearchResult] = []
        seen_urls = set()
        all_images = []
        total_count = 0

        # Process results from each provider
        for provider_name, response in all_responses.items():
            total_count += response.total_results or len(response.results)

            # Add images (only from Tavily typically)
            if response.images:
                all_images.extend(response.images)

            # Add search results
            for result in response.results:
                url_str = str(result.url)

                if deduplicate and url_str in seen_urls:
                    continue

                seen_urls.add(url_str)
                aggregated_results.append(result)

        # Helper function to normalize datetime for sorting (handle timezone-aware and naive datetimes)
        def _get_sort_datetime(dt):
            """Convert datetime to naive for sorting, handling None and timezone-aware dates"""
            if dt is None:
                return datetime.min
            return dt.replace(tzinfo=None) if dt.tzinfo else dt

        # Sort by score if available, otherwise by publication date
        aggregated_results.sort(
            key=lambda x: (
                x.score if x.score is not None else 0,
                _get_sort_datetime(x.published_at)
            ),
            reverse=True
        )

        # Limit to max_results
        aggregated_results = aggregated_results[:max_results]

        # Get answer from Tavily if available
        answer = all_responses.get("tavily", SearchResponse(query="", provider="", results=[])).answer

        return SearchResponse(
            query=query,
            provider="unified",
            results=aggregated_results,
            images=all_images[:10],  # Limit images
            total_results=total_count,
            answer=answer,
            response_time=(datetime.now() - start_time).total_seconds(),
            metadata={
                "providers": list(all_responses.keys()),
                "deduplicated": deduplicate,
                "original_counts": {
                    name: len(resp.results)
                    for name, resp in all_responses.items()
                }
            }
        )

    def format_all_results(
        self,
        responses: Dict[str, SearchResponse],
        include_metadata: bool = True
    ) -> str:
        """
        Format results from all providers into a readable string

        Args:
            responses: Dictionary of provider responses
            include_metadata: Include metadata in output

        Returns:
            Formatted string representation
        """
        output = []
        output.append("=" * 80)
        output.append("UNIFIED SEARCH RESULTS")
        output.append("=" * 80)
        output.append("")

        for provider_name, response in responses.items():
            output.append(f"\n{'─' * 80}")
            output.append(f"Provider: {provider_name.upper()}")
            output.append(f"{'─' * 80}\n")

            if provider_name == "perplexity":
                formatted = self.perplexity.format_results(response)
            elif provider_name == "tavily":
                formatted = self.tavily.format_results(response)
            elif provider_name == "google":
                formatted = self.google.format_results(response)
            else:
                formatted = response.model_dump_json(indent=2)

            output.append(formatted)
            output.append("")

        return "\n".join(output)

    async def smart_search(
        self,
        query: str,
        max_results: int = 10,
        prefer_recent: bool = True,
        **kwargs
    ) -> SearchResponse:
        """
        Intelligent search that automatically selects the best provider(s) based on query

        Args:
            query: Search query string
            max_results: Maximum number of results
            prefer_recent: Prefer recent news results
            **kwargs: Additional parameters

        Returns:
            SearchResponse with best results
        """
        # Determine search strategy based on query
        query_lower = query.lower()

        # News-related queries
        news_keywords = ["news", "latest", "recent", "today", "breaking", "headline"]
        is_news_query = any(keyword in query_lower for keyword in news_keywords)

        # Crypto/web3 queries
        crypto_keywords = ["crypto", "bitcoin", "ethereum", "blockchain", "defi", "nft"]
        is_crypto_query = any(keyword in query_lower for keyword in crypto_keywords)

        if is_news_query or prefer_recent:
            # Prefer Tavily for news with recent time range
            return await self.tavily.search(
                query,
                max_results,
                **{"time_range": "day", **kwargs}
            )
        elif is_crypto_query:
            # Prefer Perplexity for crypto (has better crypto coverage)
            return await self.perplexity.search(query, max_results, **kwargs)
        else:
            # For general queries, use aggregated results from both providers
            return await self.aggregate_results(query, max_results, **kwargs)

    async def search_and_summarize_all(
        self,
        query: str,
        max_results: int = 40,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Search across all enabled providers (Perplexity, Google, and Tavily), summarize each, and concatenate results

        This is the unified function that:
        1. Calls each enabled service (Perplexity, Google, Tavily)
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
        # Run all searches concurrently
        tasks = {
            "perplexity": self.perplexity.search_and_summarize(
                query, max_results, **kwargs.get("perplexity", {})
            ),
            # "google": self.google.search_and_summarize(
            #     query, max_results, **kwargs.get("google", {})
            # ),
            # "tavily": self.tavily.search_and_summarize(
            #     query, max_results, **kwargs.get("tavily", {})
            # ),
        }

        # Execute all searches concurrently
        provider_results = {}
        try:
            responses = await asyncio.gather(*tasks.values(), return_exceptions=True)
            for (provider_name, _), response in zip(tasks.items(), responses):
                if isinstance(response, Exception):
                    print(f"Error searching with {provider_name}: {response}")
                    provider_results[provider_name] = {
                        'provider': provider_name,
                        'summary': f"Error: {str(response)}",
                        'query': query,
                        'total_results': 0,
                        'error': str(response)
                    }
                else:
                    provider_results[provider_name] = response
        except Exception as e:
            print(f"Error in search_and_summarize_all: {e}")

        # Concatenate all summaries
        combined_parts = []
        total_results = 0

        for provider_name in ["perplexity", "google", "tavily"]:
            if provider_name in provider_results:
                result = provider_results[provider_name]
                total_results += result.get('total_results', 0)

                # Add provider header
                # combined_parts.append(f"\n{'='*80}")
                # combined_parts.append(f"LATEST NEWS about {query}")
                # combined_parts.append(f"{'='*80}\n")

                # Add the summary
                summary = result.get('summary', 'No summary available')
                combined_parts.append(summary)
                combined_parts.append("\n")

        combined_summary = "\n".join(combined_parts)

        return {
            'query': query,
            'providers': provider_results,
            'combined_summary': combined_summary,
            'total_results': total_results,
            'metadata': {
                'providers_used': list(provider_results.keys()),
                'max_results_per_provider': max_results,
            }
        }

    async def search_and_summarize(
        self,
        query: str,
        provider: Literal["perplexity", "tavily", "google", "all"] = "all",
        max_results: int = 10,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Search and summarize using one or all enabled providers

        Args:
            query: Search query string
            provider: Which provider to use ("perplexity", "tavily", "google", or "all")
            max_results: Maximum number of results per provider
            **kwargs: Provider-specific parameters

        Returns:
            Dictionary with summarized results
        """
        if provider == "perplexity":
            return await self.perplexity.search_and_summarize(query, max_results, **kwargs)
        elif provider == "tavily":
            return await self.tavily.search_and_summarize(query, max_results, **kwargs)
        elif provider == "google":
            return await self.google.search_and_summarize(query, max_results, **kwargs)
        elif provider == "all":
            return await self.search_and_summarize_all(query, max_results, **kwargs)
        else:
            raise ValueError(f"Unknown provider: {provider}")


if __name__ == "__main__":
    async def main():
        """Example usage of search_and_summarize_all"""
        print("=" * 80)
        print("UNIFIED SEARCH - Search and Summarize All Providers")
        print("=" * 80 + "\n")

        # Initialize service
        service = UnifiedSearchService()

        # Example query
        query = "naruto anime"
        print(f"Query: {query}\n")

        # Search all providers with summarization
        result = await service.search_and_summarize_all(
            query,
            max_results=10
        )

        # Display results
        print(f"Total Results: {result['total_results']}")
        print(f"Providers Used: {', '.join(result['metadata']['providers_used'])}")
        print("\n" + "=" * 80)
        print("COMBINED SUMMARY:")
        print("=" * 80)
        print(result['combined_summary'])

    # Run the async main function
    asyncio.run(main())