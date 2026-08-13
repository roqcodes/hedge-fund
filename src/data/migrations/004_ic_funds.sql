-- IC Funds standalone ledger (idempotent)
-- Also disconnect leftover IC auto-rows from the gold Funds ledger.
-- Does not alter Funds UI or fund_entity_ledger schema.

CREATE TABLE IF NOT EXISTS ic_fund_accounts (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('bank', 'personal', 'income', 'profit', 'expense', 'd_expense')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ic_fund_accounts_branch_name
    ON ic_fund_accounts (branch_id, LOWER(TRIM(name)));

CREATE INDEX IF NOT EXISTS idx_ic_fund_accounts_branch_type
    ON ic_fund_accounts (branch_id, account_type, status);

CREATE TABLE IF NOT EXISTS ic_fund_voucher_counters (
    branch_id VARCHAR(50) PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
    last_no INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ic_fund_vouchers (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    voucher_no INTEGER NOT NULL,
    voucher_type VARCHAR(20) NOT NULL CHECK (voucher_type IN ('payment', 'receipt', 'journal', 'contra')),
    voucher_date DATE NOT NULL,
    debit_account_id VARCHAR(50) NOT NULL REFERENCES ic_fund_accounts(id) ON DELETE RESTRICT,
    credit_account_id VARCHAR(50) NOT NULL REFERENCES ic_fund_accounts(id) ON DELETE RESTRICT,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    notes TEXT NOT NULL DEFAULT '',
    created_by VARCHAR(255),
    created_by_name VARCHAR(255),
    created_by_user_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ic_fund_voucher_distinct_accounts CHECK (debit_account_id <> credit_account_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ic_fund_vouchers_branch_no
    ON ic_fund_vouchers (branch_id, voucher_no);

CREATE INDEX IF NOT EXISTS idx_ic_fund_vouchers_branch_date
    ON ic_fund_vouchers (branch_id, voucher_date DESC, voucher_no DESC);

CREATE INDEX IF NOT EXISTS idx_ic_fund_vouchers_branch_type_date
    ON ic_fund_vouchers (branch_id, voucher_type, voucher_date DESC);

CREATE INDEX IF NOT EXISTS idx_ic_fund_vouchers_debit
    ON ic_fund_vouchers (debit_account_id);

CREATE INDEX IF NOT EXISTS idx_ic_fund_vouchers_credit
    ON ic_fund_vouchers (credit_account_id);

DELETE FROM fund_entity_ledger
 WHERE reference_type IN ('ic_sale', 'ic_purchase');
