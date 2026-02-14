import httpx
from typing import List, Optional, Literal
from .models import OHLCData, TradingPair


BASE_URL = "https://gpcintegral.southeastasia.cloudapp.azure.com"


async def get_ohlc_data(
    trading_pair: TradingPair | str,
    interval: int = 3600,
    limit: int = 50,
    offset: int = 0,
    sort: Literal["asc", "desc"] = "desc",
) -> List[OHLCData]:
    if isinstance(trading_pair, str):
        trading_pair = TradingPair(trading_pair)

    url = f"{BASE_URL}/livechart/data/"
    params = {
        "trading_pairs": trading_pair.value,
        "interval": interval,
        "limit": limit,
        "offset": offset,
        "sort": sort,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        return [
            OHLCData(
                timestamp=item["timestamp"],
                open=item["open"],
                high=item["high"],
                low=item["low"],
                close=item["close"],
                volume=item.get("volume"),
                trading_pair=trading_pair.value,
            )
            for item in data
        ]


def get_ohlc_data_sync(
    trading_pair: TradingPair | str,
    interval: int = 3600,
    limit: int = 50,
    offset: int = 0,
    sort: Literal["asc", "desc"] = "desc",
) -> List[OHLCData]:
    if isinstance(trading_pair, str):
        trading_pair = TradingPair(trading_pair)

    url = f"{BASE_URL}/livechart/data/"
    params = {
        "trading_pairs": trading_pair.value,
        "interval": interval,
        "limit": limit,
        "offset": offset,
        "sort": sort,
    }

    with httpx.Client() as client:
        response = client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        return [
            OHLCData(
                timestamp=item["timestamp"],
                open=item["open"],
                high=item["high"],
                low=item["low"],
                close=item["close"],
                volume=item.get("volume"),
                trading_pair=trading_pair.value,
            )
            for item in data
        ]


async def get_gold_ohlc(
    interval: int = 3600,
    limit: int = 50,
    offset: int = 0,
    sort: Literal["asc", "desc"] = "desc",
) -> List[OHLCData]:
    return await get_ohlc_data(TradingPair.XAU_USD, interval, limit, offset, sort)


async def get_silver_ohlc(
    interval: int = 3600,
    limit: int = 50,
    offset: int = 0,
    sort: Literal["asc", "desc"] = "desc",
) -> List[OHLCData]:
    return await get_ohlc_data(TradingPair.XAG_USD, interval, limit, offset, sort)


async def get_platinum_ohlc(
    interval: int = 3600,
    limit: int = 50,
    offset: int = 0,
    sort: Literal["asc", "desc"] = "desc",
) -> List[OHLCData]:
    return await get_ohlc_data(TradingPair.XPT_USD, interval, limit, offset, sort)


async def get_sgd_ohlc(
    interval: int = 3600,
    limit: int = 50,
    offset: int = 0,
    sort: Literal["asc", "desc"] = "desc",
) -> List[OHLCData]:
    return await get_ohlc_data(TradingPair.USD_SGD, interval, limit, offset, sort)


async def get_myr_ohlc(
    interval: int = 3600,
    limit: int = 50,
    offset: int = 0,
    sort: Literal["asc", "desc"] = "desc",
) -> List[OHLCData]:
    return await get_ohlc_data(TradingPair.USD_MYR, interval, limit, offset, sort)
