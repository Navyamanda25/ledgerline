-- ============================================
-- LEDGERLINE - INITIAL DATABASE SCHEMA
-- Database: PostgreSQL
-- Currency: INR (amounts stored in paise)
-- ============================================

-- 1. USERS
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('admin', 'account_holder', 'auditor')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ACCOUNTS
CREATE TABLE accounts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_number VARCHAR(30) NOT NULL UNIQUE,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) NOT NULL
        CHECK (account_type IN ('customer', 'system')),
    balance_paise BIGINT NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Customer accounts must never have negative balances.
    CHECK (account_type = 'system' OR balance_paise >= 0)
);

-- 3. ACCOUNT PERMISSIONS
CREATE TABLE account_permissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    permission VARCHAR(20) NOT NULL
        CHECK (permission IN ('view', 'transact', 'manage')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, account_id)
);

-- 4. TRANSACTIONS
CREATE TABLE transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    request_hash VARCHAR(64) NOT NULL,

    transaction_type VARCHAR(20) NOT NULL
        CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer')),

    source_account_id BIGINT NOT NULL REFERENCES accounts(id),
    destination_account_id BIGINT NOT NULL REFERENCES accounts(id),

    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),

    initiated_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (source_account_id <> destination_account_id)
);

-- 5. DOUBLE-ENTRY LEDGER
CREATE TABLE ledger_entries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id),
    account_id BIGINT NOT NULL REFERENCES accounts(id),

    entry_type VARCHAR(10) NOT NULL
        CHECK (entry_type IN ('debit', 'credit')),

    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. AUDIT EVENTS
CREATE TABLE audit_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id BIGINT REFERENCES users(id),
    event_type VARCHAR(100) NOT NULL,
    outcome VARCHAR(20) NOT NULL
        CHECK (outcome IN ('success', 'refused', 'failure')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR FASTER QUERIES
-- ============================================

CREATE INDEX idx_accounts_account_number
    ON accounts(account_number);

CREATE INDEX idx_permissions_user
    ON account_permissions(user_id);

CREATE INDEX idx_permissions_account
    ON account_permissions(account_id);

CREATE INDEX idx_transactions_source
    ON transactions(source_account_id);

CREATE INDEX idx_transactions_destination
    ON transactions(destination_account_id);

CREATE INDEX idx_transactions_initiator
    ON transactions(initiated_by);

CREATE INDEX idx_ledger_transaction
    ON ledger_entries(transaction_id);

CREATE INDEX idx_ledger_account
    ON ledger_entries(account_id);

CREATE INDEX idx_audit_actor
    ON audit_events(actor_user_id);

CREATE INDEX idx_audit_created_at
    ON audit_events(created_at);

-- ============================================
-- APPEND-ONLY PROTECTION
-- Prevent updates and deletes on ledger and audit.
-- ============================================

CREATE OR REPLACE FUNCTION prevent_record_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'This table is append-only. Records cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_immutable
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_record_modification();

CREATE TRIGGER audit_events_immutable
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW
EXECUTE FUNCTION prevent_record_modification();