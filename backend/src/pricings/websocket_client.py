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
        print(f"Connecting to external WebSocket: {self.url}")
        # Increase max_size to 10MB to handle large messages from external source
        # Set max_queue to handle bursts of messages
        # Enable compression to reduce bandwidth
        self.websocket = await websockets.connect(
            self.url,
            max_size=10 * 1024 * 1024,  # 10MB max message size
            max_queue=32,  # Increase queue size
            ping_interval=20,  # Send ping every 20 seconds
            ping_timeout=10,  # Wait 10 seconds for pong
            compression="deflate",  # Enable compression
        )
        self.running = True
        print(f"Successfully connected to {self.url} with compression enabled")

    async def disconnect(self):
        self.running = False
        if self.websocket:
            print(f"Disconnecting from {self.url}")
            await self.websocket.close()
            self.websocket = None

    async def receive_tick(self) -> TickData:
        if not self.websocket:
            raise RuntimeError("WebSocket not connected")

        message = await self.websocket.recv()

        # Handle large messages by truncating log output
        message_size = len(message)
        if message_size > 1000:
            print(f"Received large message ({message_size} bytes) from {self.symbol.value}")
            print(f"First 200 chars: {message[:200]}")
        else:
            print(f"Received tick from {self.symbol.value}: {message}")

        try:
            data = json.loads(message)
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {e}")
            print(f"Message: {message[:500]}")
            raise

        # Validate required fields
        if "bid" not in data or "ask" not in data:
            print(f"Missing required fields in message: {data.keys()}")
            raise ValueError(f"Message missing bid or ask fields")

        # Extract only the necessary fields to keep response size manageable
        try:
            return TickData(
                symbol=data.get("symbol", self.symbol.value),
                bid=float(data["bid"]),
                ask=float(data["ask"]),
                timestamp=datetime.fromisoformat(data["timestamp"]) if "timestamp" in data else datetime.now(),
                spread=float(data["spread"]) if data.get("spread") is not None else None,
            )
        except (ValueError, KeyError, TypeError) as e:
            print(f"Failed to create TickData from message: {e}")
            print(f"Data: {data}")
            raise

    async def listen(self, callback: Callable[[TickData], Awaitable[None]]):
        if not self.websocket:
            await self.connect()

        try:
            print(f"Starting to listen for ticks on {self.symbol.value}")
            while self.running:
                tick = await self.receive_tick()
                await callback(tick)
        except websockets.exceptions.ConnectionClosed as e:
            print(f"WebSocket connection closed for {self.symbol.value}: {e}")
            self.running = False
        except Exception as e:
            print(f"Error in WebSocket listen for {self.symbol.value}: {e}")
            import traceback
            traceback.print_exc()
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
