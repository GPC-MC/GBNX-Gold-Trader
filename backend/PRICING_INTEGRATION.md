# Pricing Module Integration

## Overview
The pricing module has been successfully integrated into the backend application, providing REST API and WebSocket endpoints for real-time and historical price data.

## Structure

```
src/
├── pricings/                      # Pricing module
│   ├── __init__.py               # Package exports
│   ├── models.py                 # Data models (OHLCData, TickData, etc.)
│   ├── price_client.py           # HTTP client for OHLC data
│   ├── websocket_client.py       # WebSocket client for live prices
│   ├── router.py                 # REST API endpoints
│   ├── websocket_router.py       # WebSocket endpoints
│   ├── stream_manager.py         # WebSocket stream management
│   ├── utils.py                  # Utility functions
│   ├── batch_operations.py       # Batch data operations
│   └── cache.py                  # Caching layer
│
└── routers/
    ├── pricing.py                # Pricing router (integrates pricings module)
    └── transactions.py           # Transactions router

```

## Available Endpoints

### REST API Endpoints (Base: `/api/pricing`)

#### Get OHLC Data by Trading Pair
```
GET /api/pricing/ohlc/{trading_pair}
Query params: interval, limit, offset, sort
Trading pairs: xau_usd, xag_usd, xpt_usd, usd_sgd, usd_myr
```

#### Get Gold Prices
```
GET /api/pricing/ohlc/gold
Query params: interval, limit, offset, sort
```

#### Get Silver Prices
```
GET /api/pricing/ohlc/silver
Query params: interval, limit, offset, sort
```

#### Get Platinum Prices
```
GET /api/pricing/ohlc/platinum
Query params: interval, limit, offset, sort
```

#### Get SGD Prices
```
GET /api/pricing/ohlc/sgd
Query params: interval, limit, offset, sort
```

#### Get MYR Prices
```
GET /api/pricing/ohlc/myr
Query params: interval, limit, offset, sort
```

### WebSocket Endpoints

#### Single Price Feed
```
WS /api/pricing/ws/ticks/{symbol}
Symbols: XAU/USD, XAG/USD, XPT/USD, USD/SGD, USD/MYR
```

Example:
```javascript
const ws = new WebSocket('ws://localhost:8081/api/pricing/ws/ticks/XAU/USD');
ws.onmessage = (event) => {
  const tick = JSON.parse(event.data);
  console.log(tick); // { symbol, bid, ask, timestamp, spread }
};
```

#### Multi Price Feed
```
WS /api/pricing/ws/multi
```

Example:
```javascript
const ws = new WebSocket('ws://localhost:8081/api/pricing/ws/multi');

// Subscribe to multiple symbols
ws.send(JSON.stringify({ action: 'subscribe', symbol: 'XAU/USD' }));
ws.send(JSON.stringify({ action: 'subscribe', symbol: 'XAG/USD' }));

// Receive all ticks
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};

// Unsubscribe
ws.send(JSON.stringify({ action: 'unsubscribe', symbol: 'XAU/USD' }));
```

#### Active Streams Status
```
GET /api/pricing/ws/active-streams
```

Returns active WebSocket streams and connection count.

## Data Models

### OHLCData
```python
{
  "timestamp": "2024-01-01T00:00:00",
  "open": 2050.5,
  "high": 2055.0,
  "low": 2048.0,
  "close": 2052.0,
  "volume": 1000.0,  # Optional
  "trading_pair": "xau_usd"
}
```

### TickData
```python
{
  "symbol": "ticks:XAU/USD",
  "bid": 2050.25,
  "ask": 2050.75,
  "timestamp": "2024-01-01T00:00:00",
  "spread": 0.50  # Optional
}
```

## Usage Examples

### Python Client
```python
import httpx

# Get gold OHLC data
async with httpx.AsyncClient() as client:
    response = await client.get(
        "http://localhost:8081/api/pricing/ohlc/gold",
        params={"interval": 3600, "limit": 50}
    )
    data = response.json()
```

### Using the Module Directly
```python
from src.pricings import (
    get_gold_ohlc,
    get_silver_ohlc,
    PriceWebSocketClient,
    WebSocketSymbol,
)

# Get OHLC data
gold_data = await get_gold_ohlc(interval=3600, limit=50)

# WebSocket client
client = PriceWebSocketClient(WebSocketSymbol.XAU_USD)
await client.connect()

async def handle_tick(tick):
    print(f"Gold: {tick.bid}/{tick.ask}")

await client.listen(handle_tick)
```

### Utility Functions
```python
from src.pricings import (
    get_price_change,
    get_price_change_percentage,
    calculate_average_price,
    get_highest_price,
    get_lowest_price,
    calculate_volatility,
)

# Analyze price data
price_change = get_price_change(gold_data)
price_change_pct = get_price_change_percentage(gold_data)
avg_price = calculate_average_price(gold_data)
volatility = calculate_volatility(gold_data)
```

### Batch Operations
```python
from src.pricings.batch_operations import (
    get_all_metals_ohlc,
    get_all_currencies_ohlc,
    get_market_summary,
)

# Get all metals at once
metals = await get_all_metals_ohlc(interval=3600, limit=50)
# Returns: {"gold": [...], "silver": [...], "platinum": [...]}

# Get market summary
summary = get_market_summary(gold_data)
# Returns: {
#   "current_price": 2052.0,
#   "open_price": 2050.5,
#   "high": 2055.0,
#   "low": 2048.0,
#   "change": 1.5,
#   "change_percent": 0.073,
#   "avg_price": 2051.5
# }
```

### Caching
```python
from src.pricings.cache import get_cached_ohlc_data, OHLCCache

# Use default cache (60s TTL)
cached_data = await get_cached_ohlc_data(
    TradingPair.XAU_USD,
    interval=3600,
    limit=50
)

# Custom cache
custom_cache = OHLCCache(ttl_seconds=300)  # 5 minutes
data = await custom_cache.get_or_fetch(TradingPair.XAU_USD)
```

## External API Sources

### OHLC Data
```
Base: https://gpcintegral.southeastasia.cloudapp.azure.com/livechart/data/
Parameters:
- trading_pairs: xau_usd, xag_usd, xpt_usd, usd_sgd, usd_myr
- interval: Time interval in seconds (e.g., 3600 for 1 hour)
- limit: Number of data points
- offset: Pagination offset
- sort: asc or desc
```

### WebSocket Feeds
```
Base: wss://gpcintegral.southeastasia.cloudapp.azure.com/ws/ticks/
Symbols:
- ticks:XAU/USD (Gold)
- ticks:XAG/USD (Silver)
- ticks:XPT/USD (Platinum)
- ticks:USD/SGD (Singapore Dollar)
- ticks:USD/MYR (Malaysian Ringgit)
```

## Testing

Start the server:
```bash
cd backend
uv run python -m uvicorn src.main:app --host 0.0.0.0 --port 8081 --reload
```

Test REST endpoint:
```bash
curl http://localhost:8081/api/pricing/ohlc/gold?limit=10
```

Test WebSocket (using websocat):
```bash
websocat ws://localhost:8081/api/pricing/ws/ticks/XAU/USD
```

## Notes

- All endpoints use async/await for non-blocking I/O
- WebSocket connections are managed with automatic cleanup
- Caching is optional but recommended for production
- CPU-only PyTorch is used for dependencies (no GPU required)
