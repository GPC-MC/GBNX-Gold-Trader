"""
Tavily Search Provider

This module implements the Tavily Search API integration using LangChain's
TavilySearch wrapper for advanced search with answer generation.
"""

import os
from typing import List, Optional, Literal
from datetime import datetime

from langchain_tavily import TavilySearch

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


class TavilySearchProvider(BaseSearchProvider):
    """Tavily Search provider with advanced features like answer generation"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        max_results: int = 5,
        time_range: str = "day",
        topic: Literal["general", "news"] = "news",
        search_depth: Literal["basic", "advanced"] = "advanced",
        include_answer: bool = True,
        include_raw_content: bool = True,
        include_images: bool = True,
        include_image_descriptions: bool = True,
        days: int = 5,
        include_domains: Optional[List[str]] = None,
        exclude_domains: Optional[List[str]] = None,
        enable_image_scraping: bool = True,
        image_scraping_timeout: float = 5.0,
        image_scraping_max_concurrent: int = 5,
        **kwargs
    ):
        """
        Initialize Tavily Search provider

        Args:
            api_key: Tavily API key (defaults to app_config)
            max_results: Maximum number of search results
            time_range: Time range for search ("day", "week", "month", "year")
            topic: Search topic ("general" or "news")
            search_depth: Search depth ("basic" or "advanced")
            include_answer: Include AI-generated answer
            include_raw_content: Include raw content from pages
            include_images: Include image results
            include_image_descriptions: Include image descriptions
            days: Number of days to search back
            include_domains: List of domains to include
            exclude_domains: List of domains to exclude
            enable_image_scraping: Enable image scraping for individual results (default True)
            image_scraping_timeout: Timeout for image scraping requests in seconds (default 5.0)
            image_scraping_max_concurrent: Max concurrent image scraping requests (default 5)
            **kwargs: Additional configuration
        """
        super().__init__(api_key, **kwargs)
        self.api_key = api_key or app_config.TAVILY_API_KEY

        # Set API key in environment for LangChain
        os.environ["TAVILY_API_KEY"] = self.api_key

        # Initialize Tavily tool
        self.tavily_tool = TavilySearch(
            max_results=max_results,
            topic=topic,
            include_answer=include_answer,
            include_raw_content=include_raw_content,
            include_images=include_images,
            include_image_descriptions=include_image_descriptions,
            search_depth=search_depth,
            time_range=time_range,
            days=days,
            include_domains=include_domains,
            exclude_domains=exclude_domains,
        )

        # Store configuration
        self.max_results = max_results
        self.time_range = time_range
        self.topic = topic
        self.search_depth = search_depth
        self.include_answer = include_answer
        self.include_raw_content = include_raw_content
        self.include_images = include_images
        self.days = days

        # Image scraping configuration for individual results
        self.enable_image_scraping = enable_image_scraping
        self.image_scraping_timeout = image_scraping_timeout
        self.image_scraping_max_concurrent = image_scraping_max_concurrent

        # Initialize image scraper if enabled
        if self.enable_image_scraping:
            self.result_image_scraper = ImageScraper(timeout=self.image_scraping_timeout)
        else:
            self.result_image_scraper = None

    @property
    def provider_name(self) -> str:
        return "tavily"

    async def _parse_tavily_response(self, query: str, raw_response: dict) -> SearchResponse:
        """Parse raw Tavily response into SearchResponse model"""
        # Parse images
        images = []
        for img_data in raw_response.get("images", []):
            if isinstance(img_data, dict):
                images.append(ImageResult(
                    url=img_data.get("url"),
                    description=img_data.get("description")
                ))
            elif isinstance(img_data, str):
                images.append(ImageResult(url=img_data))

        # Parse search results
        results = []
        for item in raw_response.get("results", []):
            results.append(SearchResult(
                title=item.get("title", ""),
                url=item.get("url", ""),
                content=item.get("content"),
                snippet=item.get("content"),
                score=item.get("score"),
                raw_content=item.get("raw_content") if self.include_raw_content else None,
            ))

        # Scrape images from URLs for individual results
        if self.enable_image_scraping and self.result_image_scraper and results:
            try:
                # Extract URLs from results
                urls = [str(result.url) for result in results]

                # Batch scrape images concurrently
                image_urls = await self.result_image_scraper.scrape_images_batch(
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

        return SearchResponse(
            query=query,
            provider=self.provider_name,
            results=results,
            images=images,
            answer=raw_response.get("answer"),
            follow_up_questions=raw_response.get("follow_up_questions"),
            response_time=raw_response.get("response_time"),
            total_results=len(results),
            metadata={
                "request_id": raw_response.get("request_id"),
                "topic": self.topic,
                "search_depth": self.search_depth,
                "time_range": self.time_range,
            }
        )

    async def search(
        self,
        query: str,
        max_results: int = 10,
        **kwargs
    ) -> SearchResponse:
        """
        Perform Tavily search (async wrapper around sync API)

        Args:
            query: Search query string
            max_results: Maximum number of results to return (overrides init value)
            **kwargs: Additional search parameters

        Returns:
            SearchResponse object containing results
        """
        # Update max_results if provided
        if max_results != self.max_results:
            self.tavily_tool.max_results = max_results

        # Tavily's invoke is synchronous, so we just call it
        raw_response = self.tavily_tool.invoke(query)

        return await self._parse_tavily_response(query, raw_response)

    def search_sync(
        self,
        query: str,
        max_results: int = 10,
        **kwargs
    ) -> SearchResponse:
        """
        Synchronous version of search

        Args:
            query: Search query string
            max_results: Maximum number of results to return
            **kwargs: Additional search parameters

        Returns:
            SearchResponse object containing results
        """
        import asyncio

        # Update max_results if provided
        if max_results != self.max_results:
            self.tavily_tool.max_results = max_results

        raw_response = self.tavily_tool.invoke(query)

        return asyncio.run(self._parse_tavily_response(query, raw_response))

    def update_config(
        self,
        time_range: Optional[str] = None,
        topic: Optional[Literal["general", "news"]] = None,
        search_depth: Optional[Literal["basic", "advanced"]] = None,
        days: Optional[int] = None,
        include_domains: Optional[List[str]] = None,
        exclude_domains: Optional[List[str]] = None,
    ):
        """
        Update Tavily search configuration

        Args:
            time_range: Time range for search
            topic: Search topic
            search_depth: Search depth
            days: Number of days to search back
            include_domains: Domains to include
            exclude_domains: Domains to exclude
        """
        if time_range:
            self.time_range = time_range
            self.tavily_tool.time_range = time_range
        if topic:
            self.topic = topic
            self.tavily_tool.topic = topic
        if search_depth:
            self.search_depth = search_depth
            self.tavily_tool.search_depth = search_depth
        if days is not None:
            self.days = days
            self.tavily_tool.days = days
        if include_domains is not None:
            self.tavily_tool.include_domains = include_domains
        if exclude_domains is not None:
            self.tavily_tool.exclude_domains = exclude_domains

    async def summarize_results(self, query: str, response: SearchResponse) -> str:
        """
        Summarize Tavily search results using LLM with a structured extraction format.

        Note: Tavily already provides an 'answer' field, but this method provides
        additional structured summarization consistent with other providers.

        Output format (repeat per source):
            - Headline:
            - Summary:
            - Long content:
            - Url:
            - Score:
            - Images: (if available)

        Args:
            query: The original search query
            response: SearchResponse containing results to summarize

        Returns:
            Summarized content as a string
        """
        if not response.results:
            return response.answer or "No search results found."

        content_parts = []
        for result in response.results[:MAX_RESULTS_FOR_SUMMARY]:
            # Tavily provides content or raw_content
            text_content = result.raw_content or result.content or result.snippet or ""
            if not text_content.strip():
                continue  # ignore empty content sources

            # Truncate content to prevent context overflow
            text_content = truncate_content(text_content, MAX_CONTENT_PER_RESULT)
            score_str = f"{result.score:.2f}" if result.score is not None else "N/A"
            image_url_str = result.image_url or "N/A"

            content_parts.append(f"""
