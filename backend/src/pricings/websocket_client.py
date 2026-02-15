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

        # Handle wrapped format with 'values' array
        if "values" in data and isinstance(data["values"], list):
            if not data["values"]:
                raise ValueError("Empty values array in message")

            # Get the latest tick (last item in array)
            latest_tick = data["values"][-1]
            print(f"Extracted latest tick from values array: {latest_tick}")

            # Map field names: bid_price -> bid, ask_price -> ask, date_time -> timestamp
            bid = latest_tick.get("bid_price") or latest_tick.get("bid")
            ask = latest_tick.get("ask_price") or latest_tick.get("ask")
            timestamp_str = latest_tick.get("date_time") or latest_tick.get("timestamp")

            if bid is None or ask is None:
                print(f"Missing bid/ask in tick: {latest_tick.keys()}")
                raise ValueError("Missing bid or ask price in tick data")

            # Parse timestamp
            if timestamp_str:
                try:
                    # Handle format: "2024-12-26 08:10:00.110"
                    timestamp = datetime.fromisoformat(timestamp_str.replace(" ", "T"))
                except (ValueError, AttributeError):
                    timestamp = datetime.now()
            else:
                timestamp = datetime.now()

            spread = float(ask) - float(bid)

            return TickData(
                symbol=latest_tick.get("symbol", self.symbol.value),
                bid=float(bid),
                ask=float(ask),
                timestamp=timestamp,
                spread=spread,
            )

        # Handle direct format (legacy)
        elif "bid" in data or "ask" in data or "bid_price" in data or "ask_price" in data:
            bid = data.get("bid_price") or data.get("bid")
            ask = data.get("ask_price") or data.get("ask")

            if bid is None or ask is None:
                print(f"Missing required fields in message: {data.keys()}")
                raise ValueError(f"Message missing bid or ask fields")

            timestamp_str = data.get("date_time") or data.get("timestamp")
            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace(" ", "T"))
                except (ValueError, AttributeError):
                    timestamp = datetime.now()
            else:
                timestamp = datetime.now()

            spread = data.get("spread")
            if spread is None:
                spread = float(ask) - float(bid)

            return TickData(
                symbol=data.get("symbol", self.symbol.value),
                bid=float(bid),
                ask=float(ask),
                timestamp=timestamp,
                spread=float(spread) if spread is not None else None,
            )
        else:
            print(f"Unknown message format. Keys: {data.keys()}")
            raise ValueError(f"Unknown message format: {data.keys()}")

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
