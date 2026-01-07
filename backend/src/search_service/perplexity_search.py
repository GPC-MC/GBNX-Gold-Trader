"""
Perplexity Search Provider

This module implements the Perplexity Search API integration for real-time
web search results with ranked results, domain filtering, and content extraction.
"""

import os
import httpx
import asyncio
from typing import List, Optional, Literal, Union
from datetime import datetime

from src.search_service.base import (
    BaseSearchProvider,
    SearchResponse,
    SearchResult,
    ImageResult,
    truncate_content,
    truncate_combined_content,
    MAX_CONTENT_PER_RESULT,
    MAX_TOTAL_CONTENT,
    MAX_RESULTS_FOR_SUMMARY,
)
from src.search_service.image_scraper import ImageScraper
from src.app_config import app_config
from src.llm import FallbackLLM


class PerplexitySearchProvider(BaseSearchProvider):
    """Perplexity Search provider with advanced filtering and content extraction"""

    BASE_URL = "https://api.perplexity.ai/search"

    def __init__(
        self,
        api_key: Optional[str] = None,
        max_results: int = 10,
        max_tokens: int = 25000,
        max_tokens_per_page: int = 2048,
        country: Optional[str] = None,
        search_language_filter: Optional[List[str]] = None,
        search_domain_filter: Optional[List[str]] = None,
        enable_image_scraping: bool = True,
        image_scraping_timeout: float = 5.0,
        image_scraping_max_concurrent: int = 5,
        **kwargs
    ):
        """
        Initialize Perplexity Search provider

        Args:
            api_key: Perplexity API key (defaults to app_config)
            max_results: Maximum number of search results (1-20, default 10)
            max_tokens: Maximum total tokens of webpage content (default 25000, max 1000000)
            max_tokens_per_page: Maximum tokens per page (default 2048)
            country: ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "DE")
            search_language_filter: List of ISO 639-1 language codes (max 10)
            search_domain_filter: List of domains to include/exclude (use "-" prefix to exclude)
            enable_image_scraping: Enable image scraping from result URLs (default True)
            image_scraping_timeout: Timeout for image scraping requests in seconds (default 5.0)
            image_scraping_max_concurrent: Max concurrent image scraping requests (default 5)
            **kwargs: Additional configuration
        """
        super().__init__(api_key, **kwargs)
        self.api_key = api_key or app_config.PERPLEXITY_API_KEY

        # Store configuration
        self.max_results = min(max(max_results, 1), 20)  # Clamp between 1-20
        self.max_tokens = min(max_tokens, 1000000)
        self.max_tokens_per_page = max_tokens_per_page
        self.country = country
        self.search_language_filter = search_language_filter or []
        self.search_domain_filter = search_domain_filter or []

        # Image scraping configuration
        self.enable_image_scraping = enable_image_scraping
        self.image_scraping_timeout = image_scraping_timeout
        self.image_scraping_max_concurrent = image_scraping_max_concurrent

        # Initialize image scraper if enabled
        if self.enable_image_scraping:
            self.image_scraper = ImageScraper(timeout=self.image_scraping_timeout)
        else:
            self.image_scraper = None

    @property
    def provider_name(self) -> str:
        return "perplexity"

    def _get_client_headers(self) -> dict:
        """Get headers for HTTP client"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _build_request_body(
        self,
        query: Union[str, List[str]],
        max_results: Optional[int] = None,
        country: Optional[str] = None,
        search_language_filter: Optional[List[str]] = None,
        search_domain_filter: Optional[List[str]] = None,
        max_tokens: Optional[int] = None,
        max_tokens_per_page: Optional[int] = None,
    ) -> dict:
        """Build request body for Perplexity API"""
        body = {
            "query": query,
            "max_results": max_results or self.max_results,
            "max_tokens": max_tokens or self.max_tokens,
            "max_tokens_per_page": max_tokens_per_page or self.max_tokens_per_page,
        }

        # Add optional country filter
        effective_country = country or self.country
        if effective_country:
            body["country"] = effective_country

        # Add optional language filter (max 10)
        effective_lang_filter = search_language_filter or self.search_language_filter
        if effective_lang_filter:
            body["search_language_filter"] = effective_lang_filter[:10]

        # Add optional domain filter (max 20)
        effective_domain_filter = search_domain_filter or self.search_domain_filter
        if effective_domain_filter:
            body["search_domain_filter"] = effective_domain_filter[:20]

        return body

    async def _parse_perplexity_response(
        self,
        query: Union[str, List[str]],
        raw_response: dict
    ) -> SearchResponse:
        """Parse raw Perplexity response into SearchResponse model"""
        results = []
        raw_results = raw_response.get("results", [])

        # Handle multi-query response (results grouped per query)
        if isinstance(query, list) and len(query) > 1:
            # Flatten multi-query results
            for query_results in raw_results:
                if isinstance(query_results, list):
                    for item in query_results:
                        results.append(self._parse_result_item(item))
                else:
                    results.append(self._parse_result_item(query_results))
        else:
            # Single query response
            for item in raw_results:
                results.append(self._parse_result_item(item))

        # Scrape images from URLs if enabled
        if self.enable_image_scraping and self.image_scraper and results:
            try:
                # Extract URLs from results
                urls = [str(result.url) for result in results]

                # Batch scrape images concurrently
                image_urls = await self.image_scraper.scrape_images_batch(
                    urls,
                    max_concurrent=self.image_scraping_max_concurrent
                )

                # Assign images to results
                for result, image_url in zip(results, image_urls):
                    if image_url and not isinstance(image_url, Exception):
                        result.image_url = image_url
            except Exception as e:
                print(f"Error during batch image scraping: {e}")
                # Continue without images if scraping fails

        # Parse query for response (use first query if multi-query)
        response_query = query[0] if isinstance(query, list) else query
        return SearchResponse(
            query=response_query,
            provider=self.provider_name,
            results=results,
            images=[],  # Perplexity Search API doesn't return image results separately
            total_results=len(results),
            metadata={
                "multi_query": isinstance(query, list) and len(query) > 1,
                "queries": query if isinstance(query, list) else [query],
                "images_scraped": self.enable_image_scraping and self.image_scraper is not None,
            }
        )

    def _parse_result_item(self, item: dict) -> SearchResult:
        """Parse a single result item from Perplexity response"""
        # Parse publication date if available
        published_at = None
        date_str = item.get("date") or item.get("published_at")
        if date_str:
            try:
                published_at = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pass

        return SearchResult(
            title=item.get("title", ""),
            url=item.get("url", ""),
            content=item.get("snippet") or item.get("content"),
            snippet=item.get("snippet"),
            score=item.get("score"),
            published_at=published_at,
            source=item.get("source") or self._extract_domain(item.get("url", "")),
            raw_content=item.get("content"),
        )

    def _extract_domain(self, url: str) -> Optional[str]:
        """Extract domain from URL"""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return parsed.netloc
        except Exception:
            return None

    async def search(
        self,
        query: Union[str, List[str]],
        max_results: int = 10,
        country: Optional[str] = None,
        search_language_filter: Optional[List[str]] = None,
        search_domain_filter: Optional[List[str]] = None,
        max_tokens: Optional[int] = None,
        max_tokens_per_page: Optional[int] = None,
        **kwargs
    ) -> SearchResponse:
        """
        Perform Perplexity search

        Args:
            query: Search query string or list of queries (max 5 for multi-query)
            max_results: Maximum number of results to return (1-20)
            country: ISO country code for regional results
            search_language_filter: List of ISO 639-1 language codes
            search_domain_filter: List of domains (use "-" prefix to exclude)
            max_tokens: Maximum total tokens across all results
            max_tokens_per_page: Maximum tokens per page
            **kwargs: Additional search parameters

        Returns:
            SearchResponse object containing results
        """
        # Limit multi-query to 5 queries
        if isinstance(query, list):
            query = query[:5]

        body = self._build_request_body(
            query=query,
            max_results=min(max_results, 20),
            country=country,
            search_language_filter=search_language_filter,
            search_domain_filter=search_domain_filter,
            max_tokens=max_tokens,
            max_tokens_per_page=max_tokens_per_page,
        )

        # Use a fresh client per request to avoid event loop issues
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            headers=self._get_client_headers()
        ) as client:
            response = await client.post(self.BASE_URL, json=body)
            response.raise_for_status()
            raw_response = response.json()
            return await self._parse_perplexity_response(query, raw_response)

    def   search_sync(
        self,
        query: Union[str, List[str]],
        max_results: int = 10,
        country: Optional[str] = None,
        search_language_filter: Optional[List[str]] = None,
        search_domain_filter: Optional[List[str]] = None,
        max_tokens: Optional[int] = None,
        max_tokens_per_page: Optional[int] = None,
        **kwargs
    ) -> SearchResponse:
        """
        Synchronous version of search

        Args:
            query: Search query string or list of queries
            max_results: Maximum number of results to return
            country: ISO country code for regional results
            search_language_filter: List of ISO 639-1 language codes
            search_domain_filter: List of domains
            max_tokens: Maximum total tokens across all results
            max_tokens_per_page: Maximum tokens per page
            **kwargs: Additional search parameters

        Returns:
            SearchResponse object containing results
        """
        # Limit multi-query to 5 queries
        if isinstance(query, list):
            query = query[:5]

        body = self._build_request_body(
            query=query,
            max_results=min(max_results, 20),
            country=country,
            search_language_filter=search_language_filter,
            search_domain_filter=search_domain_filter,
            max_tokens=max_tokens,
            max_tokens_per_page=max_tokens_per_page,
        )

        with httpx.Client(
            timeout=httpx.Timeout(30.0),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
        ) as client:
            response = client.post(self.BASE_URL, json=body)
            response.raise_for_status()

            raw_response = response.json()
            # Use asyncio.run to call async parsing method (includes image scraping)
            return asyncio.run(self._parse_perplexity_response(query, raw_response))

    def update_config(
        self,
        max_results: Optional[int] = None,
        country: Optional[str] = None,
        search_language_filter: Optional[List[str]] = None,
        search_domain_filter: Optional[List[str]] = None,
        max_tokens: Optional[int] = None,
        max_tokens_per_page: Optional[int] = None,
        enable_image_scraping: Optional[bool] = None,
        image_scraping_timeout: Optional[float] = None,
        image_scraping_max_concurrent: Optional[int] = None,
    ):
        """
        Update Perplexity search configuration

        Args:
            max_results: Maximum number of results (1-20)
            country: ISO country code
            search_language_filter: List of language codes
            search_domain_filter: List of domains
            max_tokens: Maximum total tokens
            max_tokens_per_page: Maximum tokens per page
            enable_image_scraping: Enable/disable image scraping
            image_scraping_timeout: Timeout for image scraping
            image_scraping_max_concurrent: Max concurrent image requests
        """
        if max_results is not None:
            self.max_results = min(max(max_results, 1), 20)
        if country is not None:
            self.country = country
        if search_language_filter is not None:
            self.search_language_filter = search_language_filter[:10]
        if search_domain_filter is not None:
            self.search_domain_filter = search_domain_filter[:20]
        if max_tokens is not None:
            self.max_tokens = min(max_tokens, 1000000)
        if max_tokens_per_page is not None:
            self.max_tokens_per_page = max_tokens_per_page

        # Update image scraping configuration
        if enable_image_scraping is not None:
            self.enable_image_scraping = enable_image_scraping
            # Reinitialize scraper if enabling, or set to None if disabling
            if enable_image_scraping and self.image_scraper is None:
                self.image_scraper = ImageScraper(timeout=self.image_scraping_timeout)
            elif not enable_image_scraping:
                self.image_scraper = None

        if image_scraping_timeout is not None:
            self.image_scraping_timeout = image_scraping_timeout
            # Update scraper timeout if it exists
            if self.image_scraper:
                self.image_scraper.timeout = image_scraping_timeout

        if image_scraping_max_concurrent is not None:
            self.image_scraping_max_concurrent = image_scraping_max_concurrent

    async def summarize_results(self, query: str, response) -> str:
        """
        Summarize Perplexity search results using LLM with a structured extraction format.

        Output format (repeat per source):
            - Headline:
            - Summary:
            - Url:
            - Score:

        Args:
            query: The original search query
            response: SearchResponse containing results to summarize

        Returns:
            Summarized content as a string
        """
        combined_content = response[:MAX_TOTAL_CONTENT]

        system_prompt = f"""
