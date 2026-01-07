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
)
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

    @property
    def provider_name(self) -> str:
        return "tavily"

    def _parse_tavily_response(self, query: str, raw_response: dict) -> SearchResponse:
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

        return self._parse_tavily_response(query, raw_response)

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
        # Update max_results if provided
        if max_results != self.max_results:
            self.tavily_tool.max_results = max_results

        raw_response = self.tavily_tool.invoke(query)

        return self._parse_tavily_response(query, raw_response)

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

    def summarize_results(self, query: str, response) -> str:
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

        Args:
            query: The original search query
            response: SearchResponse containing results to summarize

        Returns:
            Summarized content as a string
        """
        system_prompt = f"""
You are a helpful assistant that extracts and synthesizes information from web search results.

Your task:
- Read multiple search results related to the query: "{query}"
- Extract useful information from each source
- Ignore any source that does not contain meaningful content
- Do NOT invent facts or URLs
- IMPORTANT: Include relevant image links from the "Available Images" section below

Your output MUST follow this exact format.
Repeat the block for EACH valid source.

Output format:
- Headline: concise title capturing the main idea of the page
- Summary: 2–3 sentence short summary
- Url: original source URL
- Score: relevance score
- Image link: include relevant image URL(s) from the Available Images section below

Input: {response}

Answer:
"""

        llm = FallbackLLM(model="gpt-5-nano")
        result = llm.invoke(system_prompt)
        summary = result.content if hasattr(result, 'content') else str(result)
        return summary


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

        # Format response as a single string containing search results and images
        formatted_response_parts = []

        # Add search results
        if response.results:
            formatted_response_parts.append("Results for search:")
            for idx, result in enumerate(response.results, 1):
                result_info = []
                result_info.append(f"\n{idx}. Title: {result.title}")
                result_info.append(f"   URL: {result.url}")
                if result.content:
                    result_info.append(f"   Content: {result.content}")
                if result.published_at:
                    result_info.append(f"   Published at: {result.published_at}")
                formatted_response_parts.append("\n".join(result_info))

        # Add image results
        image_response = []
        if response.images:
            image_response.append("\n\nResults for image search:")
            for idx, img in enumerate(response.images, 1):
                img_info = f"\n{idx}. Image link: {img.url}"
                if img.description:
                    img_info += f"\n   Image description: {img.description}"
                image_response.append(img_info)

        image_response = "\n".join(image_response)
        formatted_response = "\n".join(formatted_response_parts)



        import pdb; pdb.set_trace()
        summary = self.summarize_results(query, formatted_response)
        import pdb; pdb.set_trace()

        return {
            'provider': self.provider_name,
            'response': formatted_response,
            'summary': summary,
            'query': query,
            'total_results': response.total_results,
            'tavily_answer': response.answer  # Include Tavily's AI answer separately
        }
