from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from src.db import get_db

router = APIRouter(prefix="/transactions", tags=["transactions"])


class BuyGoldRequest(BaseModel):
    gold_grams: float
    price_usd_per_oz: float
    value_date: Optional[date] = None
    reference: Optional[str] = None


class BuyGoldResponse(BaseModel):
    transaction_id: str


def _resolve_account(conn, name: str) -> str:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM accounts WHERE name = %s", (name,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(404, detail=f"Account '{name}' not found")
    return str(row[0])


@router.post("/buy", response_model=BuyGoldResponse)
async def mc_buy_gold(req: BuyGoldRequest, conn=Depends(get_db)):
    try:
        buyer_id = _resolve_account(conn, "MC")
        seller_id = _resolve_account(conn, "House")

        with conn.cursor() as cur:
            cur.execute(
                "SELECT create_gold_trade(%s, %s, %s, %s, %s, %s, NULL)",
                (
                    buyer_id,
                    seller_id,
                    req.gold_grams,
                    req.price_usd_per_oz,
                    req.value_date or date.today(),
                    req.reference,
                ),
            )
            txn_id = cur.fetchone()[0]

        return BuyGoldResponse(transaction_id=str(txn_id))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, detail=str(e))
