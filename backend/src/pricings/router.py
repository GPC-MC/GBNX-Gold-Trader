from fastapi import APIRouter, Query, HTTPException
from typing import List, Literal
from .price_client import (
    get_gold_ohlc,
    get_silver_ohlc,
    get_platinum_ohlc,
    get_sgd_ohlc,
    get_myr_ohlc,
    get_ohlc_data,
)
from .models import OHLCData, TradingPair

router = APIRouter(prefix="/api/pricing", tags=["Pricing"])


@router.get("/ohlc/{trading_pair}", response_model=List[OHLCData])
async def get_ohlc(
    trading_pair: TradingPair,
    interval: int = Query(3600, description="Interval in seconds"),
    limit: int = Query(50, ge=1, le=1000, description="Number of data points"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    sort: Literal["asc", "desc"] = Query("desc", description="Sort order"),
):
    try:
        return await get_ohlc_data(trading_pair, interval, limit, offset, sort)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ohlc/gold", response_model=List[OHLCData])
async def get_gold_prices(
    interval: int = Query(3600, description="Interval in seconds"),
    limit: int = Query(50, ge=1, le=1000, description="Number of data points"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    sort: Literal["asc", "desc"] = Query("desc", description="Sort order"),
):
    try:
        return await get_gold_ohlc(interval, limit, offset, sort)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ohlc/silver", response_model=List[OHLCData])
async def get_silver_prices(
    interval: int = Query(3600, description="Interval in seconds"),
    limit: int = Query(50, ge=1, le=1000, description="Number of data points"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    sort: Literal["asc", "desc"] = Query("desc", description="Sort order"),
):
    try:
        return await get_silver_ohlc(interval, limit, offset, sort)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ohlc/platinum", response_model=List[OHLCData])
async def get_platinum_prices(
    interval: int = Query(3600, description="Interval in seconds"),
    limit: int = Query(50, ge=1, le=1000, description="Number of data points"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    sort: Literal["asc", "desc"] = Query("desc", description="Sort order"),
):
    try:
        return await get_platinum_ohlc(interval, limit, offset, sort)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ohlc/sgd", response_model=List[OHLCData])
async def get_sgd_prices(
    interval: int = Query(3600, description="Interval in seconds"),
    limit: int = Query(50, ge=1, le=1000, description="Number of data points"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    sort: Literal["asc", "desc"] = Query("desc", description="Sort order"),
):
    try:
        return await get_sgd_ohlc(interval, limit, offset, sort)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ohlc/myr", response_model=List[OHLCData])
async def get_myr_prices(
    interval: int = Query(3600, description="Interval in seconds"),
    limit: int = Query(50, ge=1, le=1000, description="Number of data points"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    sort: Literal["asc", "desc"] = Query("desc", description="Sort order"),
):
    try:
        return await get_myr_ohlc(interval, limit, offset, sort)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
