"""
Google Custom Search API Provider

This module implements the Google Custom Search API integration with
advanced content scraping capabilities.
"""

import asyncio
import html
import httpx
import urllib.parse
import random
from typing import List, Optional
from bs4 import BeautifulSoup
from datetime import datetime

from src.search_service.base import (
    BaseSearchProvider,
    SearchResponse,
    SearchResult,
)
from src.search_service.image_scraper import ImageScraper
from src.app_config import app_config
from src.llm import FallbackLLM


# Configuration constants
DOMAINS_BLACKLIST = ["quora.com", "www.quora.com"]
NUM_RESULTS_SLICE = 50
READ_TIMEOUT_SECS = 10
CONNECT_TIMEOUT_SECS = 5
CONTENT_LIMIT_TOKENS = 10000
MAX_RETRIES = 3
RETRY_DELAY = 1  # Base delay in seconds

# Rotating user agents to avoid blocking
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
]


class GoogleSearchProvider(BaseSearchProvider):
    """Google Custom Search API provider with advanced web scraping"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        search_engine_id: Optional[str] = None,
        max_workers: int = 5,
        enable_image_scraping: bool = True,
        image_scraping_timeout: float = 5.0,
        image_scraping_max_concurrent: int = 5,
        **kwargs
    ):
        """
        Initialize Google Search provider

        Args:
            api_key: Google Custom Search API key (defaults to app_config)
            search_engine_id: Google Custom Search Engine ID (defaults to app_config)
            max_workers: Maximum concurrent scraping workers
            enable_image_scraping: Enable image scraping from result URLs (default True)
            image_scraping_timeout: Timeout for image scraping requests in seconds (default 5.0)
            image_scraping_max_concurrent: Max concurrent image scraping requests (default 5)
            **kwargs: Additional configuration
        """
        super().__init__(api_key, **kwargs)
        self.api_key = api_key or app_config.GOOGLE_SEARCH_API_KEY
        self.search_engine_id = search_engine_id or app_config.GOOGLE_SEARCH_ENGINE_ID
        self.max_workers = max_workers

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
        return "google"

    def _get_random_headers(self) -> dict:
        """Generate headers with random user agent to avoid blocking."""
        return {
            'User-Agent': random.choice(USER_AGENTS),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
        }

    def _limit_tokens(self, input_string: str, N: int) -> str:
        """Limit string to N tokens (words)."""
        tokens = input_string.split()
        limited_tokens = tokens[:N]
        return ' '.join(limited_tokens)

    def _extract_text_from_soup(self, soup: BeautifulSoup) -> str:
        """
        Extract text from BeautifulSoup object using multiple strategies.

        Tries different extraction methods to get the best content:
        1. Main content areas (article, main tags)
        2. Paragraphs
        3. All visible text as fallback
        """
        # Remove unwanted elements
        for element in soup(["script", "style", "header", "footer", "nav", "aside", "iframe", "noscript"]):
            element.decompose()

        # Strategy 1: Try to find main content area
        main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=lambda x: x and any(
            keyword in x.lower() for keyword in ['content', 'article', 'post', 'entry', 'main']
        ))

        if main_content:
            text = ' '.join([p.get_text(strip=True) for p in main_content.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'li'])])
            if text and len(text) > 200:
                return text

        # Strategy 2: Extract from all paragraphs
        paragraphs = soup.find_all('p')
        if paragraphs:
            text = ' '.join([p.get_text(strip=True) for p in paragraphs])
            if text and len(text) > 100:
                return text

        # Strategy 3: Fallback to all visible text
        text = soup.get_text(separator=' ', strip=True)
        return text

    async def _query_google_api(self, query: str, client: httpx.AsyncClient, max_results: int = 10) -> List[dict]:
        """Query Google Custom Search API."""
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": self.api_key,
            "cx": self.search_engine_id,
            "q": query,
            "num": min(max_results, 10)  # Google API max is 10 per request
        }

        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            blob = response.json()

            if 'items' not in blob:
                return []

            results = []
            for idx, item in enumerate(blob['items']):
                link = item.get('link', '')
                link_parsed = urllib.parse.urlparse(link)

                if link_parsed.netloc in DOMAINS_BLACKLIST:
                    continue

                results.append({
                    'id': idx + 1,
                    'title': item.get('title', ''),
                    'url': link,
                    'snippet': item.get('snippet', ''),
                })

                if len(results) >= NUM_RESULTS_SLICE:
                    break

            return results

        except Exception as e:
            print(f"Error querying Google API: {e}")
            return []

    async def _scrape_webpage(self, url: str, client: httpx.AsyncClient, retry_count: int = 0) -> str:
        """
        Scrape webpage content with retry logic and improved extraction.

        Args:
            url: The URL to scrape
            client: httpx AsyncClient instance
            retry_count: Current retry attempt (for internal use)

        Returns:
            Extracted text content from the webpage
        """
        try:
            headers = self._get_random_headers()

            if retry_count == 0:
                await asyncio.sleep(random.uniform(0.1, 0.3))

            response = await client.get(
                url,
                timeout=httpx.Timeout(READ_TIMEOUT_SECS, connect=CONNECT_TIMEOUT_SECS),
                headers=headers,
                follow_redirects=True,
            )
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')
            main_text = self._extract_text_from_soup(soup)

            if main_text:
                main_text = self._limit_tokens(main_text, CONTENT_LIMIT_TOKENS)

            return main_text

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429 and retry_count < MAX_RETRIES:
                delay = RETRY_DELAY * (2 ** retry_count)
                await asyncio.sleep(delay)
                return await self._scrape_webpage(url, client, retry_count + 1)
            return ""

        except (httpx.TimeoutException, httpx.NetworkError) as e:
            if retry_count < MAX_RETRIES:
                delay = RETRY_DELAY * (2 ** retry_count)
                await asyncio.sleep(delay)
                return await self._scrape_webpage(url, client, retry_count + 1)
            return ""

        except Exception as e:
            return ""

    async def _scrape_multiple_webpages(self, results: List[dict]) -> List[dict]:
        """Concurrently scrape multiple webpages with rate limiting."""
        limits = httpx.Limits(max_keepalive_connections=20, max_connections=50)
        timeout = httpx.Timeout(READ_TIMEOUT_SECS, connect=CONNECT_TIMEOUT_SECS)

        async with httpx.AsyncClient(limits=limits, timeout=timeout) as client:
            semaphore = asyncio.Semaphore(self.max_workers)

            async def limited_scrape(result: dict):
                async with semaphore:
                    result['content'] = await self._scrape_webpage(result['url'], client)
                    return result

            scraped_results = await asyncio.gather(
                *[limited_scrape(result) for result in results],
                return_exceptions=False
            )

        return scraped_results

    async def search(
        self,
        query: str,
        max_results: int = 10,
        scrape_content: bool = True,
        **kwargs
    ) -> SearchResponse:
        """
        Perform Google search with optional content scraping

        Args:
            query: Search query string
            max_results: Maximum number of results to return
            scrape_content: Whether to scrape webpage content (default: True)
            **kwargs: Additional search parameters

        Returns:
            SearchResponse object containing results
        """
        start_time = datetime.now()

        async with httpx.AsyncClient() as client:
            raw_results = await self._query_google_api(query, client, max_results)

        if not raw_results:
            return SearchResponse(
                query=query,
                provider=self.provider_name,
                results=[],
                total_results=0,
                response_time=(datetime.now() - start_time).total_seconds()
            )

        if scrape_content:
            raw_results = await self._scrape_multiple_webpages(raw_results)

        # Scrape images from URLs if enabled
        if self.enable_image_scraping and self.image_scraper and raw_results:
            try:
                # Extract URLs from results
                urls = [item['url'] for item in raw_results]

                # Batch scrape images concurrently
                image_urls = await self.image_scraper.scrape_images_batch(
                    urls,
                    max_concurrent=self.image_scraping_max_concurrent
                )

                # Assign images to results
                for item, image_url in zip(raw_results, image_urls):
                    if image_url and not isinstance(image_url, Exception):
                        item['image_url'] = image_url
            except Exception as e:
                print(f"Error during batch image scraping: {e}")
                # Continue without images if scraping fails

        search_results = []
        for item in raw_results:
            if scrape_content and not item.get('content'):
                continue

            search_results.append(SearchResult(
                title=item['title'],
                url=item['url'],
                snippet=item.get('snippet'),
                content=item.get('content'),
                image_url=item.get('image_url'),
            ))

        return SearchResponse(
            query=query,
            provider=self.provider_name,
            results=search_results,
            images=[],  # Google Custom Search API doesn't return image results separately
            total_results=len(search_results),
            response_time=(datetime.now() - start_time).total_seconds(),
            metadata={
                "images_scraped": self.enable_image_scraping and self.image_scraper is not None,
            }
        )

    def search_sync(
        self,
        query: str,
        max_results: int = 10,
        scrape_content: bool = True,
        **kwargs
    ) -> SearchResponse:
        """
        Synchronous version of search

        Args:
            query: Search query string
            max_results: Maximum number of results to return
            scrape_content: Whether to scrape webpage content (default: True)
            **kwargs: Additional search parameters

        Returns:
            SearchResponse object containing results
        """
        return asyncio.run(self.search(query, max_results, scrape_content, **kwargs))

    async def summarize_results(self, query: str, response) -> str:
        """
        Summarize Google search results using LLM with a structured extraction format.

        Output format (repeat per source):
            - Headline:
            - Content:
            - Url:
            - Image link:

        Args:
            query: The original search query
            response: SearchResponse containing results to summarize or formatted string

        Returns:
            Summarized content as a string
        """
        # Handle both SearchResponse object and pre-formatted string
        if isinstance(response, str):
            combined_content = response
        else:
            if not response.results:
                return "No search results found."

            content_parts = []
            for result in response.results[:10]:
                if not result.content or not result.content.strip():
                    continue  # ignore empty content sources

                content_parts.append(f"""