Title: {result.title}
URL: {result.url}
Score: {score_str}
Image URL: {image_url_str}
Content:
{text_content}
---
""")

        if not content_parts:
            return response.answer or "No valid content found in search results."

        combined_content = "\n".join(content_parts)
        # Truncate combined content to prevent LLM context overflow
        combined_content = truncate_combined_content(combined_content, MAX_TOTAL_CONTENT)

        # Include Tavily's AI answer if available
        tavily_answer_context = ""
        if response.answer:
            tavily_answer_context = f"\n\nTavily AI Answer: {response.answer}"

        system_prompt = f"""
You are a helpful assistant that extracts and synthesizes information from web search results.

Your task:
- Read multiple search results related to the query: "{query}"
- Extract useful information from each source
- Ignore any source that does not contain meaningful content
- Do NOT invent facts or URLs
- Pay attention to relevance scores (higher is better){tavily_answer_context}

Your output MUST follow this exact format.
Repeat the block for EACH valid source.

Output format:
- Headline: concise title capturing the main idea of the page
- Content: a detailed content in a paragraph or multiple paragraph
- Url: original source URL
- Score: relevance score
- Image link: image URL if available

Search results:
{combined_content}
"""

        # Capture Tavily's answer before LLM call (to avoid variable shadowing)
        tavily_answer = response.answer
        tavily_results = response.results
        tavily_images = response.images

        try:
            llm = FallbackLLM()
            # Use ainvoke() - returns AIMessage with .content attribute
            llm_response = await llm.ainvoke(system_prompt)
            summary = llm_response.content

            # Build final result with images
            result_parts = []
            
            # Prepend Tavily's answer if available
            if tavily_answer:
                result_parts.append(f"**Tavily AI Answer:**\n{tavily_answer}")
            
            result_parts.append(f"**Detailed Sources:**\n{summary}")
            
            # Append images if available
            if tavily_images:
                image_section = "\n**Related Images:**\n"
                for idx, img in enumerate(tavily_images[:10], 1):
                    img_url = str(img.url) if img.url else ""
                    img_desc = img.description or "No description"
                    image_section += f"{idx}. {img_desc}\n   URL: {img_url}\n"
                result_parts.append(image_section)
            
            return "\n\n".join(result_parts)

        except Exception as e:
            print(f"Error in summarization: {e}")
            # fallback: minimal structured output
            fallback = ""
            if tavily_answer:
                fallback += f"**Tavily AI Answer:**\n{tavily_answer}\n\n"

            for result in tavily_results[:10]:
                text_content = result.raw_content or result.content or result.snippet or ""
                if not text_content:
                    continue
                score_str = f"{result.score:.2f}" if result.score is not None else "N/A"
                image_url_str = result.image_url or "N/A"
                fallback += f"""- Headline: {result.title}
