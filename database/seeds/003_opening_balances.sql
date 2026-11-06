-- ============================================
-- LEDGERLINE - OPENING BALANCE ENTRIES
-- Development seed data only
-- ============================================

BEGIN;

-- Record the opening funding transaction.
-- Run only once; the unique idempotency key prevents duplication.

WITH opening_transaction AS (
    INSERT INTO transactions (
        idempotency_key,
        request_hash,
        transaction_type,
        source_account_id,
        destination_account_id,
        amount_paise,
        initiated_by
    )
    VALUES (
        'SEED-OPENING-001',
        'opening-balances-v1',
        'deposit',
        3,
        1,
        1000000,
        1
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
)
INSERT INTO ledger_entries (
    transaction_id,
    account_id,
    entry_type,
    amount_paise
)
SELECT id, 3, 'debit', 1000000
FROM opening_transaction

UNION ALL

SELECT id, 1, 'credit', 1000000
FROM opening_transaction;

-- Record the second opening funding transaction.

WITH opening_transaction AS (
    INSERT INTO transactions (
        idempotency_key,
        request_hash,
        transaction_type,
        source_account_id,
        destination_account_id,
        amount_paise,
        initiated_by
    )
    VALUES (
        'SEED-OPENING-002',
        'opening-balances-v1',
        'deposit',
        3,
        2,
        500000,
        1
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
)
INSERT INTO ledger_entries (
    transaction_id,
    account_id,
    entry_type,
    amount_paise
)
SELECT id, 3, 'debit', 500000
FROM opening_transaction

UNION ALL

SELECT id, 2, 'credit', 500000
FROM opening_transaction;

COMMIT;