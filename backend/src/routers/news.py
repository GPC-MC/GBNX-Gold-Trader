import logging
from functools import lru_cache
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.search_service.news_search_summarize import (
    NewsSentimentAnalyzer,
    NewsSentimentResult,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/news", tags=["news"])


class NewsSentimentRequest(BaseModel):
    query: str = Field(min_length=3, description="News query to analyze sentiment for")
    max_results: int = Field(default=10, ge=1, le=20)
    recency: Optional[str] = Field(default="week", description="day|week|month|year")
    model: str = Field(default="gpt-4.1-mini")
    max_articles: int = Field(default=10, ge=1, le=20)


@lru_cache(maxsize=4)
def _get_analyzer(model_name: str, max_articles: int) -> NewsSentimentAnalyzer:
    return NewsSentimentAnalyzer(
        model_name=model_name,
        max_articles_for_context=max_articles,
    )


@router.post("/sentiment", response_model=NewsSentimentResult)
async def analyze_news_sentiment(req: NewsSentimentRequest):
    try:
        analyzer = _get_analyzer(req.model, req.max_articles)
        return await analyzer.analyze_news_sentiment(
            query=req.query,
            max_results=req.max_results,
            search_recency_filter=req.recency,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Failed to analyze per-news sentiment")
        raise HTTPException(status_code=500, detail=f"Failed to analyze sentiment: {e}")
