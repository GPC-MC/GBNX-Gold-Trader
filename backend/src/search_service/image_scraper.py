"""
Image Scraper Utility

This module provides utilities for scraping images from web pages.
It uses multiple strategies to find the most relevant image for a URL.
"""

import asyncio
from typing import Optional, List
from urllib.parse import urljoin, urlparse
import httpx
from bs4 import BeautifulSoup


class ImageScraper:
    """
    Scrapes images from web pages using multiple strategies:
    1. Open Graph meta tags (og:image)
    2. Twitter Card meta tags (twitter:image)
    3. Schema.org image markup
    4. First relevant <img> tag in content
    """

    def __init__(
        self,
        timeout: float = 5.0,
        max_retries: int = 2,
        user_agent: Optional[str] = None,
    ):
        """
        Initialize the image scraper

        Args:
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            user_agent: Custom user agent string
        """
        self.timeout = timeout
        self.max_retries = max_retries
        self.user_agent = user_agent or (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        )

    async def scrape_image_from_url(self, url: str) -> Optional[str]:
        """
        Scrape the primary image from a webpage URL

        Args:
            url: The URL to scrape

        Returns:
            Image URL if found, None otherwise
        """
        try:
            headers = {
                "User-Agent": self.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate",
                "Connection": "keep-alive",
            }

            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout),
                follow_redirects=True,
                headers=headers,
            ) as client:
                response = await client.get(url)

                # Only process successful responses
                if response.status_code != 200:
                    return None

                # Parse HTML content
                soup = BeautifulSoup(response.content, "html.parser")

                # Try multiple strategies in order of reliability
                image_url = (
                    self._get_og_image(soup)
                    or self._get_twitter_image(soup)
                    or self._get_schema_image(soup)
                    or self._get_first_content_image(soup)
                )

                # Convert relative URLs to absolute
                if image_url:
                    image_url = urljoin(url, image_url)

                    # Validate the image URL
                    if self._is_valid_image_url(image_url):
                        return image_url

                return None

        except httpx.TimeoutException:
            print(f"Timeout scraping image from {url}")
            return None
        except httpx.HTTPError as e:
            print(f"HTTP error scraping image from {url}: {e}")
            return None
        except Exception as e:
            print(f"Error scraping image from {url}: {e}")
            return None

    def _get_og_image(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract Open Graph image (most reliable)"""
        og_image = soup.find("meta", property="og:image")
        if og_image and og_image.get("content"):
            return og_image["content"]

        # Try alternate og:image format
        og_image_alt = soup.find("meta", {"property": "og:image:url"})
        if og_image_alt and og_image_alt.get("content"):
            return og_image_alt["content"]

        return None

    def _get_twitter_image(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract Twitter Card image"""
        twitter_image = soup.find("meta", {"name": "twitter:image"})
        if twitter_image and twitter_image.get("content"):
            return twitter_image["content"]

        # Try twitter:image:src
        twitter_image_src = soup.find("meta", {"name": "twitter:image:src"})
        if twitter_image_src and twitter_image_src.get("content"):
            return twitter_image_src["content"]

        return None

    def _get_schema_image(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract image from Schema.org markup"""
        # Look for JSON-LD schema
        schema_scripts = soup.find_all("script", {"type": "application/ld+json"})
        for script in schema_scripts:
            try:
                import json
                data = json.loads(script.string)

                # Handle both single objects and arrays
                items = [data] if isinstance(data, dict) else data

                for item in items:
                    if isinstance(item, dict) and "image" in item:
                        image = item["image"]
                        if isinstance(image, str):
                            return image
                        elif isinstance(image, dict) and "url" in image:
                            return image["url"]
                        elif isinstance(image, list) and len(image) > 0:
                            first_image = image[0]
                            if isinstance(first_image, str):
                                return first_image
                            elif isinstance(first_image, dict) and "url" in first_image:
                                return first_image["url"]
            except (json.JSONDecodeError, KeyError, AttributeError):
                continue

        return None

    def _get_first_content_image(self, soup: BeautifulSoup) -> Optional[str]:
        """
        Extract first relevant image from page content

        Filters out common non-content images like logos, icons, etc.
        """
        # Skip common non-content images
        skip_patterns = [
            "logo", "icon", "avatar", "badge", "button",
            "sprite", "pixel", "tracking", "advertisement",
            "ad", "banner", "1x1", "spacer"
        ]

        # Look for images in main content areas first
        content_areas = soup.find_all(
            ["article", "main", "div"],
            class_=lambda x: x and any(
                term in x.lower() for term in ["content", "article", "post", "story"]
            )
        )

        # If no content areas found, search entire page
        if not content_areas:
            content_areas = [soup]

        for area in content_areas:
            images = area.find_all("img", src=True)

            for img in images:
                src = img.get("src", "")
                alt = img.get("alt", "").lower()

                # Skip if matches skip patterns
                if any(pattern in src.lower() or pattern in alt for pattern in skip_patterns):
                    continue

                # Skip very small images (likely icons/logos)
                width = img.get("width")
                height = img.get("height")
                if width and height:
                    try:
                        if int(width) < 100 or int(height) < 100:
                            continue
                    except (ValueError, TypeError):
                        pass

                # This looks like a content image
                return src

        return None

    def _is_valid_image_url(self, url: str) -> bool:
        """
        Validate that the URL looks like a valid image URL

        Args:
            url: URL to validate

        Returns:
            True if URL appears valid, False otherwise
        """
        try:
            parsed = urlparse(url)

            # Must have scheme and netloc
            if not parsed.scheme or not parsed.netloc:
                return False

            # Check for common image extensions (optional - many CDNs don't use extensions)
            image_extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"]
            path_lower = parsed.path.lower()

            # If it has an extension, check if it's an image
            if any(path_lower.endswith(ext) for ext in image_extensions):
                return True

            # Many CDN URLs don't have extensions, so accept URLs without clear non-image extensions
            non_image_extensions = [".html", ".htm", ".php", ".asp", ".js", ".css", ".xml", ".json"]
            if any(path_lower.endswith(ext) for ext in non_image_extensions):
                return False

            # Accept if no clear extension or looks like an image URL
            return True

        except Exception:
            return False

    async def scrape_images_batch(
        self,
        urls: List[str],
        max_concurrent: int = 5
    ) -> List[Optional[str]]:
        """
        Scrape images from multiple URLs concurrently

        Args:
            urls: List of URLs to scrape
            max_concurrent: Maximum number of concurrent requests

        Returns:
            List of image URLs (same order as input URLs, None if not found)
        """
        semaphore = asyncio.Semaphore(max_concurrent)

        async def scrape_with_limit(url: str) -> Optional[str]:
            async with semaphore:
                return await self.scrape_image_from_url(url)

        tasks = [scrape_with_limit(url) for url in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)


# Convenience function for simple use cases
async def scrape_image_from_url(
    url: str,
    timeout: float = 5.0
) -> Optional[str]:
    """
    Convenience function to scrape a single image from a URL

    Args:
        url: The URL to scrape
        timeout: Request timeout in seconds

    Returns:
        Image URL if found, None otherwise
    """
    scraper = ImageScraper(timeout=timeout)
    return await scraper.scrape_image_from_url(url)


# Convenience function for batch scraping
async def scrape_images_batch(
    urls: List[str],
    timeout: float = 5.0,
    max_concurrent: int = 5
) -> List[Optional[str]]:
    """
    Convenience function to scrape images from multiple URLs

    Args:
        urls: List of URLs to scrape
        timeout: Request timeout in seconds
        max_concurrent: Maximum number of concurrent requests

    Returns:
        List of image URLs (same order as input, None if not found)
    """
    scraper = ImageScraper(timeout=timeout)
    return await scraper.scrape_images_batch(urls, max_concurrent)


if __name__ == "__main__":
    # Example usage
    async def main():
        test_urls = [
            "https://en.wikipedia.org/wiki/Naruto_(TV_series)",
            "https://www.bbc.com/news",
            "https://github.com",
        ]

        scraper = ImageScraper(timeout=5.0)

        print("Testing single URL scraping:")
        for url in test_urls[:1]:
            image = await scraper.scrape_image_from_url(url)
            print(f"\nURL: {url}")
            print(f"Image: {image}")

        print("\n" + "="*80)
        print("Testing batch scraping:")
        images = await scraper.scrape_images_batch(test_urls, max_concurrent=3)

        for url, image in zip(test_urls, images):
            print(f"\nURL: {url}")
            print(f"Image: {image}")

    asyncio.run(main())
