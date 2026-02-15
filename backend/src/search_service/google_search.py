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
import logging
from typing import List, Optional
from bs4 import BeautifulSoup
from datetime import datetime
from dateutil import parser as date_parser

logger = logging.getLogger(__name__)

from src.search_service.base import (
    BaseSearchProvider,
    SearchResponse,
    SearchResult,
    truncate_content,
    truncate_combined_content,
    MAX_CONTENT_PER_RESULT,
    MAX_TOTAL_CONTENT,
    MAX_RESULTS_FOR_SUMMARY,
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

# LLM batch processing constants
LLM_BATCH_SIZE = 1  # Process prompts in chunks of 5
LLM_MAX_CONCURRENCY = 1  # Max concurrent LLM requests within a batch

# Maximum number of quality results to keep
MAX_QUALITY_RESULTS = 5

# Trusted/reputable news domains (prioritized)
TRUSTED_DOMAINS = [
    # Major international news
    "bbc.com",
    "bbc.co.uk",
    "reuters.com",
    "apnews.com",
    "theguardian.com",
    "nytimes.com",
    "washingtonpost.com",
    "wsj.com",
    "economist.com",
    "ft.com",
    "bloomberg.com",
    "cnbc.com",
    "cnn.com",
    "npr.org",
    "aljazeera.com",
    "dw.com",
    "france24.com",
    # Tech news
    "techcrunch.com",
    "wired.com",
    "theverge.com",
    "arstechnica.com",
    "engadget.com",
    "zdnet.com",
    "cnet.com",
    # Science/Education
    "nature.com",
    "sciencemag.org",
    "scientificamerican.com",
    "nationalgeographic.com",
    "smithsonianmag.com",
    # Business
    "forbes.com",
    "businessinsider.com",
    "fortune.com",
    "hbr.org",
    # Vietnamese reputable sources
    "vnexpress.net",
    "tuoitre.vn",
    "thanhnien.vn",
    "vietnamnet.vn",
    "dantri.com.vn",
    "baomoi.com",
    "abcnews.go.com",
]

# Rotating user agents to avoid blocking
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
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
        **kwargs,
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

    def _is_trusted_domain(self, url: str) -> bool:
        """Check if URL belongs to a trusted/reputable domain."""
        try:
            parsed = urllib.parse.urlparse(url)
            domain = parsed.netloc.lower()
            # Remove www. prefix for matching
            if domain.startswith("www."):
                domain = domain[4:]
            return any(
                domain == trusted or domain.endswith("." + trusted)
                for trusted in TRUSTED_DOMAINS
            )
        except Exception:
            return False

    def _get_random_headers(self) -> dict:
        """Generate headers with random user agent to avoid blocking."""
        return {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Cache-Control": "max-age=0",
        }

    def _limit_tokens(self, input_string: str, N: int) -> str:
        """Limit string to N tokens (words)."""
        tokens = input_string.split()
        limited_tokens = tokens[:N]
        return " ".join(limited_tokens)

    def _extract_publish_date(self, item: dict) -> Optional[datetime]:
        """
        Extract publish date from Google Search API item metadata.

        Tries multiple strategies to find publication date:
        1. Pagemap metatags (article:published_time, og:published_time, etc.)
        2. Structured data in pagemap
        3. Other metadata fields

        Args:
            item: Google Search API result item

        Returns:
            datetime object if date found and parsed, None otherwise
        """
        # Common date field names to check
        date_fields = [
            "article:published_time",
            "og:published_time",
            "publishdate",
            "publication_date",
            "date",
            "datePublished",
            "datepublished",
            "published",
            "pubdate",
        ]

        # Strategy 1: Check pagemap metatags
        if "pagemap" in item and "metatags" in item["pagemap"]:
            metatags = item["pagemap"]["metatags"]
            if isinstance(metatags, list) and len(metatags) > 0:
                metatag = metatags[0]
                for field in date_fields:
                    if field in metatag and metatag[field]:
                        try:
                            return date_parser.parse(metatag[field])
                        except (ValueError, TypeError):
                            continue

        # Strategy 2: Check pagemap newsarticle
        if "pagemap" in item and "newsarticle" in item["pagemap"]:
            newsarticle = item["pagemap"]["newsarticle"]
            if isinstance(newsarticle, list) and len(newsarticle) > 0:
                article = newsarticle[0]
                if "datepublished" in article:
                    try:
                        return date_parser.parse(article["datepublished"])
                    except (ValueError, TypeError):
                        pass

        # Strategy 3: Check pagemap article
        if "pagemap" in item and "article" in item["pagemap"]:
            article_data = item["pagemap"]["article"]
            if isinstance(article_data, list) and len(article_data) > 0:
                article = article_data[0]
                for field in ["published_time", "published", "datepublished"]:
                    if field in article and article[field]:
                        try:
                            return date_parser.parse(article[field])
                        except (ValueError, TypeError):
                            continue

        return None

    def _extract_text_from_soup(self, soup: BeautifulSoup) -> str:
        """
        Extract text from BeautifulSoup object using multiple strategies.

        Tries different extraction methods to get the best content:
        1. Main content areas (article, main tags)
        2. Paragraphs
        3. All visible text as fallback
        """
        # Remove unwanted elements
        for element in soup(
            [
                "script",
                "style",
                "header",
                "footer",
                "nav",
                "aside",
                "iframe",
                "noscript",
            ]
        ):
            element.decompose()

        # Strategy 1: Try to find main content area
        main_content = (
            soup.find("main")
            or soup.find("article")
            or soup.find(
                "div",
                class_=lambda x: x
                and any(
                    keyword in x.lower()
                    for keyword in ["content", "article", "post", "entry", "main"]
                ),
            )
        )

        if main_content:
            text = " ".join(
                [
                    p.get_text(strip=True)
                    for p in main_content.find_all(["p", "h1", "h2", "h3", "h4", "li"])
                ]
            )
            if text and len(text) > 200:
                return text

        # Strategy 2: Extract from all paragraphs
        paragraphs = soup.find_all("p")
        if paragraphs:
            text = " ".join([p.get_text(strip=True) for p in paragraphs])
            if text and len(text) > 100:
                return text

        # Strategy 3: Fallback to all visible text
        text = soup.get_text(separator=" ", strip=True)
        return text

    async def _query_google_api(
        self, query: str, client: httpx.AsyncClient, max_results: int = 10
    ) -> List[dict]:
        """Query Google Custom Search API."""
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": self.api_key,
            "cx": self.search_engine_id,
            "q": query,
            "num": min(max_results, 10),  # Google API max is 10 per request
        }

        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            blob = response.json()

            if "items" not in blob:
                return []

            results = []
            for idx, item in enumerate(blob["items"]):
                link = item.get("link", "")
                link_parsed = urllib.parse.urlparse(link)

                if link_parsed.netloc in DOMAINS_BLACKLIST:
                    continue

                # Extract publish date from metadata
                published_at = self._extract_publish_date(item)

                results.append(
                    {
                        "id": idx + 1,
                        "title": item.get("title", ""),
                        "url": link,
                        "snippet": item.get("snippet", ""),
                        "published_at": published_at,
                    }
                )

                if len(results) >= NUM_RESULTS_SLICE:
                    break

            return results

        except Exception as e:
            logger.error(f"Error querying Google API: {e}")
            return []

    async def _scrape_webpage(
        self, url: str, client: httpx.AsyncClient, retry_count: int = 0
    ) -> str:
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

            soup = BeautifulSoup(response.text, "html.parser")
            main_text = self._extract_text_from_soup(soup)

            if main_text:
                main_text = self._limit_tokens(main_text, CONTENT_LIMIT_TOKENS)

            return main_text

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429 and retry_count < MAX_RETRIES:
                delay = RETRY_DELAY * (2**retry_count)
                await asyncio.sleep(delay)
                return await self._scrape_webpage(url, client, retry_count + 1)
            return ""

        except (httpx.TimeoutException, httpx.NetworkError) as e:
            if retry_count < MAX_RETRIES:
                delay = RETRY_DELAY * (2**retry_count)
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
                    result["content"] = await self._scrape_webpage(
                        result["url"], client
                    )
                    return result

            scraped_results = await asyncio.gather(
                *[limited_scrape(result) for result in results], return_exceptions=False
            )

        return scraped_results

    async def search_and_summarize(
        self, query: str, max_results: int = 10, scrape_content: bool = True, **kwargs
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
                response_time=(datetime.now() - start_time).total_seconds(),
            )

        if scrape_content:
            raw_results = await self._scrape_multiple_webpages(raw_results)

        # Scrape images for all results first
        if self.enable_image_scraping and self.image_scraper:
            try:
                urls = [item["url"] for item in raw_results]
                image_urls = await self.image_scraper.scrape_images_batch(
                    urls, max_concurrent=self.image_scraping_max_concurrent
                )
                for item, image_url in zip(raw_results, image_urls):
                    if image_url and not isinstance(image_url, Exception):
                        item["image_url"] = str(image_url)
                    else:
                        item["image_url"] = None
            except Exception as e:
                logger.warning(f"Error during batch image scraping: {e}")
                for item in raw_results:
                    item["image_url"] = None

        # Filter: must have scrapable content + image; prioritize trusted domains first.
        def has_scrapable_content(item: dict) -> bool:
            content = (item.get("content") or "").strip()
            return len(content) > 100

        def has_scrapable_image(item: dict) -> bool:
            return bool(item.get("image_url"))

        trusted_candidates = []
        other_candidates = []
        for item in raw_results:
            if not (has_scrapable_content(item) and has_scrapable_image(item)):
                continue
            if self._is_trusted_domain(item.get("url", "")):
                trusted_candidates.append(item)
            else:
                other_candidates.append(item)

        quality_results = trusted_candidates[:MAX_QUALITY_RESULTS]
        if len(quality_results) < MAX_QUALITY_RESULTS:
            remaining = MAX_QUALITY_RESULTS - len(quality_results)
            quality_results.extend(other_candidates[:remaining])

        logger.info(
            "Selected %d quality results (%d trusted, %d other) from %d total results",
            len(quality_results),
            len(trusted_candidates),
            len(other_candidates),
            len(raw_results),
        )

        search_results = []
        llm = FallbackLLM(model="gemini-2.5-flash", temperature=0.0)
        items_to_process = []
        prompts = []
        for item in quality_results:
            items_to_process.append(item)
            system_prompt = f"""
            Please summarize below text into a single paragraph without lose any information vital less than 100 words.
            {item.get("content")}
            """
            prompts.append(system_prompt)
        if prompts:
            for idx, (item, prompt) in enumerate(zip(items_to_process, prompts), 1):
                try:
                    summary_response = await llm.ainvoke(prompt)
                except Exception as e:
                    logger.error(f"LLM summarization failed for item {idx}: {e}")
                    summary_response = None

                snippet = (
                    summary_response.content
                    if summary_response is not None
                    else item.get("snippet", "")
                )
                search_results.append(
                    SearchResult(
                        title=item["title"],
                        url=item["url"],
                        snippet=snippet,
                        content=item.get("content"),
                        published_at=item.get("published_at"),
                        image_url=item.get("image_url"),
                    )
                )
                # if idx < len(prompts):
                #     await asyncio.sleep(0.5)
        if self.enable_image_scraping and self.image_scraper and search_results:
            try:
                urls = [str(result.url) for result in search_results]
                image_urls = await self.image_scraper.scrape_images_batch(
                    urls, max_concurrent=self.image_scraping_max_concurrent
                )
                for result, image_url in zip(search_results, image_urls):
                    if image_url and not isinstance(image_url, Exception):
                        result.image_url = image_url
            except Exception as e:
                logger.warning(f"Error during batch image scraping: {e}")

        final_res_parts = []
        for result in search_results:
            image_url_str = str(result.image_url) if result.image_url else "N/A"
            published_str = (
                result.published_at.strftime("%Y-%m-%d %H:%M:%S")
                if result.published_at
                else "N/A"
            )
            text_content = result.snippet if result.snippet else result.content
            sub_string = f"""
            - Title: {result.title}
            - Published: {published_str}
            - URL: {result.url}
            - Image URL: {image_url_str}
            - Content: {text_content}
            """
            final_res_parts.append(sub_string)
            print(sub_string)


        final_res = "\n".join(final_res_parts)

        return final_res

        # return SearchResponse(
        #     query=query,
        #     provider=self.provider_name,
        #     results=search_results,
        #     total_results=len(search_results),
        #     string_result=final_res,
        #     response_time=(datetime.now() - start_time).total_seconds(),
        # )

    # async def search_and_summarize(
    #     self, query: str, max_results: int = 10, scrape_content: bool = True, **kwargs
    # ) -> dict:
    #     """
    #     Search and summarize results in one call

    #     Args:
    #         query: Search query string
    #         max_results: Maximum number of results to return
    #         scrape_content: Whether to scrape webpage content (default: True)
    #         **kwargs: Additional search parameters

    #     Returns:
    #         Dictionary with 'response', 'summary', and 'provider' keys
    #     """
    #     response = await self.search(query, max_results, scrape_content, **kwargs)
    #     return response