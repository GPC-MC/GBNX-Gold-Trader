import asyncio
import base64
import hashlib
import io
import json
import os
import queue
import re
import shutil
import tempfile
import threading
import time
import uuid
import wave
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List, Set

import boto3
import numpy as np
import openai  # or other LLM client
import requests
import sounddevice as sd
import torch
import torchaudio
import uvicorn
import websockets
from fastapi import (
    FastAPI,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from langchain.schema import AIMessage, HumanMessage, SystemMessage
from pyannote.audio import Pipeline
from pydantic import BaseModel
from RealtimeSTT import AudioToTextRecorder
from src.agent import Agent
from src.schema import ChatRequest, UserThread, UserQuestion, NewsRequest, InitializeAgentRequest
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import logging

import requests
from typing import Dict, Any, Optional, List
import logging
import pandas as pd
import numpy as np
from src.llm import FallbackLLM
from langchain_core.prompts import PromptTemplate
from src.tools import get_latest_news
from textblob import TextBlob
import re


logger = logging.getLogger(__name__)




app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  
    allow_methods=["*"], 
    allow_headers=["*"],  
)


agent = None


@app.get("/")
async def root():
    current_time = time.strftime("%Y-%m-%d %H:%M:%S")
    return {"message": "AI Agent platform is running v1!", "datetime": current_time}

@app.post("/initialize_agent")
async def initialize_agent(request: InitializeAgentRequest):
    global agent
    try:
        agent = Agent(expert_prompt=request.expert_prompt)
        logger.info("Agent initialized successfully")
        return {"message": "Agent initialized successfully"}
    except Exception as e:
        logger.error(f"Error initializing agent: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initialize agent: {str(e)}")

@app.post("/chat")
async def chat(request: ChatRequest):
    global agent
    if agent is None:
        raise HTTPException(status_code=400, detail="Agent not initialized. Please call /initialize_agent first.")
    
    try:
        user_thread = UserThread(user_id="1", thread_id="1", agent_name="calculator")
        user_question = UserQuestion(user_thread=user_thread, question=request.question)
        start_time = time.time()
        res = agent.print_stream(user_question)
        end_time = time.time()
        time_taken = end_time - start_time
        logger.info(f"Chat response generated in {time_taken:.2f} seconds")
        return {"message": res, "time_taken": time_taken}
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")



class LiveChartRequest(BaseModel):
    trading_pairs: str = "xau_usd"
    timezone: str = "UTC"
    interval: int = 3600
    sort: str = "asc"
    limit: int = 2
    offset: int = 7001

class NewsArticle(BaseModel):
    title: str
    summary: str
    source_url: str
    source_name: str

class NewsResponse(BaseModel):
    articles: List[NewsArticle]
    count: int

class SentimentAnalysisRequest(BaseModel):
    text: str
    source: Optional[str] = "user_input"

class SentimentResult(BaseModel):
    sentiment: str  # positive, negative, neutral
    score: float  # -1 to 1
    magnitude: float  # 0 to 1
    label: str  # Bullish, Bearish, Neutral
    confidence: str  # High, Medium, Low

class SentimentAnalysisResponse(BaseModel):
    result: SentimentResult
    analysis: str
    keywords: List[str]

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
    params = payload.dict()
    
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

@app.post("/latest_news", response_model=NewsResponse)
async def get_latest_news_endpoint(request: NewsRequest):
    """
    API endpoint to fetch the latest news based on a keyword.
    
    Args:
        request (NewsRequest): Contains the keyword to search for in news articles.
    
    Returns:
        NewsResponse: Contains a list of news articles with title, summary, 
                     source URL, and source name, along with the total count.
    """
    try:
        logger.info(f"Fetching latest news for keyword: {request.keyword}")
        news_articles = get_latest_news(request.keyword)
        
        if not news_articles:
            logger.warning(f"No news articles found for keyword: {request.keyword}")
            return NewsResponse(articles=[], count=0)
        
        # Convert the list of dictionaries to NewsArticle objects
        articles = [NewsArticle(**article) for article in news_articles]
        
        logger.info(f"Successfully fetched {len(articles)} news articles for keyword: {request.keyword}")
        return NewsResponse(articles=articles, count=len(articles))
        
    except Exception as e:
        logger.error(f"Error fetching latest news for keyword '{request.keyword}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch latest news: {str(e)}")

@app.post("/livechart_data")
async def get_livechart_data_endpoint(request: LiveChartRequest):
    """
    API endpoint to fetch live chart data with technical indicators.
    
    Returns OHLCV data enhanced with:
    - EMA_20: 20-period Exponential Moving Average
    - Stochastic_D: Stochastic %D oscillator
    - CCI: Commodity Channel Index
    - ADX: Average Directional Index
    """
    data = get_livechart_data(request)
    if data is None:
        raise HTTPException(status_code=500, detail="Failed to fetch data from external API")
    return data

def fetch_gold_data():
    """Convenience function to fetch XAU/USD data with default parameters."""
    req = LiveChartRequest(
        trading_pairs="xau_usd",
        timezone="UTC",
        interval=3600,
        sort="asc",
        limit=2,
        offset=7001
    )
    return get_livechart_data(req)

