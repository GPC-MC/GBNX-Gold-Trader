import re
from typing import List

from langchain.output_parsers import PydanticOutputParser
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import StructuredTool, tool
from langchain_openai import ChatOpenAI
from pydantic import BaseModel
from src.app_config import app_config
from src.database_handler.mongodb_handler import MemoryHandler
from src.database_handler.qdrant_connector import QdrantDBClient
from src.base_agent import create_langgraph_react_agent
from src.schema import (
    ConversationInfor,

    Message,
    UserQuestion,
    UserThread,
)

from src.llm import FallbackLLM
import numpy as np 
import pandas as pd
import requests
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

SYSTEM_PROMPT="""
You are an expert in gold trading and investment. You are able to answer questions about gold trading and investment.
YOu have knowledge in technical analysis and fundamental analysis.
You will use the fetch_more_data_for_indicators tool to do technical analysis the live chart data about the gold price with xau_usd pair, interval in seconds, limit is the number of records you want to get, offset is the starting point of the records you want to get.
Your answer is just the analysis, you don't need to show data to the user.

Use the above knowledge from experts can help you to answer the question better 

"""


class LiveChartRequest(BaseModel):
    trading_pairs: str = "xau_usd"
    timezone: str = "UTC"
    interval: int = 3600
    sort: str = "asc"
    limit: int = 50
    offset: int = 6950




def calculate_ema(data: pd.Series, period: int) -> pd.Series:
    """Calculate Exponential Moving Average"""
    return data.ewm(span=period, adjust=False).mean()

def calculate_stochastic_d(high: pd.Series, low: pd.Series, close: pd.Series, k_period: int = 14, d_period: int = 3) -> pd.Series:
    """Calculate Stochastic %D"""
    # First calculate %K
    lowest_low = low.rolling(window=k_period).min()
    highest_high = high.rolling(window=k_period).max()
    k_percent = 100 * (close - lowest_low) / (highest_high - lowest_low)
    
    # Then calculate %D (SMA of %K)
    d_percent = k_percent.rolling(window=d_period).mean()
    return d_percent

def calculate_cci(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 20) -> pd.Series:
    """Calculate Commodity Channel Index"""
    typical_price = (high + low + close) / 3
    sma_tp = typical_price.rolling(window=period).mean()
    mean_deviation = typical_price.rolling(window=period).apply(
        lambda x: np.mean(np.abs(x - np.mean(x))), raw=True
    )
    cci = (typical_price - sma_tp) / (0.015 * mean_deviation)
    return cci

