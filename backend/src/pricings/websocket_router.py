from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio
from .stream_manager import PriceStreamManager
from .models import WebSocketSymbol, TickData

router = APIRouter(prefix="/api/pricing/ws", tags=["Pricing WebSocket"])

stream_manager = PriceStreamManager()
active_connections: Dict[str, Set[WebSocket]] = {}


@router.websocket("/ticks/{symbol}")
async def websocket_price_feed(websocket: WebSocket, symbol: str):
    await websocket.accept()

    try:
        ws_symbol = WebSocketSymbol(f"ticks:{symbol}")
    except ValueError:
        await websocket.send_json({"error": f"Invalid symbol: {symbol}"})
        await websocket.close()
        return

    symbol_key = ws_symbol.value

    if symbol_key not in active_connections:
        active_connections[symbol_key] = set()
    active_connections[symbol_key].add(websocket)

    async def send_tick_to_client(tick: TickData):
        try:
            await websocket.send_json(tick.model_dump(mode='json'))
        except Exception:
            pass

    try:
        await stream_manager.subscribe(ws_symbol, send_tick_to_client)

        while True:
            await asyncio.sleep(1)
            try:
                await websocket.receive_text()
            except WebSocketDisconnect:
                break

    except WebSocketDisconnect:
        pass
    finally:
        if symbol_key in active_connections:
            active_connections[symbol_key].discard(websocket)
            if not active_connections[symbol_key]:
                del active_connections[symbol_key]

        await stream_manager.unsubscribe(ws_symbol, send_tick_to_client)


@router.websocket("/multi")
async def websocket_multi_price_feed(websocket: WebSocket):
    await websocket.accept()

    subscribed_symbols = set()
    callbacks = {}

    async def handle_subscription(symbol: str):
        try:
            ws_symbol = WebSocketSymbol(f"ticks:{symbol}")
        except ValueError:
            await websocket.send_json({"error": f"Invalid symbol: {symbol}"})
            return

        async def send_tick(tick: TickData):
            try:
                await websocket.send_json(tick.model_dump(mode='json'))
            except Exception:
                pass

        callbacks[symbol] = send_tick
        subscribed_symbols.add(symbol)
        await stream_manager.subscribe(ws_symbol, send_tick)

    async def handle_unsubscription(symbol: str):
        if symbol in subscribed_symbols:
            try:
                ws_symbol = WebSocketSymbol(f"ticks:{symbol}")
                await stream_manager.unsubscribe(ws_symbol, callbacks[symbol])
            except Exception:
                pass

            subscribed_symbols.discard(symbol)
            if symbol in callbacks:
                del callbacks[symbol]

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
                await handle_subscription(symbol)
                await websocket.send_json({"status": "subscribed", "symbol": symbol})
            elif action == "unsubscribe":
                await handle_unsubscription(symbol)
                await websocket.send_json({"status": "unsubscribed", "symbol": symbol})
            else:
                await websocket.send_json({"error": f"Unknown action: {action}"})

    except WebSocketDisconnect:
        pass
    finally:
        for symbol in list(subscribed_symbols):
            await handle_unsubscription(symbol)


@router.get("/active-streams")
async def get_active_streams():
    return {
        "active_streams": stream_manager.get_active_streams(),
        "connection_count": sum(len(conns) for conns in active_connections.values()),
    }