Title: {result.title}
URL: {result.url}
Image: {result.image_url or 'N/A'}
Content:
{result.content}
---
""")

            if not content_parts:
                return "No valid content found in search results."

            combined_content = "\n".join(content_parts)

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

        try:
            llm = FallbackLLM(openai_model="gpt-4.1-nano")
            llm_response = await llm.ainvoke(system_prompt)
            return llm_response.content

        except Exception as e:
            print(f"Error in summarization: {e}")
            # fallback: minimal structured output
            if isinstance(response, str):
                return response

            fallback = ""
            for result in response.results[:10]:
                if not result.content:
                    continue
                fallback += f"""- Headline: {result.title}
- Content: {result.content[:500]}...
- Url: {result.url}
- Image link: {result.image_url or 'N/A'}

"""
            return fallback

    async def search_and_summarize(
        self,
        query: str,
        max_results: int = 40,
        scrape_content: bool = True,
        **kwargs
    ) -> dict:
        """
        Search and summarize results in one call

        Args:
            query: Search query string
            max_results: Maximum number of results to return
            scrape_content: Whether to scrape webpage content (default: True)
            **kwargs: Additional search parameters

        Returns:
            Dictionary with 'response', 'summary', and 'provider' keys
        """
        response = await self.search(query, max_results, scrape_content, **kwargs)

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

    def update_config(
        self,
        max_workers: Optional[int] = None,
        enable_image_scraping: Optional[bool] = None,
        image_scraping_timeout: Optional[float] = None,
        image_scraping_max_concurrent: Optional[int] = None,
    ):
        """
        Update Google search configuration

        Args:
            max_workers: Maximum concurrent scraping workers
            enable_image_scraping: Enable/disable image scraping
            image_scraping_timeout: Timeout for image scraping
            image_scraping_max_concurrent: Max concurrent image requests
        """
        if max_workers is not None:
            self.max_workers = max_workers

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
