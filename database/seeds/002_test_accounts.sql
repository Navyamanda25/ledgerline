-- ============================================
-- LEDGERLINE - TEST ACCOUNTS
-- Development seed data only
-- ============================================

-- Customer account 1
INSERT INTO accounts (
    account_number,
    account_name,
    account_type,
    balance_paise
)
VALUES (
    'LL10000001',
    'Primary Test Account',
    'customer',
    1000000
)
ON CONFLICT (account_number) DO NOTHING;

-- Customer account 2
INSERT INTO accounts (
    account_number,
    account_name,
    account_type,
    balance_paise
)
VALUES (
    'LL10000002',
    'Secondary Test Account',
    'customer',
    500000
)
ON CONFLICT (account_number) DO NOTHING;

-- System account for external deposits and withdrawals
INSERT INTO accounts (
    account_number,
    account_name,
    account_type,
    balance_paise
)
VALUES (
    'LLSYSTEM001',
    'External Clearing Account',
    'system',
    0
)
ON CONFLICT (account_number) DO NOTHING;

-- Give the account holder access to both customer accounts
INSERT INTO account_permissions (user_id, account_id, permission)
SELECT 2, id, 'transact'
FROM accounts
WHERE account_number IN ('LL10000001', 'LL10000002')
ON CONFLICT (user_id, account_id) DO NOTHING;