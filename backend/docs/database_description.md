# Ledger Database Schema

This document describes the core PostgreSQL tables used to support
a **double-entry ledger system** for gold trading transactions.

The schema is designed for:
- Manual admin input
- Auditability
- Financial correctness
- Future scalability (AI agents, reporting, compliance)

---

## 1. `accounts`

### Purpose
Represents all parties participating in transactions, such as buyers, sellers, or system administrators.

Each account can hold balances in multiple assets (USD, XAU, etc.)
via related ledger entries.

### Columns

| Column | Type | Description |
|------|------|------------|
| `id` | UUID (PK) | Unique identifier of the account |
| `name` | TEXT | Display name (e.g. `MC`, `House Admin`) |
| `type` | TEXT | Account type: `customer`, `house`, `admin` |
| `status` | TEXT | Account status (default: `active`) |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |

### Notes
- One account can appear in many transactions.
- Balances are **not stored here**; they are derived from `ledger_entries`.

---

## 2. `assets`

### Purpose
Defines the types of assets supported by the ledger system.

Examples include:
- `USD` – fiat currency
- `XAU` – gold (troy ounces)

### Columns

| Column | Type | Description |
|------|------|------------|
| `id` | UUID (PK) | Unique identifier of the asset |
| `symbol` | TEXT | Asset code (e.g. `USD`, `XAU`) |
| `decimals` | INT | Decimal precision for the asset |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |

### Notes
- Acts as master/reference data.
- Enables easy extension to other assets (BTC, ETH, AUD, etc.).

---

## 3. `transactions`

### Purpose
Represents a **business-level trading event**, such as a gold purchase or sale.

This table records *what happened* from a business perspective,
but **does not store balances**.

### Columns

| Column | Type | Description |
|------|------|------------|
| `id` | UUID (PK) | Unique transaction identifier |
| `reference` | TEXT | Human-readable reference (e.g. `TXN-20260129-001`) |
| `trade_type` | TEXT | Trade direction: `buy` or `sell` |
| `gold_grams` | NUMERIC(20,6) | Quantity of gold in grams |
| `price_usd_per_oz` | NUMERIC(20,8) | Gold price in USD per troy ounce |
| `value_date` | DATE | Effective settlement date |
| `created_by` | UUID | Admin or system user who created the transaction |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |

### Notes
- One transaction produces **multiple ledger entries**.
- Used for reporting, auditing, and reconciliation.

---

## 4. `ledger_entries`

### Purpose
This is the **core accounting table** implementing the
**double-entry ledger model**.

Every transaction generates multiple ledger entries that must balance to zero per asset.

### Columns

| Column | Type | Description |
|------|------|------------|
| `id` | UUID (PK) | Unique ledger entry identifier |
| `transaction_id` | UUID (FK) | Associated transaction |
| `account_id` | UUID (FK) | Account affected by this entry |
| `asset_id` | UUID (FK) | Asset being debited or credited |
| `amount` | NUMERIC(20,8) | Signed amount (+ or -) |
| `entry_type` | TEXT | `debit` or `credit` |
| `created_at` | TIMESTAMPTZ | Entry creation timestamp |

### Constraints
- `amount` must not be zero.
- Foreign keys ensure referential integrity.

### Accounting Rules
- Positive amounts increase balance.
- Negative amounts decrease balance.
- **Sum of all ledger entries per asset must equal zero** for a valid transaction.

---

## Design Principles

- **ACID compliance**: All ledger entries are written in a single database transaction.
- **Auditability**: No balance is overwritten; all changes are append-only.
- **Scalability**: Supports future extensions such as AI agents, automated settlement, and regulatory reporting.
- **Financial correctness**: Avoids floating-point errors by using `NUMERIC`.

---

## Summary

This schema separates:
- *Who* (`accounts`)
- *What* (`assets`)
- *Why* (`transactions`)
- *How value moves* (`ledger_entries`)

Together, these tables form a robust foundation for a financial ledger system.


