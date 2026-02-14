import asyncio
from typing import List, Dict
from .price_client import get_ohlc_data
from .models import OHLCData, TradingPair


async def get_all_metals_ohlc(
    interval: int = 3600,
    limit: int = 50,
    offset: int = 0,
    sort: str = "desc",
) -> Dict[str, List[OHLCData]]:
    results = await asyncio.gather(
        get_ohlc_data(TradingPair.XAU_USD, interval, limit, offset, sort),
        get_ohlc_data(TradingPair.XAG_USD, interval, limit, offset, sort),
        get_ohlc_data(TradingPair.XPT_USD, interval, limit, offset, sort),
        return_exceptions=True,
    )

    return {
        "gold": results[0] if not isinstance(results[0], Exception) else [],
        "silver": results[1] if not isinstance(results[1], Exception) else [],
        "platinum": results[2] if not isinstance(results[2], Exception) else [],
    }


async def get_all_currencies_ohlc(
    interval: int = 3600,
    limit: int = 50,
    offset: int = 0,
    sort: str = "desc",
) -> Dict[str, List[OHLCData]]:
    results = await asyncio.gather(
        get_ohlc_data(TradingPair.USD_SGD, interval, limit, offset, sort),
        get_ohlc_data(TradingPair.USD_MYR, interval, limit, offset, sort),
        return_exceptions=True,
    )

    return {
        "sgd": results[0] if not isinstance(results[0], Exception) else [],
        "myr": results[1] if not isinstance(results[1], Exception) else [],
    }


async def get_all_trading_pairs_ohlc(
    interval: int = 3600,
    limit: int = 50,
    offset: int = 0,
    sort: str = "desc",
) -> Dict[str, List[OHLCData]]:
    results = await asyncio.gather(
        get_ohlc_data(TradingPair.XAU_USD, interval, limit, offset, sort),
        get_ohlc_data(TradingPair.XAG_USD, interval, limit, offset, sort),
        get_ohlc_data(TradingPair.XPT_USD, interval, limit, offset, sort),
        get_ohlc_data(TradingPair.USD_SGD, interval, limit, offset, sort),
        get_ohlc_data(TradingPair.USD_MYR, interval, limit, offset, sort),
        return_exceptions=True,
    )

    return {
        "xau_usd": results[0] if not isinstance(results[0], Exception) else [],
        "xag_usd": results[1] if not isinstance(results[1], Exception) else [],
        "xpt_usd": results[2] if not isinstance(results[2], Exception) else [],
        "usd_sgd": results[3] if not isinstance(results[3], Exception) else [],
        "usd_myr": results[4] if not isinstance(results[4], Exception) else [],
    }


async def get_multiple_pairs_ohlc(
    pairs: List[TradingPair],
    interval: int = 3600,
    limit: int = 50,
    offset: int = 0,
    sort: str = "desc",
) -> Dict[str, List[OHLCData]]:
    tasks = [
        get_ohlc_data(pair, interval, limit, offset, sort)
        for pair in pairs
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    return {
        pair.value: result if not isinstance(result, Exception) else []
        for pair, result in zip(pairs, results)
    }


def calculate_portfolio_value(
    holdings: Dict[TradingPair, float],
    latest_prices: Dict[TradingPair, List[OHLCData]],
) -> float:
    total_value = 0.0

    for pair, quantity in holdings.items():
        if pair in latest_prices and latest_prices[pair]:
            latest_price = latest_prices[pair][0].close
            total_value += quantity * latest_price

    return total_value


def get_market_summary(ohlc_data: List[OHLCData]) -> Dict[str, float]:
    if not ohlc_data:
        return {}

    sorted_data = sorted(ohlc_data, key=lambda x: x.timestamp)

    return {
        "current_price": sorted_data[-1].close,
        "open_price": sorted_data[0].open,
        "high": max(item.high for item in ohlc_data),
        "low": min(item.low for item in ohlc_data),
        "change": sorted_data[-1].close - sorted_data[0].open,
        "change_percent": ((sorted_data[-1].close - sorted_data[0].open) / sorted_data[0].open) * 100,
        "avg_price": sum(item.close for item in ohlc_data) / len(ohlc_data),
    }


async def get_all_market_summaries(
    interval: int = 3600,
    limit: int = 50,
) -> Dict[str, Dict[str, float]]:
    all_data = await get_all_trading_pairs_ohlc(interval, limit)

    return {
        pair: get_market_summary(data)
        for pair, data in all_data.items()
        if data
    }
