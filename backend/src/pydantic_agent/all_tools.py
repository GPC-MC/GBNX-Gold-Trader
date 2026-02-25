from pydantic_ai import RunContext
from src.search_service.unified_search import UnifiedSearchService
from dataclasses import dataclass
from typing import List, Optional, Generator
import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
import os
from src.pydantic_agent.pricing_tools import get_pricing_tools
import re
from urllib.parse import unquote
from src.app_config import app_config
from src.debug_print import debug, info, success, warning, error, critical


load_dotenv()


llm = ChatOpenAI(
    model="gpt-4o-mini",
    base_url=app_config.LITE_LLM_ENDPOINT_URL,
    api_key=app_config.LITE_LLM_API_KEY,
)

qwen_llm = ChatOpenAI(
    model="qwen-max",
    base_url=app_config.LITE_LLM_ENDPOINT_URL,
    api_key=app_config.LITE_LLM_API_KEY,
)


unified_search = UnifiedSearchService()


@dataclass
class AgentDeps:
    session_id: Optional[str]

"""
async def search_web(ctx: RunContext[None], query: str) -> str:
    result = await unified_search.search_and_summarize_all(
        query=query,
        max_results=10
    )
    return result
"""

async def planning(ctx: RunContext[None], question: str) -> str:
    prompt = f"""You are an expert planning assistant for a gold and precious metals trading platform. Create a detailed, natural-language plan for answering the following question.

        User Question: {question}

        Available Tools:
        - search_web: ONLY for current events, real-time news, macro/geopolitical context, or topics outside the platform's data.

        Pricing & Market Data Tools (use these for any price, trend, or market question):
        - get_current_price: Latest OHLC snapshot for a single trading pair (xau_usd, xag_usd, xpt_usd, usd_sgd, usd_myr).
        - get_market_summary_tool: Price, change %, average, and volatility for a pair over a chosen timeframe.
        - get_price_history: Recent OHLC candlestick table for a pair (useful for showing raw data to the user).
        - analyze_price_trend: SMA-10/20/50, momentum direction, support/resistance, and volatility — best for technical analysis questions.
        - get_all_metals_overview: Combined Gold + Silver + Platinum summary in one call — use for broad metals market questions.
        - compare_trading_pairs_tool: Side-by-side comparison of multiple pairs — use when the user asks to compare assets.
        - get_full_market_snapshot: All five trading pairs at once — ideal for daily briefings or "how is the market?" queries.

        IMPORTANT decision rules:
        - For ANY question about current prices, trends, or market performance → use a pricing tool, NOT search_web.
        - For questions comparing metals or currencies → use compare_trading_pairs_tool or get_all_metals_overview.
        - For technical analysis (trend, support, resistance, SMA) → use analyze_price_trend.
        - For broad market overviews → use get_full_market_snapshot.
        - Only use search_web when the question requires news, external events, or data beyond platform pricing.
        - Prefer the most specific pricing tool for the question to minimise unnecessary API calls.

        Your Planning Task:
        Write a clear, professional paragraph (3-5 sentences) that explains:
        1. What information you need to gather
        2. Which specific tool(s) you will use and why
        3. How you will interpret the data
        4. How you will synthesise findings into a useful response for a gold trader

        Format your response as a natural planning paragraph, not a checklist.
        Your Plan:"""
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    debug(f"Planning response: {response.content}")
    return response.content if hasattr(response, 'content') else str(response)



async def general_knowledge(ctx: RunContext[None], question: str) -> str:
    prompt = f"""You are an expert general knowledge assistant. Answer the following question based on the available knowledge.
        User Question: {question}
        Your Answer:"""
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    debug(f"General knowledge response: {response.content}")
    return response.content if hasattr(response, 'content') else str(response)



async def search_web(
    ctx: RunContext[AgentDeps],
    query: str,
    max_results: int = 10,
) -> str:
    """
    Search the web using unified search across Google, NewsAPI, and Tavily.
    """
    response = await unified_search.search_and_summarize_all(
        query=query,
        max_results=max_results,
    )
    return response







def get_all_tools():
    return [
        search_web,
        planning,
        *get_pricing_tools(),
    ]