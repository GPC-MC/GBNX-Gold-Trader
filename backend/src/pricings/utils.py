from typing import List
from datetime import datetime, timedelta
from .models import OHLCData, TickData


def filter_ohlc_by_date_range(
    data: List[OHLCData],
    start_date: datetime,
    end_date: datetime,
) -> List[OHLCData]:
    return [
        item for item in data
        if start_date <= item.timestamp <= end_date
    ]


def get_latest_ohlc(data: List[OHLCData]) -> OHLCData:
    if not data:
        raise ValueError("No OHLC data available")
    return max(data, key=lambda x: x.timestamp)


def get_price_change(data: List[OHLCData]) -> float:
    if len(data) < 2:
        return 0.0
    sorted_data = sorted(data, key=lambda x: x.timestamp)
    return sorted_data[-1].close - sorted_data[0].close


def get_price_change_percentage(data: List[OHLCData]) -> float:
    if len(data) < 2:
        return 0.0
    sorted_data = sorted(data, key=lambda x: x.timestamp)
    initial_price = sorted_data[0].close
    final_price = sorted_data[-1].close
    return ((final_price - initial_price) / initial_price) * 100


def calculate_average_price(data: List[OHLCData]) -> float:
    if not data:
        return 0.0
    return sum(item.close for item in data) / len(data)


def get_highest_price(data: List[OHLCData]) -> float:
    if not data:
        return 0.0
    return max(item.high for item in data)


def get_lowest_price(data: List[OHLCData]) -> float:
    if not data:
        return 0.0
    return min(item.low for item in data)


def calculate_volatility(data: List[OHLCData]) -> float:
    if len(data) < 2:
        return 0.0

    prices = [item.close for item in data]
    mean_price = sum(prices) / len(prices)
    variance = sum((price - mean_price) ** 2 for price in prices) / len(prices)
    return variance ** 0.5


def calculate_tick_spread_percentage(tick: TickData) -> float:
    if tick.ask == 0:
        return 0.0
    return ((tick.ask - tick.bid) / tick.ask) * 100


def get_mid_price(tick: TickData) -> float:
    return (tick.bid + tick.ask) / 2


def resample_ohlc(
    data: List[OHLCData],
    target_interval_minutes: int,
) -> List[OHLCData]:
    if not data:
        return []

    sorted_data = sorted(data, key=lambda x: x.timestamp)
    resampled = []
    current_bucket = []
    bucket_start = sorted_data[0].timestamp

    for item in sorted_data:
        if (item.timestamp - bucket_start).total_seconds() / 60 >= target_interval_minutes:
            if current_bucket:
                resampled.append(_aggregate_ohlc_bucket(current_bucket))
            current_bucket = [item]
            bucket_start = item.timestamp
        else:
            current_bucket.append(item)

    if current_bucket:
        resampled.append(_aggregate_ohlc_bucket(current_bucket))

    return resampled


def _aggregate_ohlc_bucket(bucket: List[OHLCData]) -> OHLCData:
    return OHLCData(
        timestamp=bucket[0].timestamp,
        open=bucket[0].open,
        high=max(item.high for item in bucket),
        low=min(item.low for item in bucket),
        close=bucket[-1].close,
        volume=sum(item.volume for item in bucket if item.volume) if any(item.volume for item in bucket) else None,
        trading_pair=bucket[0].trading_pair,
    )
