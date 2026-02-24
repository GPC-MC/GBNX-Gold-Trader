import asyncio
import json
from pydantic_ai import RunContext
from src.pricings.price_client import get_ohlc_data
from src.pricings.models import TradingPair
from src.pricings.batch_operations import (
    get_all_metals_ohlc,
    get_all_trading_pairs_ohlc,
    get_market_summary,
)
from src.pricings.utils import (
    get_price_change,
    get_price_change_percentage,
    get_highest_price,
    get_lowest_price,
    calculate_volatility,
)

VALID_PAIRS = ", ".join([p.value for p in TradingPair])

INTERVAL_MAP = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
}


async def get_current_price(
    ctx: RunContext[None],
    trading_pair: str,
) -> str:
    """
    Get the latest OHLC price snapshot for a trading pair.

    Args:
        trading_pair: One of xau_usd (Gold), xag_usd (Silver), xpt_usd (Platinum),
                      usd_sgd (USD/SGD), usd_myr (USD/MYR).
    """
    try:
        pair = TradingPair(trading_pair.lower())
    except ValueError:
        return f"Invalid trading pair '{trading_pair}'. Valid options: {VALID_PAIRS}"

    data = await get_ohlc_data(pair, interval=3600, limit=1, sort="desc")
    if not data:
        return f"No price data available for {trading_pair}"

    latest = data[0]
    return (
        f"Current price for {pair.value.upper()}:\n"
        f"  Close:  {latest.close:.4f}\n"
        f"  Open:   {latest.open:.4f}\n"
        f"  High:   {latest.high:.4f}\n"
        f"  Low:    {latest.low:.4f}\n"
        f"  Time:   {latest.timestamp.isoformat()}"
    )


async def get_market_summary_tool(
    ctx: RunContext[None],
    trading_pair: str,
    timeframe: str = "1h",
    limit: int = 24,
) -> str:
    """
    Get a market summary for a trading pair: current price, high/low, change, and volatility.

    Args:
        trading_pair: One of xau_usd, xag_usd, xpt_usd, usd_sgd, usd_myr.
        timeframe: Candle interval — 1m, 5m, 15m, 1h, 4h, 1d (default: 1h).
        limit: Number of candles to analyse (default: 24, i.e. last 24 hours for 1h).
    """
    try:
        pair = TradingPair(trading_pair.lower())
    except ValueError:
        return f"Invalid trading pair '{trading_pair}'. Valid options: {VALID_PAIRS}"

    interval = INTERVAL_MAP.get(timeframe, 3600)
    data = await get_ohlc_data(pair, interval=interval, limit=limit, sort="desc")

    if not data:
        return f"No data available for {trading_pair}"

    summary = get_market_summary(data)
    volatility = calculate_volatility(data)

    return (
        f"Market Summary — {pair.value.upper()} ({timeframe} × {limit} candles):\n"
        f"  Current Price:   {summary['current_price']:.4f}\n"
        f"  Open Price:      {summary['open_price']:.4f}\n"
        f"  High:            {summary['high']:.4f}\n"
        f"  Low:             {summary['low']:.4f}\n"
        f"  Average Price:   {summary['avg_price']:.4f}\n"
        f"  Price Change:    {summary['change']:+.4f}\n"
        f"  Change (%):      {summary['change_percent']:+.2f}%\n"
        f"  Volatility (σ):  {volatility:.4f}"
    )


async def get_price_history(
    ctx: RunContext[None],
    trading_pair: str,
    timeframe: str = "1h",
    limit: int = 10,
) -> str:
    """
    Retrieve recent OHLC candlestick history for a trading pair.

    Args:
        trading_pair: One of xau_usd, xag_usd, xpt_usd, usd_sgd, usd_myr.
        timeframe: Candle interval — 1m, 5m, 15m, 1h, 4h, 1d (default: 1h).
        limit: Number of candles to return (default: 10).
    """
    try:
        pair = TradingPair(trading_pair.lower())
    except ValueError:
        return f"Invalid trading pair '{trading_pair}'. Valid options: {VALID_PAIRS}"

    interval = INTERVAL_MAP.get(timeframe, 3600)
    data = await get_ohlc_data(pair, interval=interval, limit=limit, sort="desc")

    if not data:
        return f"No historical data available for {trading_pair}"

    sorted_data = sorted(data, key=lambda x: x.timestamp, reverse=True)
    header = f"{'Timestamp':<22} {'Open':>10} {'High':>10} {'Low':>10} {'Close':>10}"
    divider = "-" * 67
    rows = [
        f"{item.timestamp.strftime('%Y-%m-%d %H:%M'):<22}"
        f"{item.open:>10.4f}{item.high:>10.4f}{item.low:>10.4f}{item.close:>10.4f}"
        for item in sorted_data
    ]
    return "\n".join(
        [f"OHLC History — {pair.value.upper()} ({timeframe}):", header, divider] + rows
    )


