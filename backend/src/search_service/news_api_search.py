"""
NewsAPI Search Provider

This module implements the NewsAPI integration for searching news articles
from various sources worldwide.
"""

from datetime import datetime, timedelta
from typing import List, Literal, Optional
import httpx

from src.search_service.base import (
    BaseSearchProvider,
    SearchResponse,
    SearchResult,
)
from src.app_config import app_config
from src.llm import FallbackLLM
import asyncio


class NewsAPISearchProvider(BaseSearchProvider):
    """NewsAPI provider for searching news articles"""

    BASE_URL = "https://newsapi.org/v2"

    def __init__(self, api_key: Optional[str] = None, **kwargs):
        """
        Initialize NewsAPI provider

        Args:
            api_key: NewsAPI key (defaults to app_config)
            **kwargs: Additional configuration
        """
        super().__init__(api_key, **kwargs)
        self.api_key = api_key or app_config.NEWS_API_KEY
        if not self.api_key:
            raise ValueError(
                "NewsAPI key is required. Set NEWS_API_KEY in .env or pass it directly."
            )

    @property
    def provider_name(self) -> str:
        return "newsapi"

    async def search(
        self,
        query: str,
        max_results: int = 10,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        sort_by: Literal["relevancy", "popularity", "publishedAt"] = "publishedAt",
        language: Optional[str] = "en",
        domains: Optional[str] = None,
        exclude_domains: Optional[str] = None,
        **kwargs
    ) -> SearchResponse:
        """
        Search for news articles using NewsAPI

        Args:
            query: Search query string
            max_results: Maximum number of results to return
            from_date: Start date (YYYY-MM-DD), defaults to 7 days ago
            to_date: End date (YYYY-MM-DD), defaults to today
            sort_by: Sort order - 'relevancy', 'popularity', or 'publishedAt'
            language: Language code (e.g., 'en', 'es', 'fr')
            domains: Comma-separated domains to restrict search to
            exclude_domains: Comma-separated domains to exclude
            **kwargs: Additional parameters

        Returns:
            SearchResponse object containing results
        """
        start_time = datetime.now()

        if from_date is None:
            from_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

        params = {
            "q": query,
            "from": from_date,
            "sortBy": sort_by,
            "apiKey": self.api_key,
            "pageSize": min(max_results, 100),
            "page": 1,
        }

        if to_date:
            params["to"] = to_date
        if language:
            params["language"] = language
        if domains:
            params["domains"] = domains
        if exclude_domains:
            params["excludeDomains"] = exclude_domains

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.BASE_URL}/everything", params=params)
            response.raise_for_status()
            data = response.json()

        articles = data.get("articles", [])
        search_results = []

        for article in articles:
            search_results.append(SearchResult(
                title=article.get("title", ""),
                url=article.get("url", ""),
                content=article.get("content"),
                snippet=article.get("description"),
                published_at=datetime.fromisoformat(
                    article.get("publishedAt", "").replace("Z", "+00:00")
                ) if article.get("publishedAt") else None,
                author=article.get("author"),
                source=article.get("source", {}).get("name"),
                image_url=article.get("urlToImage"),
            ))

        return SearchResponse(
            query=query,
            provider=self.provider_name,
            results=search_results,
            total_results=data.get("totalResults", len(search_results)),
            response_time=(datetime.now() - start_time).total_seconds(),
            metadata={"status": data.get("status")}
        )

    async def get_top_headlines(
        self,
        query: Optional[str] = None,
        country: Optional[str] = None,
        category: Optional[
            Literal[
                "business",
                "entertainment",
                "general",
                "health",
                "science",
                "sports",
                "technology",
            ]
        ] = None,
        sources: Optional[str] = None,
        max_results: int = 20,
    ) -> SearchResponse:
        """
        Get top headlines from NewsAPI

        Args:
            query: Keywords or phrases to search for
            country: 2-letter ISO country code (e.g., 'us', 'gb')
            category: Category of news
            sources: Comma-separated source identifiers
            max_results: Maximum number of results

        Returns:
            SearchResponse object containing top headlines
        """
        start_time = datetime.now()

        params = {
            "apiKey": self.api_key,
            "pageSize": min(max_results, 100),
            "page": 1,
        }

        if query:
            params["q"] = query
        if country:
            params["country"] = country
        if category:
            params["category"] = category
        if sources:
            params["sources"] = sources

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.BASE_URL}/top-headlines", params=params)
            response.raise_for_status()
            data = response.json()

        articles = data.get("articles", [])
        search_results = []

        for article in articles:
            search_results.append(SearchResult(
                title=article.get("title", ""),
                url=article.get("url", ""),
                content=article.get("content"),
                snippet=article.get("description"),
                published_at=datetime.fromisoformat(
                    article.get("publishedAt", "").replace("Z", "+00:00")
                ) if article.get("publishedAt") else None,
                author=article.get("author"),
                source=article.get("source", {}).get("name"),
                image_url=article.get("urlToImage"),
            ))

        return SearchResponse(
            query=query or "top headlines",
            provider=self.provider_name,
            results=search_results,
            total_results=data.get("totalResults", len(search_results)),
            response_time=(datetime.now() - start_time).total_seconds(),
            metadata={
                "status": data.get("status"),
                "country": country,
                "category": category
            }
        )

    def search_sync(
        self,
        query: str,
        max_results: int = 10,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        sort_by: Literal["relevancy", "popularity", "publishedAt"] = "publishedAt",
        language: Optional[str] = "en",
        domains: Optional[str] = None,
        exclude_domains: Optional[str] = None,
        **kwargs
    ) -> SearchResponse:
        """
        Synchronous version of search

        Args:
            query: Search query string
            max_results: Maximum number of results to return
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            sort_by: Sort order
            language: Language code
            domains: Comma-separated domains to include
            exclude_domains: Comma-separated domains to exclude
            **kwargs: Additional parameters

        Returns:
            SearchResponse object containing results
        """
        start_time = datetime.now()

        if from_date is None:
            from_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

        params = {
            "q": query,
            "from": from_date,
            "sortBy": sort_by,
            "apiKey": self.api_key,
            "pageSize": min(max_results, 100),
            "page": 1,
        }

        if to_date:
            params["to"] = to_date
        if language:
            params["language"] = language
        if domains:
            params["domains"] = domains
        if exclude_domains:
            params["excludeDomains"] = exclude_domains

        with httpx.Client(timeout=30.0) as client:
            response = client.get(f"{self.BASE_URL}/everything", params=params)
            response.raise_for_status()
            data = response.json()

        articles = data.get("articles", [])
        search_results = []

        for article in articles:
            search_results.append(SearchResult(
                title=article.get("title", ""),
                url=article.get("url", ""),
                content=article.get("content"),
                snippet=article.get("description"),
                published_at=datetime.fromisoformat(
                    article.get("publishedAt", "").replace("Z", "+00:00")
                ) if article.get("publishedAt") else None,
                author=article.get("author"),
                source=article.get("source", {}).get("name"),
                image_url=article.get("urlToImage"),
            ))

        return SearchResponse(
            query=query,
            provider=self.provider_name,
            results=search_results,
            total_results=data.get("totalResults", len(search_results)),
            response_time=(datetime.now() - start_time).total_seconds(),
            metadata={"status": data.get("status")}
        )

    def get_top_headlines_sync(
        self,
        query: Optional[str] = None,
        country: Optional[str] = None,
        category: Optional[
            Literal[
                "business",
                "entertainment",
                "general",
                "health",
                "science",
                "sports",
                "technology",
            ]
        ] = None,
        sources: Optional[str] = None,
        max_results: int = 20,
    ) -> SearchResponse:
        """
        Synchronous version of get_top_headlines

        Args:
            query: Keywords to search for
            country: Country code
            category: News category
            sources: Source identifiers
            max_results: Maximum number of results

        Returns:
            SearchResponse object containing top headlines
        """
        start_time = datetime.now()

        params = {
            "apiKey": self.api_key,
            "pageSize": min(max_results, 100),
            "page": 1,
        }

        if query:
            params["q"] = query
        if country:
            params["country"] = country
        if category:
            params["category"] = category
        if sources:
            params["sources"] = sources

        with httpx.Client(timeout=30.0) as client:
            response = client.get(f"{self.BASE_URL}/top-headlines", params=params)
            response.raise_for_status()
            data = response.json()

        articles = data.get("articles", [])
        search_results = []

        for article in articles:
            search_results.append(SearchResult(
                title=article.get("title", ""),
                url=article.get("url", ""),
                content=article.get("content"),
                snippet=article.get("description"),
                published_at=datetime.fromisoformat(
                    article.get("publishedAt", "").replace("Z", "+00:00")
                ) if article.get("publishedAt") else None,
                author=article.get("author"),
                source=article.get("source", {}).get("name"),
                image_url=article.get("urlToImage"),
            ))

        return SearchResponse(
            query=query or "top headlines",
            provider=self.provider_name,
            results=search_results,
            total_results=data.get("totalResults", len(search_results)),
            response_time=(datetime.now() - start_time).total_seconds(),
            metadata={
                "status": data.get("status"),
                "country": country,
                "category": category
            }
        )

    def summarize_results(self, query: str, response: SearchResponse) -> str:
        """
        Summarize news results using LLM with a structured extraction format.

        Output format (repeat per source):
            - Headline:
            - Summary:
            - Long content:
            - Url:
            - Source:
            - Published:

        Args:
            query: The original search query
            response: SearchResponse containing results to summarize

        Returns:
            Summarized content as a string
        """
        if not response.results:
            return "No news results found."

        content_parts = []
        for result in response.results[:10]:
            # For news, we may not have scraped content, so use snippet or content
            text_content = result.content or result.snippet or ""
            if not text_content.strip():
                continue  # ignore empty content sources

            published_str = result.published_at.strftime("%Y-%m-%d %H:%M") if result.published_at else "Unknown"
            source_str = result.source or "Unknown"

            content_parts.append(f"""
Title: {result.title}
Source: {source_str}
Published: {published_str}
URL: {result.url}
Content:
{text_content}
---
""")

        if not content_parts:
            return "No valid content found in news results."

        combined_content = "\n".join(content_parts)

        system_prompt = f"""
You are a helpful assistant that extracts and synthesizes information from news articles.

Your task:
- Read multiple news articles related to the query: "{query}"
- Extract useful information from each source
- Ignore any source that does not contain meaningful content
- Do NOT invent facts or URLs
- Pay attention to publication dates and sources

Your output MUST follow this exact format.
Repeat the block for EACH valid source.

Output format:
- Headline: concise title capturing the main idea of the article
- Summary: 2–3 sentence short summary
- Long content: a detailed, well-structured explanation rewritten in your own words
- Url: original source URL
- Source: news source name
- Published: publication date

News articles:
{combined_content}
"""

        try:
            llm = FallbackLLM(model="gpt-5-nano")
            result = llm.invoke(system_prompt)
            # Extract content from AIMessage if needed
            return result.content if hasattr(result, 'content') else str(result)

        except Exception as e:
            print(f"Error in summarization: {e}")
            # fallback: minimal structured output
            fallback = ""
            for result in response.results[:10]:
                text_content = result.content or result.snippet or ""
                if not text_content:
                    continue
                published_str = result.published_at.strftime("%Y-%m-%d %H:%M") if result.published_at else "Unknown"
                fallback += f"""- Headline: {result.title}
- Summary: {text_content[:200]}...
- Long content: {text_content[:500]}...
- Url: {result.url}
- Source: {result.source or 'Unknown'}
- Published: {published_str}

"""
            return fallback

    async def search_and_summarize(
        self,
        query: str,
        max_results: int = 10,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        sort_by: Literal["relevancy", "popularity", "publishedAt"] = "publishedAt",
        language: Optional[str] = "en",
        domains: Optional[str] = None,
        exclude_domains: Optional[str] = None,
        **kwargs
    ) -> dict:
        """
        Search news and summarize results in one call

        Args:
            query: Search query string
            max_results: Maximum number of results to return
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            sort_by: Sort order
            language: Language code
            domains: Comma-separated domains to include
            exclude_domains: Comma-separated domains to exclude
            **kwargs: Additional search parameters

        Returns:
            Dictionary with 'response', 'summary', and 'provider' keys
        """
        response = await self.search(
            query, max_results, from_date, to_date, sort_by,
            language, domains, exclude_domains, **kwargs
        )
        summary = self.summarize_results(query, response)

        return {
            'provider': self.provider_name,
            'response': response,
            'summary': summary,
            'query': query,
            'total_results': response.total_results
        }