def fetch_more_data_for_indicators():
    """
    Fetch more data points to ensure reliable technical indicator calculations.
    Recommended for testing with sufficient data.
    """
    req = LiveChartRequest(
        trading_pairs="xau_usd",
        timezone="UTC",
        interval=3600,
        sort="asc",
        limit=50,  # Get more data points for better indicator accuracy
        offset=6950  # Start earlier to get enough historical data
    )
    return get_livechart_data(req)

def extract_financial_keywords(text: str) -> List[str]:
    """Extract relevant financial and market keywords from text"""
    # Common gold trading and market keywords
    gold_keywords = [
        'gold', 'xau', 'bullion', 'precious metals',
        'fed', 'federal reserve', 'interest rate', 'inflation',
        'dollar', 'usd', 'currency', 'forex',
        'bull', 'bear', 'rally', 'correction', 'breakout',
        'support', 'resistance', 'trend', 'momentum',
        'risk', 'hedge', 'safe haven', 'volatility'
    ]

    text_lower = text.lower()
    found_keywords = []

    for keyword in gold_keywords:
        if keyword in text_lower:
            found_keywords.append(keyword)

    return found_keywords[:10]  # Limit to top 10 keywords

def analyze_market_sentiment(text: str) -> SentimentResult:
    """
    Analyze sentiment of market-related text using TextBlob.
    Returns sentiment tailored for financial/trading context.
    """
    # Clean the text
    text = re.sub(r'http\S+', '', text)  # Remove URLs
    text = re.sub(r'[^a-zA-Z0-9\s.,!?]', '', text)  # Remove special characters

    # Perform sentiment analysis
    blob = TextBlob(text)
    polarity = blob.sentiment.polarity  # -1 to 1
    subjectivity = blob.sentiment.subjectivity  # 0 to 1

    # Map to financial sentiment labels
    if polarity > 0.1:
        sentiment = "positive"
        label = "Bullish"
    elif polarity < -0.1:
        sentiment = "negative"
        label = "Bearish"
    else:
        sentiment = "neutral"
        label = "Neutral"

    # Calculate magnitude (strength of sentiment)
    magnitude = abs(polarity)

    # Determine confidence based on subjectivity and magnitude
    if magnitude > 0.5 and subjectivity > 0.5:
        confidence = "High"
    elif magnitude > 0.2 or subjectivity > 0.3:
        confidence = "Medium"
    else:
        confidence = "Low"

    return SentimentResult(
        sentiment=sentiment,
        score=round(polarity, 3),
        magnitude=round(magnitude, 3),
        label=label,
        confidence=confidence
    )

def generate_sentiment_analysis(text: str, sentiment_result: SentimentResult, keywords: List[str]) -> str:
    """Generate human-readable analysis of the sentiment"""
    analysis_parts = []

    # Opening statement
    analysis_parts.append(
        f"The text shows a {sentiment_result.label.lower()} sentiment with a {sentiment_result.confidence.lower()} confidence level."
    )

    # Score interpretation
    if sentiment_result.score > 0.5:
        analysis_parts.append(
            f"The sentiment score of {sentiment_result.score} indicates strong positive market sentiment."
        )
    elif sentiment_result.score > 0.1:
        analysis_parts.append(
            f"The sentiment score of {sentiment_result.score} indicates moderate positive sentiment."
        )
    elif sentiment_result.score < -0.5:
        analysis_parts.append(
            f"The sentiment score of {sentiment_result.score} indicates strong negative market sentiment."
        )
    elif sentiment_result.score < -0.1:
        analysis_parts.append(
            f"The sentiment score of {sentiment_result.score} indicates moderate negative sentiment."
        )
    else:
        analysis_parts.append(
            f"The sentiment score of {sentiment_result.score} indicates neutral market sentiment."
        )

    # Keywords context
    if keywords:
        keywords_str = ", ".join(keywords[:5])
        analysis_parts.append(
            f"Key market indicators mentioned include: {keywords_str}."
        )

    # Trading implication
    if sentiment_result.label == "Bullish" and sentiment_result.confidence == "High":
        analysis_parts.append(
            "This suggests potential upward price momentum for gold."
        )
    elif sentiment_result.label == "Bearish" and sentiment_result.confidence == "High":
        analysis_parts.append(
            "This suggests potential downward pressure on gold prices."
        )
    else:
        analysis_parts.append(
            "Market direction remains uncertain based on this analysis."
        )

    return " ".join(analysis_parts)

@app.post("/analyze_sentiment", response_model=SentimentAnalysisResponse)
async def analyze_sentiment_endpoint(request: SentimentAnalysisRequest):
    """
    API endpoint to analyze sentiment of market-related text.

    Args:
        request (SentimentAnalysisRequest): Contains the text to analyze.

    Returns:
        SentimentAnalysisResponse: Contains sentiment results, analysis, and keywords.
    """
    try:
        logger.info(f"Analyzing sentiment for text from source: {request.source}")

        if not request.text or len(request.text.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Text must be at least 10 characters long"
            )

        # Perform sentiment analysis
        sentiment_result = analyze_market_sentiment(request.text)

        # Extract keywords
        keywords = extract_financial_keywords(request.text)

        # Generate analysis
        analysis = generate_sentiment_analysis(request.text, sentiment_result, keywords)

        logger.info(f"Sentiment analysis completed: {sentiment_result.label} ({sentiment_result.confidence})")

        return SentimentAnalysisResponse(
            result=sentiment_result,
            analysis=analysis,
            keywords=keywords
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing sentiment: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze sentiment: {str(e)}"
        )