"""
Perplexity Search Provider

This module implements the Perplexity Search API integration for real-time
web search results with ranked results, domain filtering, and content extraction.
"""

import os
import httpx
import asyncio
import re
from typing import List, Optional, Literal, Union
from datetime import datetime
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
import os

load_dotenv()

# Date format validation regex for Perplexity API (%m/%d/%Y)
DATE_FORMAT_REGEX = r'^(0?[1-9]|1[0-2])/(0?[1-9]|[12]\d|3[01])/\d{4}$'


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
        search_recency_filter: Optional[Literal["day", "week", "month", "year"]] = None,
        search_after_date_filter: Optional[str] = None,
        search_before_date_filter: Optional[str] = None,
        last_updated_after_filter: Optional[str] = None,
        last_updated_before_filter: Optional[str] = None,
        enable_image_scraping: bool = True,
        image_scraping_timeout: float = 5.0,
        image_scraping_max_concurrent: int = 5,
        **kwargs,
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
            search_recency_filter: Filter by recency - "day", "week", "month", or "year" (default None)
            search_after_date_filter: Only include content published after this date (format: "%m/%d/%Y")
            search_before_date_filter: Only include content published before this date (format: "%m/%d/%Y")
            last_updated_after_filter: Only include content updated after this date (format: "%m/%d/%Y")
            last_updated_before_filter: Only include content updated before this date (format: "%m/%d/%Y")
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

        # Date and time filters
        self.search_recency_filter = search_recency_filter
        self.search_after_date_filter = self._validate_date_format(search_after_date_filter)
        self.search_before_date_filter = self._validate_date_format(search_before_date_filter)
        self.last_updated_after_filter = self._validate_date_format(last_updated_after_filter)
        self.last_updated_before_filter = self._validate_date_format(last_updated_before_filter)

        # Image scraping configuration
        self.enable_image_scraping = enable_image_scraping
        self.image_scraping_timeout = image_scraping_timeout
        self.image_scraping_max_concurrent = image_scraping_max_concurrent

        # Initialize image scraper if enabled
        if self.enable_image_scraping:
            self.image_scraper = ImageScraper(timeout=self.image_scraping_timeout)
        else:
            self.image_scraper = None
        
        self.llm = ChatOpenAI(model="gpt-4.1-nano",
        base_url=os.getenv("LITE_LLM_ENDPOINT_URL"),
        api_key=os.getenv("LITE_LLM_API_KEY"))

    @property
    def provider_name(self) -> str:
        return "perplexity"

    def _validate_date_format(self, date_str: Optional[str]) -> Optional[str]:
        """
        Validate date format for Perplexity API (%m/%d/%Y)

        Args:
            date_str: Date string to validate

        Returns:
            Validated date string or None

        Raises:
            ValueError: If date format is invalid
        """
        if date_str is None:
            return None

        if not re.match(DATE_FORMAT_REGEX, date_str):
            raise ValueError(
                f"Invalid date format: '{date_str}'. "
                f"Expected format: %m/%d/%Y (e.g., '3/1/2025' or '03/01/2025')"
            )

        return date_str

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
        search_recency_filter: Optional[Literal["day", "week", "month", "year"]] = None,
        search_after_date_filter: Optional[str] = None,
        search_before_date_filter: Optional[str] = None,
        last_updated_after_filter: Optional[str] = None,
        last_updated_before_filter: Optional[str] = None,
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

        # Add optional search recency filter
        effective_recency_filter = search_recency_filter or self.search_recency_filter
        if effective_recency_filter:
            body["search_recency_filter"] = effective_recency_filter

        # Add optional publication date filters (validate format)
        effective_after_date = self._validate_date_format(
            search_after_date_filter or self.search_after_date_filter
        )
        if effective_after_date:
            body["search_after_date_filter"] = effective_after_date

        effective_before_date = self._validate_date_format(
            search_before_date_filter or self.search_before_date_filter
        )
        if effective_before_date:
            body["search_before_date_filter"] = effective_before_date

        # Add optional last updated date filters (validate format)
        effective_updated_after = self._validate_date_format(
            last_updated_after_filter or self.last_updated_after_filter
        )
        if effective_updated_after:
            body["last_updated_after_filter"] = effective_updated_after

        effective_updated_before = self._validate_date_format(
            last_updated_before_filter or self.last_updated_before_filter
        )
        if effective_updated_before:
            body["last_updated_before_filter"] = effective_updated_before

        return body

    async def _parse_perplexity_response(
        self, query: Union[str, List[str]], raw_response: dict
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
                    urls, max_concurrent=self.image_scraping_max_concurrent
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
                "images_scraped": self.enable_image_scraping
                and self.image_scraper is not None,
            },
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
        search_recency_filter: Optional[Literal["day", "week", "month", "year"]] = None,
        search_after_date_filter: Optional[str] = None,
        search_before_date_filter: Optional[str] = None,
        last_updated_after_filter: Optional[str] = None,
        last_updated_before_filter: Optional[str] = None,
        max_tokens: Optional[int] = None,
        max_tokens_per_page: Optional[int] = None,
        **kwargs,
    ) -> SearchResponse:
        """
        Perform Perplexity search

        Args:
            query: Search query string or list of queries (max 5 for multi-query)
            max_results: Maximum number of results to return (1-20)
            country: ISO country code for regional results
            search_language_filter: List of ISO 639-1 language codes
            search_domain_filter: List of domains (use "-" prefix to exclude)
            search_recency_filter: Filter by recency - "day", "week", "month", or "year"
            search_after_date_filter: Only include content published after this date (%m/%d/%Y)
            search_before_date_filter: Only include content published before this date (%m/%d/%Y)
            last_updated_after_filter: Only include content updated after this date (%m/%d/%Y)
            last_updated_before_filter: Only include content updated before this date (%m/%d/%Y)
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
            search_recency_filter=search_recency_filter,
            search_after_date_filter=search_after_date_filter,
            search_before_date_filter=search_before_date_filter,
            last_updated_after_filter=last_updated_after_filter,
            last_updated_before_filter=last_updated_before_filter,
            max_tokens=max_tokens,
            max_tokens_per_page=max_tokens_per_page,
        )

        # Use a fresh client per request to avoid event loop issues
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(30.0), headers=self._get_client_headers()
        ) as client:
            response = await client.post(self.BASE_URL, json=body)
            response.raise_for_status()
            raw_response = response.json()
            return await self._parse_perplexity_response(query, raw_response)

    def search_sync(
        self,
        query: Union[str, List[str]],
        max_results: int = 10,
        country: Optional[str] = None,
        search_language_filter: Optional[List[str]] = None,
        search_domain_filter: Optional[List[str]] = None,
        search_recency_filter: Optional[Literal["day", "week", "month", "year"]] = None,
        search_after_date_filter: Optional[str] = None,
        search_before_date_filter: Optional[str] = None,
        last_updated_after_filter: Optional[str] = None,
        last_updated_before_filter: Optional[str] = None,
        max_tokens: Optional[int] = None,
        max_tokens_per_page: Optional[int] = None,
        **kwargs,
    ) -> SearchResponse:
        """
        Synchronous version of search

        Args:
            query: Search query string or list of queries
            max_results: Maximum number of results to return
            country: ISO country code for regional results
            search_language_filter: List of ISO 639-1 language codes
            search_domain_filter: List of domains
            search_recency_filter: Filter by recency - "day", "week", "month", or "year"
            search_after_date_filter: Only include content published after this date (%m/%d/%Y)
            search_before_date_filter: Only include content published before this date (%m/%d/%Y)
            last_updated_after_filter: Only include content updated after this date (%m/%d/%Y)
            last_updated_before_filter: Only include content updated before this date (%m/%d/%Y)
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
            search_recency_filter=search_recency_filter,
            search_after_date_filter=search_after_date_filter,
            search_before_date_filter=search_before_date_filter,
            last_updated_after_filter=last_updated_after_filter,
            last_updated_before_filter=last_updated_before_filter,
            max_tokens=max_tokens,
            max_tokens_per_page=max_tokens_per_page,
        )

        with httpx.Client(
            timeout=httpx.Timeout(30.0),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
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
        search_recency_filter: Optional[Literal["day", "week", "month", "year"]] = None,
        search_after_date_filter: Optional[str] = None,
        search_before_date_filter: Optional[str] = None,
        last_updated_after_filter: Optional[str] = None,
        last_updated_before_filter: Optional[str] = None,
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
            search_recency_filter: Filter by recency - "day", "week", "month", or "year"
            search_after_date_filter: Only include content published after this date (%m/%d/%Y)
            search_before_date_filter: Only include content published before this date (%m/%d/%Y)
            last_updated_after_filter: Only include content updated after this date (%m/%d/%Y)
            last_updated_before_filter: Only include content updated before this date (%m/%d/%Y)
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
        if search_recency_filter is not None:
            self.search_recency_filter = search_recency_filter
        if search_after_date_filter is not None:
            self.search_after_date_filter = self._validate_date_format(search_after_date_filter)
        if search_before_date_filter is not None:
            self.search_before_date_filter = self._validate_date_format(search_before_date_filter)
        if last_updated_after_filter is not None:
            self.last_updated_after_filter = self._validate_date_format(last_updated_after_filter)
        if last_updated_before_filter is not None:
            self.last_updated_before_filter = self._validate_date_format(last_updated_before_filter)
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

    async def summarize_results(self, query: str, format_response: str) -> str:
        """
        Summarize Perplexity search results using LLM with a structured extraction format.

        Output format (repeat per source):
            - Title:
            - Published:
            - URL:
            - Image URL:
            - Content:

        Args:
            query: The original search query
            format_response: Formatted response string containing results to summarize

        Returns:
            Summarized content as a string
        """
        combined_content = format_response
        
        # Get current date for context
        current_date = datetime.now().strftime("%Y-%m-%d")

        system_prompt = f"""
            You are a helpful assistant that extracts and synthesizes information from web search results.
            
            IMPORTANT: Today's date is {current_date}. Use this to determine which information is current and recent.

            Your task:
            - Read multiple search results related to the query: "{query}"
            - Extract useful information from each source
            - Prioritize the most recent information based on publication dates
            - For news queries, focus on articles published within the last few days
            - Ignore any source that does not contain meaningful content or is significantly outdated
            - Do NOT invent facts or URLs
            - Pay attention to relevance scores (higher is better)
            - When summarizing news, mention how recent the information is (e.g., "as of [date]")

            Your output MUST follow this exact format.
            Repeat the block for EACH valid source.

            Output format:
            - Title: concise title capturing the main idea of the page
            - Published: publication date in YYYY-MM-DD format or "N/A" if not available
            - URL: original source URL
            - Image URL: image URL if available, otherwise "N/A"
            - Content: a detailed content in a paragraph or multiple paragraph

            Search results:
            {combined_content}
        """
        response = await self.llm.ainvoke([HumanMessage(content=system_prompt)])
        return response.content if hasattr(response, 'content') else str(response)


    async def search_and_summarize(
        self, query: str, max_results: int = 40, **kwargs
    ) -> dict:
        """
        Search and summarize results in one call

        Args:
            query: Search query string
            max_results: Maximum number of results to return
            **kwargs: Additional search parameters (including search_recency_filter)

        Returns:
            Dictionary with 'response', 'summary', and 'provider' keys
        """
        # Default to "week" recency filter for news queries if not specified
        if "search_recency_filter" not in kwargs and any(
            keyword in query.lower() for keyword in ["latest", "news", "recent", "current", "today"]
        ):
            kwargs["search_recency_filter"] = "week"

        response = await self.search(query, max_results, **kwargs)
        format_response_parts = []
        for res in response.results:
            image_url_str = str(res.image_url) if res.image_url else "N/A"
            published_str = (
                res.published_at.strftime("%Y-%m-%d %H:%M:%S")
                if res.published_at
                else "N/A"
            )
            text_content = res.snippet if res.snippet else res.content or ""
            sub_string = f"""
                    - Title: {res.title}
                    - Published: {published_str}
                    - URL: {res.url}
                    - Image URL: {image_url_str}
                    - Content: {text_content}
            """
            format_response_parts.append(sub_string)

        format_response = "\n".join(format_response_parts)
        summary = await self.summarize_results(query, format_response)

        return summary

if __name__ == "__main__":
    import asyncio
    provider = PerplexitySearchProvider()
    response = asyncio.run(provider.search_and_summarize("get latest news about bitcoin 1st Feb 2026"))
    print(response)
    print(
        "-------------------------------- RESPONSE PERPLEXITY--------------------------------"
    )

