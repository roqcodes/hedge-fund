/** Idempotent DDL for USDT module tables. Keep in sync with src/data/schema.sql */
export const SQL_ENSURE_USDT_SCHEMA = `
CREATE TABLE IF NOT EXISTS usdt_branch_settings (
    branch_id VARCHAR(50) PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
    preset_margin DECIMAL(15, 6) NOT NULL DEFAULT 0.002,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usdt_buys (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    txn_id VARCHAR(50),
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    wallet_id VARCHAR(100),
    opening_balance DECIMAL(15, 2),
    usdt_amount DECIMAL(18, 4) NOT NULL,
    aed_rate DECIMAL(15, 6) NOT NULL,
    service_charge DECIMAL(15, 2) NOT NULL DEFAULT 0,
    aed_total DECIMAL(15, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usdt_sells (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    txn_id VARCHAR(50),
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    wallet_id VARCHAR(100),
    opening_balance DECIMAL(15, 2),
    usdt_amount DECIMAL(18, 4) NOT NULL,
    cost DECIMAL(15, 6) NOT NULL,
    margin DECIMAL(15, 6) NOT NULL,
    aed_rate DECIMAL(15, 6) NOT NULL,
    service_charge DECIMAL(15, 2) NOT NULL DEFAULT 0,
    aed_total DECIMAL(15, 2) NOT NULL,
    profit DECIMAL(15, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usdt_buys_branch_id ON usdt_buys(branch_id);
CREATE INDEX IF NOT EXISTS idx_usdt_sells_branch_id ON usdt_sells(branch_id);

ALTER TABLE usdt_buys ADD COLUMN IF NOT EXISTS entered_by VARCHAR(255);
ALTER TABLE usdt_buys ADD COLUMN IF NOT EXISTS entered_by_name VARCHAR(255);
ALTER TABLE usdt_buys ADD COLUMN IF NOT EXISTS entered_by_user_id VARCHAR(255);
ALTER TABLE usdt_sells ADD COLUMN IF NOT EXISTS entered_by VARCHAR(255);
ALTER TABLE usdt_sells ADD COLUMN IF NOT EXISTS entered_by_name VARCHAR(255);
ALTER TABLE usdt_sells ADD COLUMN IF NOT EXISTS entered_by_user_id VARCHAR(255);

ALTER TABLE branch_usdt_balances ADD COLUMN IF NOT EXISTS aed_balance DECIMAL(18, 4) NOT NULL DEFAULT 0.0000;
ALTER TABLE branch_usdt_balances ADD COLUMN IF NOT EXISTS idr_balance DECIMAL(18, 4) NOT NULL DEFAULT 0.0000;

ALTER TABLE fund_entity_ledger ADD COLUMN IF NOT EXISTS settlement_currency VARCHAR(10);

CREATE TABLE IF NOT EXISTS usdt_idr_conversions (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usdt_amount DECIMAL(18, 4) NOT NULL,
    conversion_rate DECIMAL(15, 6) NOT NULL,
    idr_amount DECIMAL(18, 2) NOT NULL,
    entered_by VARCHAR(255),
    entered_by_name VARCHAR(255),
    entered_by_user_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usdt_idr_conversions_branch ON usdt_idr_conversions(branch_id);
`;

