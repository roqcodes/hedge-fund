-- =========================================================================
-- FUNDS MODULE — Entity Settlement Ledger (AR/AP)
-- Drop old tables (3-table design), replace with single entity-ledger table
-- =========================================================================

DROP TABLE IF EXISTS fund_journal_lines CASCADE;
DROP TABLE IF EXISTS fund_journal_entries CASCADE;
DROP TABLE IF EXISTS fund_accounts CASCADE;

CREATE TABLE IF NOT EXISTS fund_entity_ledger (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    entry_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL DEFAULT '',
    debit DECIMAL(15, 2) NOT NULL DEFAULT 0,   -- entity owes branch (receivable)
    credit DECIMAL(15, 2) NOT NULL DEFAULT 0,  -- branch owes entity (payable)
    reference_type VARCHAR(30),                 -- 'physical_buy','physical_sell','usdt_buy','usdt_sell','manual'
    reference_id VARCHAR(50),
    created_by VARCHAR(255),
    created_by_name VARCHAR(255),
    created_by_user_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_side CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)),
    CONSTRAINT non_negative CHECK (debit >= 0 AND credit >= 0)
);

CREATE INDEX IF NOT EXISTS idx_fund_el_branch ON fund_entity_ledger(branch_id);
CREATE INDEX IF NOT EXISTS idx_fund_el_customer ON fund_entity_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_fund_el_date ON fund_entity_ledger(branch_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_fund_el_reference ON fund_entity_ledger(reference_type, reference_id);