- Summary: {text_content[:200]}...
- Url: {result.url}
- Score: {score_str}
- Image link: {image_url_str}

"""
            # Add images to fallback as well
            if tavily_images:
                fallback += "\n**Related Images:**\n"
                for idx, img in enumerate(tavily_images[:10], 1):
                    img_url = str(img.url) if img.url else ""
                    img_desc = img.description or "No description"
                    fallback += f"{idx}. {img_desc}\n   URL: {img_url}\n"
            
            return fallback

    async def search_and_summarize(
        self,
        query: str,
        max_results: int = 10,
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
        print("-------------------------------- RESPONSE TAVILY--------------------------------")
        print(response)
        print("----------------------------------------------------------------")
        summary = await self.summarize_results(query, response)
        print("-------------------------------- SUMMARY TAVILY--------------------------------")
        print(summary)
        print("----------------------------------------------------------------")
        return {
            'provider': self.provider_name,
            'response': response,
            'summary': summary,
            'query': query,
            'total_results': response.total_results,
            'tavily_answer': response.answer  # Include Tavily's AI answer separately
        }


# if __name__ == "__main__":
#     import asyncio
#     from src.search_service.tavily_search import TavilySearchProvider
#     provider = TavilySearchProvider()
#     response = provider.search_sync("What is the weather in Tokyo?")
#     # response = asyncio.run(provider.search_and_summarize("What is the weather in Tokyo?"))
#     print(response)
#     print("-------------------------------- RESPONSE TAVILY--------------------------------")
#     summary = asyncio.run(provider.summarize_results("What is the weather in Tokyo?", response))
#     print(summary)
#     print("-------------------------------- SUMMARY TAVILY--------------------------------")