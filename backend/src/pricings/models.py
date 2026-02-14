from enum import Enum
from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class TradingPair(str, Enum):
    XAU_USD = "xau_usd"
    XAG_USD = "xag_usd"
    XPT_USD = "xpt_usd"
    USD_SGD = "usd_sgd"
    USD_MYR = "usd_myr"


class WebSocketSymbol(str, Enum):
    XAU_USD = "ticks:XAU/USD"
    XAG_USD = "ticks:XAG/USD"
    XPT_USD = "ticks:XPT/USD"
    USD_SGD = "ticks:USD/SGD"
    USD_MYR = "ticks:USD/MYR"


class OHLCData(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: Optional[float] = None
    trading_pair: str


class TickData(BaseModel):
    symbol: str
    bid: float
    ask: float
    timestamp: datetime
    spread: Optional[float] = None
