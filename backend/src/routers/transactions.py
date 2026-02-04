from collections import defaultdict
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


class AssetBalance(BaseModel):
    asset: str
    balance: float


class AccountBalance(BaseModel):
    account: str
    balances: list[AssetBalance]


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


@router.get("/balances", response_model=list[AccountBalance])
async def get_all_balances(conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT a.name, ast.symbol, SUM(le.amount) as balance
            FROM ledger_entries le
            JOIN accounts a   ON a.id   = le.account_id
            JOIN assets   ast ON ast.id = le.asset_id
            GROUP BY a.name, ast.symbol
            ORDER BY a.name, ast.symbol
        """)
        rows = cur.fetchall()

    grouped: dict[str, list[AssetBalance]] = defaultdict(list)
    for name, symbol, balance in rows:
        grouped[name].append(AssetBalance(asset=symbol, balance=float(balance)))

    return [AccountBalance(account=name, balances=balances) for name, balances in grouped.items()]


@router.get("/balance/{account_name}", response_model=AccountBalance)
async def get_balance(account_name: str, conn=Depends(get_db)):
    _resolve_account(conn, account_name)

    with conn.cursor() as cur:
        cur.execute("""
            SELECT ast.symbol, SUM(le.amount) as balance
            FROM ledger_entries le
            JOIN assets ast ON ast.id = le.asset_id
            WHERE le.account_id = (SELECT id FROM accounts WHERE name = %s)
            GROUP BY ast.symbol
            ORDER BY ast.symbol
        """, (account_name,))
        rows = cur.fetchall()

    return AccountBalance(
        account=account_name,
        balances=[AssetBalance(asset=symbol, balance=float(bal)) for symbol, bal in rows],
    )