async def analyze_price_trend(
    ctx: RunContext[None],
    trading_pair: str,
    timeframe: str = "1h",
    limit: int = 50,
) -> str:
    """
    Perform a technical trend analysis: SMAs, momentum direction, volatility,
    and support/resistance (period high/low) for a trading pair.

    Args:
        trading_pair: One of xau_usd, xag_usd, xpt_usd, usd_sgd, usd_myr.
        timeframe: Candle interval — 1m, 5m, 15m, 1h, 4h, 1d (default: 1h).
        limit: Number of candles to analyse (default: 50).
    """
    try:
        pair = TradingPair(trading_pair.lower())
    except ValueError:
        return f"Invalid trading pair '{trading_pair}'. Valid options: {VALID_PAIRS}"

    interval = INTERVAL_MAP.get(timeframe, 3600)
    data = await get_ohlc_data(pair, interval=interval, limit=limit, sort="asc")

    if len(data) < 2:
        return f"Not enough data for trend analysis on {trading_pair}"

    closes = [d.close for d in data]
    current = closes[-1]

    sma_10 = sum(closes[-10:]) / min(10, len(closes))
    sma_20 = sum(closes[-20:]) / min(20, len(closes))
    sma_50 = sum(closes) / len(closes)

    momentum = "Bullish" if current > sma_20 else "Bearish"
    trend_direction = "Up" if closes[-1] > closes[-2] else "Down"

    change = get_price_change(data)
    change_pct = get_price_change_percentage(data)
    volatility = calculate_volatility(data)
    highest = get_highest_price(data)
    lowest = get_lowest_price(data)

    def _rel(val: float) -> str:
        return "above" if current > val else "below"

    return (
        f"Trend Analysis — {pair.value.upper()} ({timeframe} × {limit} candles):\n"
        f"\n[Price Levels]\n"
        f"  Current Price:  {current:.4f}\n"
        f"  Period High:    {highest:.4f}  (resistance)\n"
        f"  Period Low:     {lowest:.4f}  (support)\n"
        f"\n[Moving Averages]\n"
        f"  SMA-10:  {sma_10:.4f}  (price {_rel(sma_10)} SMA-10)\n"
        f"  SMA-20:  {sma_20:.4f}  (price {_rel(sma_20)} SMA-20)\n"
        f"  SMA-50:  {sma_50:.4f}  (price {_rel(sma_50)} SMA-50)\n"
        f"\n[Trend & Momentum]\n"
        f"  Direction:   {trend_direction}\n"
        f"  Momentum:    {momentum}\n"
        f"  Net Change:  {change:+.4f}  ({change_pct:+.2f}%)\n"
        f"  Volatility:  {volatility:.4f}"
    )


async def get_all_metals_overview(
    ctx: RunContext[None],
    timeframe: str = "1h",
    limit: int = 24,
) -> str:
    """
    Get a combined market overview for all precious metals:
    Gold (XAU/USD), Silver (XAG/USD), and Platinum (XPT/USD).

    Args:
        timeframe: Candle interval — 1m, 5m, 15m, 1h, 4h, 1d (default: 1h).
        limit: Number of candles to analyse (default: 24).
    """
    interval = INTERVAL_MAP.get(timeframe, 3600)
    metals_data = await get_all_metals_ohlc(interval=interval, limit=limit)

    labels = {
        "gold": "Gold (XAU/USD)",
        "silver": "Silver (XAG/USD)",
        "platinum": "Platinum (XPT/USD)",
    }

    lines = [f"Precious Metals Overview ({timeframe} × {limit} candles):\n"]
    for key, label in labels.items():
        data = metals_data.get(key, [])
        if not data:
            lines.append(f"  {label}: No data available\n")
            continue
        s = get_market_summary(data)
        lines.append(
            f"  {label}:\n"
            f"    Price:  {s['current_price']:.4f}\n"
            f"    Change: {s['change']:+.4f}  ({s['change_percent']:+.2f}%)\n"
            f"    High:   {s['high']:.4f}  |  Low: {s['low']:.4f}\n"
        )

    return "\n".join(lines)


