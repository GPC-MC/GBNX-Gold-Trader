import asyncio
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from .price_client import get_ohlc_data
from .models import OHLCData, TradingPair


class OHLCCache:
    def __init__(self, ttl_seconds: int = 60):
        self.cache: Dict[Tuple[str, int], Tuple[datetime, List[OHLCData]]] = {}
        self.ttl = timedelta(seconds=ttl_seconds)
        self.lock = asyncio.Lock()

    def _is_expired(self, timestamp: datetime) -> bool:
        return datetime.now() - timestamp > self.ttl

    def _get_cache_key(
        self,
        trading_pair: TradingPair,
        interval: int,
        limit: int,
        offset: int,
        sort: str,
    ) -> Tuple[str, int, int, int, str]:
        return (trading_pair.value, interval, limit, offset, sort)

    async def get(
        self,
        trading_pair: TradingPair,
        interval: int = 3600,
        limit: int = 50,
        offset: int = 0,
        sort: str = "desc",
    ) -> Optional[List[OHLCData]]:
        key = self._get_cache_key(trading_pair, interval, limit, offset, sort)

        async with self.lock:
            if key in self.cache:
                timestamp, data = self.cache[key]
                if not self._is_expired(timestamp):
                    return data
                else:
                    del self.cache[key]

        return None

    async def set(
        self,
        trading_pair: TradingPair,
        data: List[OHLCData],
        interval: int = 3600,
        limit: int = 50,
        offset: int = 0,
        sort: str = "desc",
    ):
        key = self._get_cache_key(trading_pair, interval, limit, offset, sort)

        async with self.lock:
            self.cache[key] = (datetime.now(), data)

    async def get_or_fetch(
        self,
        trading_pair: TradingPair,
        interval: int = 3600,
        limit: int = 50,
        offset: int = 0,
        sort: str = "desc",
    ) -> List[OHLCData]:
        cached_data = await self.get(trading_pair, interval, limit, offset, sort)

        if cached_data is not None:
            return cached_data

        fresh_data = await get_ohlc_data(trading_pair, interval, limit, offset, sort)
        await self.set(trading_pair, fresh_data, interval, limit, offset, sort)

        return fresh_data

    async def clear(self):
        async with self.lock:
            self.cache.clear()

    async def clear_expired(self):
        async with self.lock:
            expired_keys = [
                key for key, (timestamp, _) in self.cache.items()
                if self._is_expired(timestamp)
            ]
            for key in expired_keys:
                del self.cache[key]

    def get_cache_stats(self) -> Dict[str, int]:
        return {
            "total_entries": len(self.cache),
            "expired_entries": sum(
                1 for timestamp, _ in self.cache.values()
                if self._is_expired(timestamp)
            ),
        }


default_cache = OHLCCache(ttl_seconds=60)


async def get_cached_ohlc_data(
    trading_pair: TradingPair,
    interval: int = 3600,
    limit: int = 50,
    offset: int = 0,
    sort: str = "desc",
    cache: Optional[OHLCCache] = None,
) -> List[OHLCData]:
    cache_instance = cache or default_cache
    return await cache_instance.get_or_fetch(trading_pair, interval, limit, offset, sort)
