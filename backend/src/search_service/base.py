"""
Base classes and models for search service providers
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, HttpUrl, Field
from datetime import datetime


# Content truncation constants
MAX_CONTENT_PER_RESULT = 5000  # Max characters per result
MAX_TOTAL_CONTENT = 25000  # Max total characters for all results combined
MAX_RESULTS_FOR_SUMMARY = 10  # Max number of results to include in summary


def truncate_content(content: str, max_length: int = MAX_CONTENT_PER_RESULT) -> str:
    """
    Truncate content to a maximum length, adding ellipsis if truncated

    Args:
        content: Content string to truncate
        max_length: Maximum length of content

    Returns:
        Truncated content string
    """
    if not content:
        return ""
    if len(content) <= max_length:
        return content
    return content[:max_length] + "..."


def truncate_combined_content(content: str, max_length: int = MAX_TOTAL_CONTENT) -> str:
    """
    Truncate combined content to a maximum length

    Args:
        content: Combined content string to truncate
        max_length: Maximum length of combined content

    Returns:
        Truncated content string
    """
    if not content:
        return ""
    if len(content) <= max_length:
        return content
    return content[:max_length] + "\n\n... [Content truncated for brevity]"


class ImageResult(BaseModel):
    """Image search result model"""
    url: HttpUrl
    description: Optional[str] = None


class SearchResult(BaseModel):
    """Unified search result model across all providers"""
    title: str
    url: HttpUrl
    content: Optional[str] = None
    snippet: Optional[str] = None
    score: Optional[float] = None
    published_at: Optional[datetime] = None
    author: Optional[str] = None
    source: Optional[str] = None
    raw_content: Optional[str] = None
    image_url: Optional[HttpUrl] = None

    class Config:
        extra = "allow"


class SearchResponse(BaseModel):
    """Unified search response model"""
    query: str
    provider: str
    results: List[SearchResult] = Field(default_factory=list)
    # images: List[ImageResult] = Field(default_factory=list)
    total_results: Optional[int] = None
    answer: Optional[str] = None
    follow_up_questions: Optional[List[str]] = None
    response_time: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseSearchProvider(ABC):
    """Abstract base class for all search providers"""

    def __init__(self, api_key: Optional[str] = None, **kwargs):
        """
        Initialize the search provider

        Args:
            api_key: API key for the search provider
            **kwargs: Additional provider-specific configuration
        """
        self.api_key = api_key
        self.config = kwargs

    @abstractmethod
    async def search(
        self,
        query: str,
        max_results: int = 10,
        **kwargs
    ) -> SearchResponse:
        """
        Perform a search query

        Args:
            query: Search query string
            max_results: Maximum number of results to return
            **kwargs: Provider-specific search parameters

        Returns:
            SearchResponse object containing results
        """
        pass

    @abstractmethod
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
            **kwargs: Provider-specific search parameters

        Returns:
            SearchResponse object containing results
        """
        pass

    def format_results(self, response: SearchResponse) -> str:
        """
        Format search results as a readable string

        Args:
            response: SearchResponse object

        Returns:
            Formatted string representation of results
        """
        output = []
        output.append(f"Search Query: {response.query}")
        output.append(f"Provider: {response.provider}")
        output.append(f"Total Results: {response.total_results or len(response.results)}\n")

        if response.answer:
            output.append(f"Answer: {response.answer}\n")

        for idx, result in enumerate(response.results, 1):
            output.append(f"{idx}. {result.title}")
            output.append(f"   URL: {result.url}")
            if result.source:
                output.append(f"   Source: {result.source}")
            if result.published_at:
                output.append(f"   Published: {result.published_at}")
            if result.content or result.snippet:
                content = result.content or result.snippet
                output.append(f"   Content: {content[:200]}...")
            output.append("")

        if response.images:
            output.append(f"\nImages ({len(response.images)}):")
            for idx, image in enumerate(response.images[:5], 1):
                output.append(f"{idx}. {image.url}")
                if image.description:
                    output.append(f"   Description: {image.description}")

        return "\n".join(output)

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the name of the search provider"""
        pass