You are a helpful assistant that extracts and synthesizes information from web search results.

Your task:
- Read multiple search results related to the query: "{query}"
- Extract useful information from each source
- Ignore any source that does not contain meaningful content
- Do NOT invent facts or URLs
- Pay attention to relevance scores (higher is better)

Your output MUST follow this exact format.
Repeat the block for EACH valid source.

Output format:
- Headline: concise title capturing the main idea of the page
- Content: a detailed content in a paragraph or multiple paragraph
- Url: original source URL
- Image link: image URL if available

Search results:
{combined_content}
"""
        llm = FallbackLLM(openai_model="gpt-4.1-nano")
        llm_response = await llm.ainvoke(system_prompt)
        summary = llm_response.content
        return summary



    async def search_and_summarize(
        self,
        query: str,
        max_results: int = 40,
        **kwargs
    ) -> dict:
        """
        Search and summarize results in one call

        Args:
            query: Search query string
            max_results: Maximum number of results to return
            **kwargs: Additional search parameters

        Returns:
            Dictionary with 'response', 'summary', and 'provider' keys
        """
        response = await self.search(query, max_results, **kwargs)

        format_response = []

        for res in response.results:
            format_response.append(f"""
            - Headline: {res.title}
            - Content: {res.content}
            - Url: {res.url}
            - Image link: {res.image_url}
            """)
        format_response = "\n".join(format_response)
        summary = await self.summarize_results(query, format_response)

        return {
            'provider': self.provider_name,
            'response': response,
            'summary': summary,
            'query': query,
            'total_results': response.total_results,
        }

    async def multi_query_search(
        self,
        queries: List[str],
        max_results: int = 5,
        **kwargs
    ) -> SearchResponse:
        """
        Execute multiple related queries in a single request

        Args:
            queries: List of search queries (max 5)
            max_results: Maximum results per query
            **kwargs: Additional search parameters

        Returns:
            SearchResponse with aggregated results from all queries
        """
        return await self.search(
            query=queries[:5],
            max_results=max_results,
            **kwargs
        )

    async def search_with_domain_allowlist(
        self,
        query: str,
        domains: List[str],
        max_results: int = 10,
        **kwargs
    ) -> SearchResponse:
        """
        Search limited to specific domains (allowlist mode)

        Args:
            query: Search query string
            domains: List of domains to include (max 20)
            max_results: Maximum number of results
            **kwargs: Additional parameters

        Returns:
            SearchResponse with results only from specified domains
        """
        return await self.search(
            query=query,
            max_results=max_results,
            search_domain_filter=domains[:20],
            **kwargs
        )

    async def search_with_domain_denylist(
        self,
        query: str,
        domains: List[str],
        max_results: int = 10,
        **kwargs
    ) -> SearchResponse:
        """
        Search excluding specific domains (denylist mode)

        Args:
            query: Search query string
            domains: List of domains to exclude (without "-" prefix)
            max_results: Maximum number of results
            **kwargs: Additional parameters

        Returns:
            SearchResponse excluding specified domains
        """
        # Add "-" prefix to each domain for denylist mode
        denylist = [f"-{domain}" if not domain.startswith("-") else domain 
                    for domain in domains]
        return await self.search(
            query=query,
            max_results=max_results,
            search_domain_filter=denylist[:20],
            **kwargs
        )

    async def regional_search(
        self,
        query: str,
        country: str,
        max_results: int = 10,
        **kwargs
    ) -> SearchResponse:
        """
        Search with regional filtering

        Args:
            query: Search query string
            country: ISO 3166-1 alpha-2 country code
            max_results: Maximum number of results
            **kwargs: Additional parameters

        Returns:
            SearchResponse with regionally relevant results
        """
        return await self.search(
            query=query,
            max_results=max_results,
            country=country,
            **kwargs
        )

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - no cleanup needed with per-request clients"""
        pass


if __name__ == "__main__":  
    import asyncio
    from src.search_service.perplexity_search import PerplexitySearchProvider
    provider = PerplexitySearchProvider()
    response = provider.search_sync("What is the weather in Tokyo?")
    # response = asyncio.run(provider.search_and_summarize("What is the weather in Tokyo?"))
    print(response)
    print("-------------------------------- RESPONSE PERPLEXITY--------------------------------")