from typing import Optional, Dict, Any, Union
import requests
import logging
import pandas as pd
from src.llm import FallbackLLM
from langchain_core.prompts import PromptTemplate
from langchain_core.prompts import ChatPromptTemplate
import re
from typing import List, Dict


logger = logging.getLogger(__name__)

def get_livechart_data(
    trading_pairs: str = "xau_usd",
    timezone: str = "UTC",
    interval: int = 3600,
    sort: str = "asc",
    limit: int = 2,
    offset: int = 7001
) -> Optional[Union[Dict[str, Any], pd.DataFrame]]:
    """
    Fetch live chart data from the external API and optionally convert to DataFrame.

    Args:
        trading_pairs (str): Trading pair symbol. Default: "xau_usd".
        timezone (str): Timezone for returned data. Default: "UTC".
        interval (int): Time interval in seconds (e.g., 3600 = 1 hour, 14400 = 4 hours).
        sort (str): Sort order, either "asc" or "desc". Default: "asc".
        limit (int): Number of records to fetch. Default: 2.
        offset (int): Starting point offset for pagination. Default: 7001.
        as_dataframe (bool): If True, return results as a Pandas DataFrame. Default: True.

    Returns:
        Optional[Union[Dict[str, Any], pd.DataFrame]]:
            - DataFrame with OHLCV data if `as_dataframe=True`.
            - Raw API JSON response if `as_dataframe=False`.
            - None if an error occurs.

    Example DataFrame output:
        Date_time                 Open     High      Low    Close  Volume
        2025-08-28 10:00:00   3399.24  3399.26  3393.78  3397.02   17474
        2025-08-28 11:00:00   3397.02  3407.67  3396.26  3404.09   18035
    """
    base_url = "https://gpcintegral.southeastasia.cloudapp.azure.com/livechart/data/"

    params = {
        "trading_pairs": trading_pairs,
        "timezone": timezone,
        "interval": interval,
        "sort": sort,
        "limit": limit,
        "offset": offset
    }

    try:
        logger.info(f"Fetching data for {trading_pairs} with params: {params}")
        response = requests.get(base_url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        logger.info(f"Successfully fetched {len(data.get('data', []))} records")

        # Convert to DataFrame if requested
        if "data" in data:
            df = pd.DataFrame(data["data"])
            if not df.empty and "Date_time" in df.columns:
                df["Date_time"] = pd.to_datetime(df["Date_time"])
                df.set_index("Date_time", inplace=True)
            return df

        return data

    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed: {e}")
        return None
    except ValueError as e:
        logger.error(f"JSON parsing failed: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return None


def get_latest_news(keyword: str):
    """
    Fetch latest news from the external API.
    
    Args:
        keyword (str): The keyword to search for in news articles.
    
    Returns:
        List[Dict[str, str]]: A list of news articles with title, summary, source_url, and source_name.
    """
    llm = FallbackLLM(openai_model="gpt-4.1-2025-04-14")
    question = f"""You are an AI assistant helping to the lates news about {keyword}.
        Please:
        - Use web search to include the latest information

        Return your answer in the format:
        - Title: <title>
        Summary: <summary>
        Link: <url only, no other text>

        - Title: <title>
        Summary: <summary>
        Link: <url only, no other text>


        Your answer:
        
        
        """
    
    web_search_llm = llm.with_web_search(enable=True)
    result_with_search = web_search_llm.invoke(question)
    news = result_with_search.content
    news_dict = extract_news_articles(news)
    return news_dict


def extract_news_articles(text: str) -> List[Dict[str, str]]:
    """
    Extract news articles from formatted text using regex.
    Handles multiple formats including direct URLs and source citations.
    
    Returns a list of dictionaries with keys: title, summary, source_url, source_name
    """
    
    # Split text by bullet points first to handle each article separately
    sections = re.split(r'\n-\s*Title:', text)
    articles = []
    
    for section in sections[1:]:  # Skip first empty section
        if not section.strip():
            continue
            
        # Extract title (first line)
        title_match = re.search(r'^([^\n]+)', section)
        title = title_match.group(1).strip() if title_match else ""
        
        # Extract summary (between Summary: and Link:)
        summary_match = re.search(r'Summary:\s*(.*?)\s*(?=Link:)', section, re.DOTALL)
        summary = summary_match.group(1).strip() if summary_match else ""
        
        # Extract link information
        # Handle format: Link: https://direct.url/
        direct_link_match = re.search(r'Link:\s*(https?://[^\s\n]+)', section)
        
        # Handle format: Link: (source from Something)
        source_citation_match = re.search(r'Link:\s*\(([^)]+)\)', section)
        
        if direct_link_match:
            url = direct_link_match.group(1).strip()
            # Extract domain from URL for source name
            domain_match = re.search(r'https?://(?:www\.)?([^/]+)', url)
            source_name = domain_match.group(1) if domain_match else "Unknown"
        elif source_citation_match:
            url = ""
            source_name = source_citation_match.group(1).strip()
        else:
            url = ""
            source_name = "Unknown"
        if title:  # Only add if we found a title
            article = {
                'title': title,
                'summary': summary,
                'source_url': url,
                'source_name': source_name
            }
            articles.append(article)
    return articles


if __name__ == "__main__":
    news = get_latest_news()
    import pdb; pdb.set_trace()
    print(news)