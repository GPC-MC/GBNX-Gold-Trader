from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
from .price_client import get_ohlc_data
from .models import WebSocketSymbol, TickData, TradingPair

router = APIRouter(prefix="/api/pricing/ws", tags=["Pricing WebSocket"])

_SYMBOL_TO_TRADING_PAIR = {
    "XAU/USD": TradingPair.XAU_USD,
    "XAG/USD": TradingPair.XAG_USD,
    "XPT/USD": TradingPair.XPT_USD,
    "USD/SGD": TradingPair.USD_SGD,
    "USD/MYR": TradingPair.USD_MYR,
}


async def _fetch_tick(symbol: str) -> TickData | None:
    trading_pair = _SYMBOL_TO_TRADING_PAIR.get(symbol)
    if not trading_pair:
        return None

    data = await get_ohlc_data(trading_pair, interval=3600, limit=1, sort="desc")
    if not data:
        return None

    latest = data[0]
    return TickData(
        symbol=symbol,
        bid=latest.close,
        ask=latest.close,
        timestamp=latest.timestamp,
        spread=0.0,
    )


@router.websocket("/ticks/{symbol}")
async def websocket_price_feed(websocket: WebSocket, symbol: str):
    await websocket.accept()

    try:
        WebSocketSymbol(f"ticks:{symbol}")
    except ValueError:
        await websocket.send_json({"error": f"Invalid symbol: {symbol}"})
        await websocket.close()
        return

    try:
        tick = await _fetch_tick(symbol)
        if tick:
            await websocket.send_json(tick.model_dump(mode="json"))
        else:
            await websocket.send_json({"error": f"No price data for {symbol}"})
    except Exception as e:
        await websocket.send_json({"error": str(e)})

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass


@router.websocket("/multi")
async def websocket_multi_price_feed(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            action = message.get("action")
            symbol = message.get("symbol")

            if not symbol:
                await websocket.send_json({"error": "Symbol is required"})
                continue

            if action == "subscribe":
                try:
                    tick = await _fetch_tick(symbol)
                    if tick:
                        await websocket.send_json(tick.model_dump(mode="json"))
                    else:
                        await websocket.send_json({"error": f"No price data for {symbol}"})
                except Exception as e:
                    await websocket.send_json({"error": str(e)})
                await websocket.send_json({"status": "subscribed", "symbol": symbol})

            elif action == "unsubscribe":
                await websocket.send_json({"status": "unsubscribed", "symbol": symbol})

            else:
                await websocket.send_json({"error": f"Unknown action: {action}"})

    except WebSocketDisconnect:
        pass


@router.get("/active-streams")
async def get_active_streams():
    return {"active_streams": [], "connection_count": 0}
