import asyncio
from typing import Dict, Set, Callable, Awaitable
from .websocket_client import PriceWebSocketClient
from .models import TickData, WebSocketSymbol


class PriceStreamManager:
    def __init__(self):
        self.clients: Dict[str, PriceWebSocketClient] = {}
        self.subscribers: Dict[str, Set[Callable[[TickData], Awaitable[None]]]] = {}
        self.tasks: Dict[str, asyncio.Task] = {}

    async def subscribe(
        self,
        symbol: WebSocketSymbol | str,
        callback: Callable[[TickData], Awaitable[None]],
    ):
        symbol_str = symbol.value if isinstance(symbol, WebSocketSymbol) else symbol

        if symbol_str not in self.subscribers:
            self.subscribers[symbol_str] = set()

        self.subscribers[symbol_str].add(callback)

        if symbol_str not in self.clients:
            await self._start_stream(symbol)

    async def unsubscribe(
        self,
        symbol: WebSocketSymbol | str,
        callback: Callable[[TickData], Awaitable[None]],
    ):
        symbol_str = symbol.value if isinstance(symbol, WebSocketSymbol) else symbol

        if symbol_str in self.subscribers:
            self.subscribers[symbol_str].discard(callback)

            if not self.subscribers[symbol_str]:
                await self._stop_stream(symbol_str)

    async def _start_stream(self, symbol: WebSocketSymbol | str):
        symbol_str = symbol.value if isinstance(symbol, WebSocketSymbol) else symbol

        client = PriceWebSocketClient(symbol)
        await client.connect()
        self.clients[symbol_str] = client

        async def broadcast_tick(tick: TickData):
            if symbol_str in self.subscribers:
                await asyncio.gather(
                    *[callback(tick) for callback in self.subscribers[symbol_str]],
                    return_exceptions=True,
                )

        async def listen_with_reconnect():
            """Listen with automatic reconnection on failure"""
            max_retries = 5
            retry_count = 0
            retry_delay = 1

            while retry_count < max_retries:
                try:
                    await client.listen(broadcast_tick)
                    break  # Successful completion, exit loop
                except Exception as e:
                    retry_count += 1
                    print(f"WebSocket error for {symbol_str}, attempt {retry_count}/{max_retries}: {e}")

                    if retry_count < max_retries:
                        print(f"Reconnecting in {retry_delay} seconds...")
                        await asyncio.sleep(retry_delay)
                        retry_delay = min(retry_delay * 2, 30)  # Exponential backoff, max 30s

                        try:
                            await client.disconnect()
                            await client.connect()
                            print(f"Reconnected to {symbol_str}")
                        except Exception as reconnect_error:
                            print(f"Reconnection failed: {reconnect_error}")
                    else:
                        print(f"Max retries reached for {symbol_str}, giving up")
                        break

        task = asyncio.create_task(listen_with_reconnect())
        self.tasks[symbol_str] = task

    async def _stop_stream(self, symbol_str: str):
        if symbol_str in self.tasks:
            self.tasks[symbol_str].cancel()
            del self.tasks[symbol_str]

        if symbol_str in self.clients:
            await self.clients[symbol_str].disconnect()
            del self.clients[symbol_str]

        if symbol_str in self.subscribers:
            del self.subscribers[symbol_str]

    async def stop_all(self):
        for symbol in list(self.clients.keys()):
            await self._stop_stream(symbol)

    def get_active_streams(self) -> list[str]:
        return list(self.clients.keys())
