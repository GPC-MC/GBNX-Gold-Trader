-- =============================================================================
-- Stored Procedure: create_gold_trade
-- =============================================================================
-- Purpose: Execute a gold trade transaction using double-entry accounting
--
-- This procedure ensures:
--   • Atomic execution (all-or-nothing)
--   • Double-entry ledger correctness
--   • Precision-safe financial calculations
--   • Balance verification before trade execution
--   • Full auditability and traceability
--
-- Parameters:
--   p_buyer_account_id    UUID    - Account purchasing gold
--   p_seller_account_id   UUID    - Account selling gold (usually house)
--   p_gold_grams          NUMERIC - Quantity of gold in grams
--   p_price_usd_per_oz    NUMERIC - Price in USD per troy ounce
--   p_value_date          DATE    - Effective settlement date
--   p_trade_type          TEXT    - Trade direction: 'buy' or 'sell'
--   p_reference           TEXT    - Human-readable reference (auto-generated if NULL)
--   p_created_by          UUID    - Admin/user creating the transaction
--
-- Returns: UUID - The transaction ID
--
-- Example Usage:
--   SELECT create_gold_trade(
--       p_buyer_account_id   := '123e4567-e89b-12d3-a456-426614174000',
--       p_seller_account_id  := '123e4567-e89b-12d3-a456-426614174001',
--       p_gold_grams         := 100.0,
--       p_price_usd_per_oz   := 2000.00,
--       p_value_date         := '2026-02-03',
--       p_trade_type         := 'buy',
--       p_reference          := 'TXN-20260203-001',
--       p_created_by         := '123e4567-e89b-12d3-a456-426614174002'
--   );
-- =============================================================================

