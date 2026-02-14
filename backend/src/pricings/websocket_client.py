import asyncio
import json
from typing import Callable, Optional, Awaitable
from datetime import datetime
import websockets
from websockets.client import WebSocketClientProtocol
from .models import TickData, WebSocketSymbol


BASE_WS_URL = "wss://gpcintegral.southeastasia.cloudapp.azure.com"


class PriceWebSocketClient:
    def __init__(self, symbol: WebSocketSymbol | str):
        if isinstance(symbol, str):
            self.symbol = WebSocketSymbol(symbol)
        else:
            self.symbol = symbol

        self.url = f"{BASE_WS_URL}/ws/ticks/?symbol={self.symbol.value}"
        self.websocket: Optional[WebSocketClientProtocol] = None
        self.running = False

    async def connect(self):
        self.websocket = await websockets.connect(self.url)
        self.running = True

    async def disconnect(self):
        self.running = False
        if self.websocket:
            await self.websocket.close()
            self.websocket = None

    async def receive_tick(self) -> TickData:
        if not self.websocket:
            raise RuntimeError("WebSocket not connected")

        message = await self.websocket.recv()
        data = json.loads(message)

        return TickData(
            symbol=data.get("symbol", self.symbol.value),
            bid=data["bid"],
            ask=data["ask"],
            timestamp=datetime.fromisoformat(data["timestamp"]) if "timestamp" in data else datetime.now(),
            spread=data.get("spread"),
        )

    async def listen(self, callback: Callable[[TickData], Awaitable[None]]):
        if not self.websocket:
            await self.connect()

        try:
            while self.running:
                tick = await self.receive_tick()
                await callback(tick)
        except websockets.exceptions.ConnectionClosed:
            self.running = False
        except Exception as e:
            self.running = False
            raise e

    async def listen_sync_callback(self, callback: Callable[[TickData], None]):
        async def async_wrapper(tick: TickData):
            callback(tick)

        await self.listen(async_wrapper)


async def connect_to_price_feed(
    symbol: WebSocketSymbol | str,
    callback: Callable[[TickData], Awaitable[None]],
):
    client = PriceWebSocketClient(symbol)
    await client.connect()

    try:
        await client.listen(callback)
    finally:
        await client.disconnect()


async def connect_to_gold_feed(callback: Callable[[TickData], Awaitable[None]]):
    return await connect_to_price_feed(WebSocketSymbol.XAU_USD, callback)


async def connect_to_silver_feed(callback: Callable[[TickData], Awaitable[None]]):
    return await connect_to_price_feed(WebSocketSymbol.XAG_USD, callback)


async def connect_to_platinum_feed(callback: Callable[[TickData], Awaitable[None]]):
    return await connect_to_price_feed(WebSocketSymbol.XPT_USD, callback)


async def connect_to_sgd_feed(callback: Callable[[TickData], Awaitable[None]]):
    return await connect_to_price_feed(WebSocketSymbol.USD_SGD, callback)


async def connect_to_myr_feed(callback: Callable[[TickData], Awaitable[None]]):
    return await connect_to_price_feed(WebSocketSymbol.USD_MYR, callback)


class MultiPriceWebSocketClient:
    def __init__(self, symbols: list[WebSocketSymbol | str]):
        self.clients = [PriceWebSocketClient(symbol) for symbol in symbols]
        self.running = False

    async def connect_all(self):
        await asyncio.gather(*[client.connect() for client in self.clients])
        self.running = True

    async def disconnect_all(self):
        self.running = False
        await asyncio.gather(*[client.disconnect() for client in self.clients])

    async def listen_all(self, callback: Callable[[TickData], Awaitable[None]]):
        if not all(client.websocket for client in self.clients):
            await self.connect_all()

        tasks = [client.listen(callback) for client in self.clients]
        await asyncio.gather(*tasks, return_exceptions=True)