def calculate_adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Average Directional Index (ADX)"""
    # Calculate True Range
    high_low = high - low
    high_close = np.abs(high - close.shift())
    low_close = np.abs(low - close.shift())
    true_range = np.maximum(high_low, np.maximum(high_close, low_close))
    
    # Calculate Directional Movement
    plus_dm = high.diff()
    minus_dm = low.diff() * -1
    
    plus_dm[plus_dm < 0] = 0
    minus_dm[minus_dm < 0] = 0
    plus_dm[(plus_dm < minus_dm)] = 0
    minus_dm[(minus_dm < plus_dm)] = 0
    
    # Calculate smoothed averages
    tr_smooth = true_range.ewm(alpha=1/period, adjust=False).mean()
    plus_dm_smooth = plus_dm.ewm(alpha=1/period, adjust=False).mean()
    minus_dm_smooth = minus_dm.ewm(alpha=1/period, adjust=False).mean()
    
    # Calculate Directional Indicators
    plus_di = 100 * plus_dm_smooth / tr_smooth
    minus_di = 100 * minus_dm_smooth / tr_smooth
    
    # Calculate ADX
    dx = 100 * np.abs(plus_di - minus_di) / (plus_di + minus_di)
    adx = dx.ewm(alpha=1/period, adjust=False).mean()
    
    return adx

def add_technical_indicators(data: list) -> list:
    """Add technical indicators to the OHLCV data"""
    if not data or len(data) < 20:  # Need at least 20 periods for reliable calculations
        logger.warning(f"Insufficient data for technical indicator calculations. Got {len(data) if data else 0} records, need at least 20")
        # Still add the indicator columns with None values
        for record in data:
            record.update({
                'EMA_20': None,
                'Stochastic_D': None,
                'CCI': None,
                'ADX': None
            })
        return data
    
    try:
        # Convert to DataFrame for easier calculations
        df = pd.DataFrame(data)
        df['Date_time'] = pd.to_datetime(df['Date_time'])
        df = df.sort_values('Date_time').reset_index(drop=True)
        
        # Calculate technical indicators
        df['EMA_20'] = calculate_ema(df['Close'], 20)
        df['Stochastic_D'] = calculate_stochastic_d(df['High'], df['Low'], df['Close'])
        df['CCI'] = calculate_cci(df['High'], df['Low'], df['Close'])
        df['ADX'] = calculate_adx(df['High'], df['Low'], df['Close'])
        
        # Round values to reasonable precision
        df['EMA_20'] = df['EMA_20'].round(2)
        df['Stochastic_D'] = df['Stochastic_D'].round(2)
        df['CCI'] = df['CCI'].round(2)
        df['ADX'] = df['ADX'].round(2)
        
        # Convert back to list of dictionaries
        enhanced_data = df.to_dict('records')
        
        # Convert datetime back to string format and handle NaN values
        for record in enhanced_data:
            if pd.notna(record['Date_time']):
                record['Date_time'] = record['Date_time'].isoformat()
            # Handle NaN values by converting to None
            for key, value in record.items():
                if pd.isna(value):
                    record[key] = None
        
        logger.info(f"Technical indicators calculated successfully for {len(enhanced_data)} records")
        return enhanced_data
        
    except Exception as e:
        logger.error(f"Error calculating technical indicators: {e}")
        # Fallback: add indicator columns with None values
        for record in data:
            record.update({
                'EMA_20': None,
                'Stochastic_D': None,
                'CCI': None,
                'ADX': None
            })
        return data

def get_livechart_data(payload: LiveChartRequest) -> Optional[Dict[str, Any]]:
    """
    Fetch live chart data from the API endpoint and add technical indicators.
    """
    base_url = "https://gpcintegral.southeastasia.cloudapp.azure.com/livechart/data/"
    params = payload.model_dump()
    
    try:
        logger.info(f"Fetching data for {payload.trading_pairs} with params: {params}")
        response = requests.get(base_url, params=params, timeout=30)
        response.raise_for_status() 
        data = response.json()
        
        original_count = len(data.get('data', []))
        logger.info(f"Successfully fetched {original_count} records")
        
        # Add technical indicators to the data
        if 'data' in data and data['data']:
            logger.info("Calculating technical indicators...")
            enhanced_data = add_technical_indicators(data['data'])
            data['data'] = enhanced_data
            
            # Count records with calculated indicators (non-null EMA_20)
            calculated_count = sum(1 for record in enhanced_data if record.get('EMA_20') is not None)
            logger.info(f"Technical indicators calculated for {calculated_count}/{original_count} records")
        
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


def fetch_more_data_for_indicators(
    trading_pairs: str = "xau_usd",
    timezone: str = "UTC",
    interval: int = 3600,
    sort: str = "asc",
    limit: int = 50,
    offset: int = 6950,
):
    """
    Fetch more data points to ensure reliable technical indicator calculations.
    Recommended for testing with sufficient data.
    """
    req = LiveChartRequest(
        trading_pairs=trading_pairs,
        timezone=timezone,
        interval=interval,
        sort=sort,
        limit=limit,  # Get more data points for better indicator accuracy
        offset=offset,  # Start earlier to get enough historical data
    )
    return get_livechart_data(req)

class Agent:
    def __init__(self, expert_prompt: str):
        self.database_handler = QdrantDBClient(collection_name="brochure")
        self.database_handler.connect_to_database()
        self.memory_handler = MemoryHandler(db_name="test", collection_name="test")
        self.memory_handler.connect_to_database()
        self.llm = FallbackLLM(openai_model="gpt-4.1-2025-04-14")
        fetch_more_data_for_indicators_tool = StructuredTool.from_function(
            func=fetch_more_data_for_indicators,
            name="fetch_more_data_for_indicators",
            description="Fetch live chart data and add technical indicators (EMA_20, Stochastic_D, CCI, ADX).",
            args_schema=LiveChartRequest,
        )
        self.tools = [
            self.database_handler.search_similar_texts,
            fetch_more_data_for_indicators_tool,
        ]
        self.react_agent = create_langgraph_react_agent(
            self.llm, tools=self.tools, prompt=SYSTEM_PROMPT + expert_prompt
        )

    def generate_response(self, input: str) -> str:
        result = self.react_agent.invoke({"messages": [{"role": "user", "content": input}]})
        message = result.get("messages", [])[-1] if isinstance(result, dict) else result
        if isinstance(message, tuple):
            return str(message)
        return getattr(message, "content", str(message))

    def print_stream(self, user_question: UserQuestion):
        self.question = user_question.question
        messages = self._get_chat_history(user_question.user_thread)
        messages.append({"role": "user", "content": user_question.question})
        for s in self.react_agent.stream({"messages": messages}, stream_mode="values"):
            message = s["messages"][-1]
            if isinstance(message, tuple):
                print(message)
            else:
                message.pretty_print()
        self._save_conversation(
            user_question.user_thread, user_question.question, message.content
        )
        return message.content if message else ""

    def _get_chat_history(self, user_thread: UserThread):
        chat_history = self.memory_handler.retrieve_conversation(user_thread)
        if not chat_history or "messages" not in chat_history:
            return []
        messages = chat_history["messages"]
        return [
            {"role": msg["role"], "content": msg["content"]} for msg in messages[-6:]
        ]

    def _save_conversation(self, user_thread: UserThread, question: str, answer: str):
        conversation = ConversationInfor(
            user_thread_infor=user_thread,
            messages=[
                Message(role="user", content=question),
                Message(role="assistant", content=answer),
            ],
        )
        self.memory_handler.insert_or_update_conversation(conversation)
