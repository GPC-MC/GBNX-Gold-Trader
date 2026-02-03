## Execution Steps of `create_gold_trade`

The `create_gold_trade` stored procedure follows a strict, ordered workflow
to ensure financial correctness, atomicity, and auditability.

Each step builds on the previous one. If any step fails, the entire operation is rolled back.

---

### Step 1: Resolve Asset Identifiers

The procedure first looks up the internal database identifiers for the required assets:

- USD (fiat currency)
- XAU (gold, troy ounces)

This ensures the system is using canonical asset records rather than hard-coded values.

If either asset is missing, execution stops immediately with an error.

---

### Step 2: Convert and Normalize Quantities

The input gold quantity is provided in grams.
To support trading and pricing, the procedure converts this amount to troy ounces using: 1 troy ounce = 31.1034768 grams


Normalization rules:
- Gold quantity is rounded to **6 decimal places**
- USD amounts are rounded to **2 decimal places**

This prevents floating-point drift and enforces asset-specific precision.

---

### Step 3: Create the Business Transaction Record

A single row is inserted into the `transactions` table to record the business event.

This record captures:
- Trade direction (buy)
- Gold quantity in grams
- Price in USD per ounce
- Value (settlement) date
- Human-readable reference

At this stage, **no balances change**.  
The transaction only documents *what happened*, not *how value moved*.

---

### Step 4: Generate Ledger Entries (Double-Entry Accounting)

The procedure then creates four ledger entries linked to the transaction:

#### Buyer (Purchaser)
- USD entry with a negative amount (payment)
- XAU entry with a positive amount (gold received)

#### Seller (House / Counterparty)
- USD entry with a positive amount (payment received)
- XAU entry with a negative amount (gold delivered)

Each ledger entry records:
- Which account is affected
- Which asset is affected
- The signed amount
- The originating transaction

This ensures every change in value is explicitly recorded.

---

### Step 5: Validate Ledger Balance Integrity

After all ledger entries are written, the procedure verifies accounting correctness.

For each asset involved in the transaction, it checks: SUM(ledger.amount) = 0

This guarantees:
- No value is created or destroyed
- The ledger remains mathematically balanced

If any imbalance is detected, an exception is raised.

---

### Step 6: Commit or Roll Back Automatically

If all steps succeed:
- The database commits the transaction
- The trade becomes permanent and auditable

If any step fails:
- PostgreSQL automatically rolls back everything
- No partial data or corrupted ledger state remains

---

## Resulting State

After successful execution:
- One transaction exists in `transactions`
- Four corresponding entries exist in `ledger_entries`
- Account balances can be derived deterministically
- The ledger is audit-safe and consistent

---

## Key Guarantees

This step-by-step process guarantees:
- Atomic execution (all-or-nothing)
- Double-entry accounting correctness
- Precision-safe financial calculations
- Full traceability from business intent to value movement