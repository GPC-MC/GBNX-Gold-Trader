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
        response_data = response.json()

        # Handle both direct array and wrapped response formats
        if isinstance(response_data, dict):
            # Check if data is wrapped in a "data" key
            data = response_data.get("data", response_data.get("results", []))
        elif isinstance(response_data, list):
            data = response_data
        else:
            raise ValueError(f"Unexpected response format: {type(response_data)}")

        try:
            result = []
            for item in data:
                try:
                    # Handle both capitalized and lowercase field names
                    timestamp = item.get("Date_time") or item.get("timestamp") or item.get("Timestamp")
                    open_price = item.get("Open") or item.get("open")
                    high_price = item.get("High") or item.get("high")
                    low_price = item.get("Low") or item.get("low")
                    close_price = item.get("Close") or item.get("close")
                    volume = item.get("Volume") or item.get("volume")

                    ohlc = OHLCData(
                        timestamp=timestamp,
                        open=float(open_price),
                        high=float(high_price),
                        low=float(low_price),
                        close=float(close_price),
                        volume=float(volume) if volume is not None else None,
                        trading_pair=trading_pair.value,
                    )
                    result.append(ohlc)
                except Exception as e:
                    print(f"Error parsing OHLC item: {e}")
                    print(f"Item data: {item}")
                    raise

            print(f"Successfully parsed {len(result)} OHLC records")
            return result
        except Exception as e:
            print(f"Error in get_ohlc_data: {e}")
            print(f"Response data type: {type(response_data)}")
            print(f"Response data sample: {data[:2] if isinstance(data, list) and len(data) > 0 else response_data}")
            raise


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
        response_data = response.json()

        # Handle both direct array and wrapped response formats
        if isinstance(response_data, dict):
            data = response_data.get("data", response_data.get("results", []))
        elif isinstance(response_data, list):
            data = response_data
        else:
            raise ValueError(f"Unexpected response format: {type(response_data)}")

        result = []
        for item in data:
            # Handle both capitalized and lowercase field names
            timestamp = item.get("Date_time") or item.get("timestamp") or item.get("Timestamp")
            open_price = item.get("Open") or item.get("open")
            high_price = item.get("High") or item.get("high")
            low_price = item.get("Low") or item.get("low")
            close_price = item.get("Close") or item.get("close")
            volume = item.get("Volume") or item.get("volume")

            ohlc = OHLCData(
                timestamp=timestamp,
                open=float(open_price),
                high=float(high_price),
                low=float(low_price),
                close=float(close_price),
                volume=float(volume) if volume is not None else None,
                trading_pair=trading_pair.value,
            )
            result.append(ohlc)

        return result


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