CREATE OR REPLACE FUNCTION create_gold_trade(
    p_buyer_account_id UUID,
    p_seller_account_id UUID,
    p_gold_grams NUMERIC,
    p_price_usd_per_oz NUMERIC,
    p_value_date DATE,
    p_trade_type TEXT,
    p_reference TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    -- Transaction and asset identifiers
    v_transaction_id UUID;
    v_usd_asset_id UUID;
    v_xau_asset_id UUID;

    -- Converted quantities
    v_gold_oz NUMERIC(20, 6);
    v_usd_amount NUMERIC(20, 2);

    -- Balance tracking for validation
    v_buyer_usd_balance NUMERIC(20, 2);
    v_seller_xau_balance NUMERIC(20, 6);

    -- Constants
    c_grams_per_troy_oz CONSTANT NUMERIC := 31.1034768;
BEGIN
    -- =============================================================================
    -- STEP 1: Resolve Asset Identifiers
    -- =============================================================================
    SELECT id INTO v_usd_asset_id
    FROM assets
    WHERE symbol = 'USD'
    LIMIT 1;

    IF v_usd_asset_id IS NULL THEN
        RAISE EXCEPTION 'Asset USD not found in assets table';
    END IF;

    SELECT id INTO v_xau_asset_id
    FROM assets
    WHERE symbol = 'XAU'
    LIMIT 1;

    IF v_xau_asset_id IS NULL THEN
        RAISE EXCEPTION 'Asset XAU not found in assets table';
    END IF;

    -- =============================================================================
    -- STEP 2: Convert and Normalize Quantities
    -- =============================================================================
    -- Convert grams to troy ounces: 1 troy ounce = 31.1034768 grams
    v_gold_oz := ROUND(p_gold_grams / c_grams_per_troy_oz, 6);

    -- Calculate total USD amount
    v_usd_amount := ROUND(v_gold_oz * p_price_usd_per_oz, 2);

    -- Input validation
    IF p_gold_grams <= 0 THEN
        RAISE EXCEPTION 'Gold quantity must be positive, got % grams', p_gold_grams;
    END IF;

    IF p_price_usd_per_oz <= 0 THEN
        RAISE EXCEPTION 'Price must be positive, got % USD/oz', p_price_usd_per_oz;
    END IF;

    IF v_usd_amount <= 0 THEN
        RAISE EXCEPTION 'Calculated USD amount must be positive, got %', v_usd_amount;
    END IF;

    IF p_trade_type NOT IN ('buy', 'sell') THEN
        RAISE EXCEPTION 'trade_type must be ''buy'' or ''sell'', got ''%''', p_trade_type;
    END IF;

    -- =============================================================================
    -- STEP 3: Lock and Verify Account Balances
    -- =============================================================================
    -- This step prevents race conditions and overdrafts by:
    --   1. Locking all ledger rows for the accounts/assets
    --   2. Calculating current balances
    --   3. Verifying sufficient funds before proceeding

    -- Lock buyer's USD ledger entries and check balance
    SELECT COALESCE(SUM(amount), 0)
    INTO v_buyer_usd_balance
    FROM (
        SELECT amount
        FROM ledger_entries
        WHERE account_id = p_buyer_account_id
          AND asset_id = v_usd_asset_id
        FOR UPDATE
    ) AS locked_rows;

    IF v_buyer_usd_balance < v_usd_amount THEN
        RAISE EXCEPTION 'Insufficient USD balance for buyer. Required: %, Available: %',
            v_usd_amount, v_buyer_usd_balance;
    END IF;

    -- Lock seller's XAU ledger entries and check balance
    SELECT COALESCE(SUM(amount), 0)
    INTO v_seller_xau_balance
    FROM (
        SELECT amount
        FROM ledger_entries
        WHERE account_id = p_seller_account_id
          AND asset_id = v_xau_asset_id
        FOR UPDATE
    ) AS locked_rows;

    IF v_seller_xau_balance < v_gold_oz THEN
        RAISE EXCEPTION 'Insufficient XAU balance for seller. Required: % oz, Available: % oz',
            v_gold_oz, v_seller_xau_balance;
    END IF;

    -- =============================================================================
    -- STEP 4: Create the Business Transaction Record
    -- =============================================================================
    -- This documents WHAT happened from a business perspective
    -- Auto-generate reference if not provided
    INSERT INTO transactions (
        id,
        reference,
        trade_type,
        gold_grams,
        price_usd_per_oz,
        value_date,
        created_by,
        created_at
    ) VALUES (
        gen_random_uuid(),
        COALESCE(p_reference, 'TXN-' || to_char(NOW(), 'YYYYMMDDHH24MISS')),
        p_trade_type,
        p_gold_grams,
        p_price_usd_per_oz,
        p_value_date,
        p_created_by,
        NOW()
    )
    RETURNING id INTO v_transaction_id;

    -- =============================================================================
    -- STEP 5: Generate Ledger Entries (Double-Entry Accounting)
    -- =============================================================================
    -- This documents HOW value moved between accounts
    --
    -- Double-entry rules:
    --   • Negative amount = asset leaves the account (payment, delivery)
    --   • Positive amount = asset enters the account (receipt, acquisition)
    --   • All entries for a transaction must sum to zero per asset
    --
    -- Four entries are created (2 for buyer, 2 for seller):

    -- Entry 1: Buyer pays USD (negative = outflow)
    INSERT INTO ledger_entries (
        id,
        transaction_id,
        account_id,
        asset_id,
        amount,
        entry_type,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_transaction_id,
        p_buyer_account_id,
        v_usd_asset_id,
        -v_usd_amount,
        'debit',
        NOW()
    );

    -- Entry 2: Buyer receives gold (positive = inflow)
    INSERT INTO ledger_entries (
        id,
        transaction_id,
        account_id,
        asset_id,
        amount,
        entry_type,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_transaction_id,
        p_buyer_account_id,
        v_xau_asset_id,
        v_gold_oz,
        'credit',
        NOW()
    );

    -- Entry 3: Seller receives USD (positive = inflow)
    INSERT INTO ledger_entries (
        id,
        transaction_id,
        account_id,
        asset_id,
        amount,
        entry_type,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_transaction_id,
        p_seller_account_id,
        v_usd_asset_id,
        v_usd_amount,
        'credit',
        NOW()
    );

    -- Entry 4: Seller delivers gold (negative = outflow)
    INSERT INTO ledger_entries (
        id,
        transaction_id,
        account_id,
        asset_id,
        amount,
        entry_type,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_transaction_id,
        p_seller_account_id,
        v_xau_asset_id,
        -v_gold_oz,
        'debit',
        NOW()
    );

    -- =============================================================================
    -- STEP 6: Validate Ledger Balance Integrity
    -- =============================================================================
    -- Verify that all ledger entries balance to zero per asset
    -- This is the fundamental requirement of double-entry accounting
    IF EXISTS (
        SELECT 1
        FROM ledger_entries
        WHERE transaction_id = v_transaction_id
        GROUP BY asset_id
        HAVING SUM(amount) <> 0
    ) THEN
        RAISE EXCEPTION 'Ledger imbalance detected for transaction %', v_transaction_id;
    END IF;

    -- =============================================================================
    -- STEP 7: Return Transaction ID
    -- =============================================================================
    -- If we reach here, all validations passed and the transaction is complete
    -- PostgreSQL will automatically commit if this function returns successfully
    RETURN v_transaction_id;

END;
$$;

-- =============================================================================
-- Post-Installation Notes
-- =============================================================================
-- After creating this function, you may want to grant execute permissions:
--
-- GRANT EXECUTE ON FUNCTION create_gold_trade TO your_application_role;
--
-- =============================================================================