async def compare_trading_pairs_tool(
    ctx: RunContext[None],
    trading_pairs: str,
    timeframe: str = "1h",
    limit: int = 24,
) -> str:
    """
    Compare multiple trading pairs side by side in a single table.

    Args:
        trading_pairs: Comma-separated pair values, e.g. "xau_usd,xag_usd,xpt_usd".
        timeframe: Candle interval — 1m, 5m, 15m, 1h, 4h, 1d (default: 1h).
        limit: Number of candles to analyse per pair (default: 24).
    """
    pair_names = [p.strip().lower() for p in trading_pairs.split(",")]
    pairs = []
    for name in pair_names:
        try:
            pairs.append(TradingPair(name))
        except ValueError:
            return f"Invalid trading pair '{name}'. Valid options: {VALID_PAIRS}"

    interval = INTERVAL_MAP.get(timeframe, 3600)
    results = await asyncio.gather(
        *[get_ohlc_data(pair, interval=interval, limit=limit, sort="desc") for pair in pairs],
        return_exceptions=True,
    )

    header = f"{'Pair':<15} {'Price':>10} {'Change':>10} {'Change%':>10} {'High':>10} {'Low':>10}"
    divider = "-" * 70
    rows = []
    for pair, result in zip(pairs, results):
        if isinstance(result, Exception) or not result:
            rows.append(f"{pair.value:<15} No data available")
            continue
        s = get_market_summary(result)
        rows.append(
            f"{pair.value:<15}"
            f"{s['current_price']:>10.4f}"
            f"{s['change']:>+10.4f}"
            f"{s['change_percent']:>+9.2f}%"
            f"{s['high']:>10.4f}"
            f"{s['low']:>10.4f}"
        )

    return "\n".join(
        [f"Pair Comparison ({timeframe} × {limit} candles):", header, divider] + rows
    )


async def get_full_market_snapshot(
    ctx: RunContext[None],
    timeframe: str = "1h",
    limit: int = 24,
) -> str:
    """
    Fetch a complete snapshot of all trading pairs (metals + FX) in one call.
    Useful as a daily briefing or market open overview.

    Args:
        timeframe: Candle interval — 1m, 5m, 15m, 1h, 4h, 1d (default: 1h).
        limit: Number of candles to analyse per pair (default: 24).
    """
    interval = INTERVAL_MAP.get(timeframe, 3600)
    all_data = await get_all_trading_pairs_ohlc(interval=interval, limit=limit)

    LABELS = {
        "xau_usd": "Gold      (XAU/USD)",
        "xag_usd": "Silver    (XAG/USD)",
        "xpt_usd": "Platinum  (XPT/USD)",
        "usd_sgd": "Singapore (USD/SGD)",
        "usd_myr": "Malaysia  (USD/MYR)",
    }

    header = f"{'Instrument':<22} {'Price':>10} {'Change':>10} {'Chg%':>8} {'High':>10} {'Low':>10}"
    divider = "-" * 75
    rows = []
    for key, label in LABELS.items():
        data = all_data.get(key, [])
        if not data:
            rows.append(f"{label:<22}  No data")
            continue
        s = get_market_summary(data)
        rows.append(
            f"{label:<22}"
            f"{s['current_price']:>10.4f}"
            f"{s['change']:>+10.4f}"
            f"{s['change_percent']:>+7.2f}%"
            f"{s['high']:>10.4f}"
            f"{s['low']:>10.4f}"
        )

    return "\n".join(
        [f"Full Market Snapshot ({timeframe} × {limit} candles):", header, divider] + rows
    )


def get_pricing_tools():
    return [
        get_current_price,
        get_market_summary_tool,
        get_price_history,
        analyze_price_trend,
        get_all_metals_overview,
        compare_trading_pairs_tool,
        get_full_market_snapshot,
    ]
