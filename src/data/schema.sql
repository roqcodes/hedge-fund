-- HEDGE Capital Management Database Schema (PostgreSQL)

-- 1. HQ Balance (Singleton table)
CREATE TABLE IF NOT EXISTS hq_balance (
    id INT PRIMARY KEY DEFAULT 1,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 50000000.00,
    CONSTRAINT hq_balance_singleton CHECK (id = 1)
);

-- Initialize HQ balance if not present
INSERT INTO hq_balance (id, amount)
VALUES (1, 50000000.00)
ON CONFLICT (id) DO NOTHING;

-- 2. Branches
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(50) PRIMARY KEY,
    slug VARCHAR(255) UNIQUE,
    name VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    trn VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(255),
    location VARCHAR(255) NOT NULL,
    manager_name VARCHAR(255) NOT NULL,
    cash_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    gold_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    opening_gold_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    closing_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    daily_pl DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Dubai',
    hidden_pages TEXT[] NOT NULL DEFAULT '{}',
    enabled_currencies TEXT[] NOT NULL DEFAULT '{AED}',
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    from_entity VARCHAR(255) NOT NULL,
    to_entity VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    asset_type VARCHAR(20) NOT NULL DEFAULT 'currency' CHECK (asset_type IN ('currency', 'gold')),
    status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
    notes TEXT NOT NULL,
    category VARCHAR(100),
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE
);

-- 3.4 Transaction Tags
CREATE TABLE IF NOT EXISTS transaction_tags (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, name)
);

CREATE TABLE IF NOT EXISTS transaction_tag_links (
    transaction_id VARCHAR(50) NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id VARCHAR(50) NOT NULL REFERENCES transaction_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tx_tag_links_tx ON transaction_tag_links(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_tag_links_tag ON transaction_tag_links(tag_id);

-- 3.5 Entities
CREATE TABLE IF NOT EXISTS entities (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.6 Ledgers
CREATE TABLE IF NOT EXISTS ledgers (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    impact VARCHAR(20) NOT NULL DEFAULT 'neutral' CHECK (impact IN ('positive', 'negative', 'neutral')),
    is_kpi BOOLEAN NOT NULL DEFAULT true,
    kpi_invert BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ledgers_global_name_unique ON ledgers (name) WHERE branch_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ledgers_branch_name_unique ON ledgers (branch_id, name) WHERE branch_id IS NOT NULL;

-- 4. Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
    branch_name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('capex', 'opex')),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL
);

-- 5. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
    branch_name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue'))
);

-- 6. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    message TEXT NOT NULL,
    time VARCHAR(50) NOT NULL, -- Keep relative text string as defined in mock data
    read BOOLEAN NOT NULL DEFAULT FALSE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('transfer', 'report', 'alert', 'info')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Investors
CREATE TABLE IF NOT EXISTS investors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    emirates_id VARCHAR(50),
    passport_no VARCHAR(50),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    cash_deposit DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    gold_deposit DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    gold_weight_grams DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
    risk_profile VARCHAR(20) NOT NULL CHECK (risk_profile IN ('conservative', 'balanced', 'aggressive')),
    kyc_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('verified', 'pending', 'expired')),
    joined_date DATE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE SET NULL,
    assigned_branch_name VARCHAR(255),
    preferred_contact VARCHAR(20) NOT NULL CHECK (preferred_contact IN ('email', 'phone', 'whatsapp')),
    is_global BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT
);

-- 8. Investor Deposits (History)
CREATE TABLE IF NOT EXISTS investor_deposits (
    id VARCHAR(50) PRIMARY KEY,
    investor_id VARCHAR(50) NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'gold')),
    amount DECIMAL(15, 2) NOT NULL,
    gold_grams DECIMAL(15, 2),
    notes TEXT
);

-- 9. Deals
CREATE TABLE IF NOT EXISTS deals (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    group_name VARCHAR(255) DEFAULT 'General',
    group_type VARCHAR(20) DEFAULT 'gold' CHECK (group_type IN ('gold', 'currency')),
    amount DECIMAL(15, 2) NOT NULL,
    total_investment DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    to_branch_id VARCHAR(50), -- Removed FOREIGN KEY to support custom entities
    to_branch_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed', 'cancelled')),
    total_pl DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    expense DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    manager_share DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    gold_volume DECIMAL(15, 2) DEFAULT 0.00,
    managing_branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE RESTRICT,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Deal Investors (Many-to-Many junction table)
CREATE TABLE IF NOT EXISTS deal_investors (
    deal_id VARCHAR(50) REFERENCES deals(id) ON DELETE CASCADE,
    investor_id VARCHAR(50) REFERENCES investors(id) ON DELETE RESTRICT,
    investor_name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    is_gold BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (deal_id, investor_id)
);

-- 11. Deal Transactions (detailed CSV data)
CREATE TABLE IF NOT EXISTS deal_transactions (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    time VARCHAR(5) DEFAULT NULL,          -- HH:MM format, e.g. "14:30"
    deal_id VARCHAR(50) REFERENCES deals(id) ON DELETE CASCADE,
    deal_number VARCHAR(50) DEFAULT NULL,
    weight DECIMAL(15, 2) NOT NULL,
    rate DECIMAL(15, 2) NOT NULL,
    pure_cost_aed DECIMAL(15, 2) NOT NULL,
    currency_amount DECIMAL(15, 2) DEFAULT 0.00,
    purchase_rate DECIMAL(15, 6) DEFAULT 0.000000,
    conversion_rate DECIMAL(15, 6) DEFAULT 0.000000,
    live_sell_rate DECIMAL(15, 2) NOT NULL,
    sell_premium_discount DECIMAL(15, 2) NOT NULL,
    sales_aed DECIMAL(15, 2) NOT NULL,
    expenses DECIMAL(15, 2) NOT NULL,
    gross_profit DECIMAL(15, 2) NOT NULL,
    net_profit_per_gram DECIMAL(15, 6) NOT NULL,
    management_profit DECIMAL(15, 2) NOT NULL,
    fix_or_unfix VARCHAR(20) NOT NULL,
    margin_deposit DECIMAL(15, 2) NOT NULL,
    premium_discount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Deal Transaction Expenses (itemised key-value expenses per deal transaction)
CREATE TABLE IF NOT EXISTS deal_transaction_expenses (
    id VARCHAR(50) PRIMARY KEY,
    deal_transaction_id VARCHAR(50) NOT NULL REFERENCES deal_transactions(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value DECIMAL(15, 2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dte_deal_transaction_id ON deal_transaction_expenses(deal_transaction_id);

-- 13. Deal Transaction Payouts (Snapshot of exact profit splits at time of settlement)
CREATE TABLE IF NOT EXISTS deal_transaction_payouts (
    id VARCHAR(50) PRIMARY KEY,
    deal_transaction_id VARCHAR(50) NOT NULL REFERENCES deal_transactions(id) ON DELETE CASCADE,
    investor_id VARCHAR(50) NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
    investor_name VARCHAR(255) NOT NULL,
    payout_amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dtp_deal_transaction_id ON deal_transaction_payouts(deal_transaction_id);

-- 14. Physical Balances
CREATE TABLE IF NOT EXISTS physical_balances (
    branch_id VARCHAR(50) PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
    initial_capital DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    initial_volume DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    available_fund DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    available_volume DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Physical Buys
CREATE TABLE IF NOT EXISTS physical_buys (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    particulars TEXT NOT NULL,
    gross_weight DECIMAL(15, 2) NOT NULL,
    pure_conversion DECIMAL(15, 4) NOT NULL,
    pure_gram DECIMAL(15, 2) NOT NULL,
    idr_gram DECIMAL(15, 2) NOT NULL,
    idr_to_usdt DECIMAL(15, 2) NOT NULL,
    idr_rate DECIMAL(15, 4) NOT NULL,
    total DECIMAL(15, 2) NOT NULL,
    buy_value DECIMAL(15, 2) NOT NULL,
    remaining_weight DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Physical Sells
CREATE TABLE IF NOT EXISTS physical_sells (
    id VARCHAR(50) PRIMARY KEY,
    buy_id VARCHAR(50) NOT NULL REFERENCES physical_buys(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    particulars TEXT DEFAULT '',
    gross_weight DECIMAL(15, 2) NOT NULL DEFAULT 0,
    pure_conversion DECIMAL(15, 4) NOT NULL DEFAULT 1,
    pure_gram DECIMAL(15, 2) NOT NULL DEFAULT 0,
    idr_gram DECIMAL(15, 2) NOT NULL DEFAULT 0,
    idr_to_usdt DECIMAL(15, 2) NOT NULL DEFAULT 0,
    idr_rate DECIMAL(15, 4) NOT NULL DEFAULT 0,
    total DECIMAL(15, 2) NOT NULL DEFAULT 0,
    sell_value DECIMAL(15, 2) NOT NULL,
    profit DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Tax Invoices
CREATE TABLE IF NOT EXISTS tax_invoices (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
    doc_no VARCHAR(100) UNIQUE NOT NULL,
    doc_date DATE NOT NULL,
    ref_no VARCHAR(100),
    ref_date DATE,
    order_type VARCHAR(50) NOT NULL,
    fixing_type VARCHAR(50) NOT NULL,
    department VARCHAR(100) NOT NULL,
    vat_type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    sales_man VARCHAR(100),
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    customer_details TEXT,
    trade_type VARCHAR(10) NOT NULL DEFAULT 'sell' CHECK (trade_type IN ('buy', 'sell')),
    terms VARCHAR(50),
    due_date DATE,
    decl_no VARCHAR(100),
    remarks TEXT,
    
    -- Summaries
    gross_wt DECIMAL(15, 3) NOT NULL,
    pure_wt DECIMAL(15, 7) NOT NULL,
    add_chrg DECIMAL(15, 2) NOT NULL,
    mkg_chrg DECIMAL(15, 2) NOT NULL,
    gold_value DECIMAL(15, 2) NOT NULL,
    gross_amt DECIMAL(15, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    discount_amt DECIMAL(15, 2) DEFAULT 0.00,
    net_amt_dc DECIMAL(15, 2) NOT NULL,
    net_amt_bc DECIMAL(15, 2) NOT NULL,
    tax_amt DECIMAL(15, 2) NOT NULL,
    
    -- Settlements
    cash_pay DECIMAL(15, 2) DEFAULT 0.00,
    bank_pay DECIMAL(15, 2) DEFAULT 0.00,
    cc_pay DECIMAL(15, 2) DEFAULT 0.00,
    party_pay DECIMAL(15, 2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. Tax Invoice Items
CREATE TABLE IF NOT EXISTS tax_invoice_items (
    id VARCHAR(50) PRIMARY KEY,
    invoice_id VARCHAR(50) REFERENCES tax_invoices(id) ON DELETE CASCADE,
    product_code VARCHAR(255) NOT NULL,
    mtl_type VARCHAR(50) NOT NULL,
    pieces INT NOT NULL DEFAULT 1,
    purity DECIMAL(15, 7) NOT NULL,
    gross_qty DECIMAL(15, 3) NOT NULL,
    preferred_contact VARCHAR(20) NOT NULL CHECK (preferred_contact IN ('email', 'phone', 'whatsapp')),
    is_global BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT
);

-- 8. Investor Deposits (History)
CREATE TABLE IF NOT EXISTS investor_deposits (
    id VARCHAR(50) PRIMARY KEY,
    investor_id VARCHAR(50) NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'gold')),
    amount DECIMAL(15, 2) NOT NULL,
    gold_grams DECIMAL(15, 2),
    notes TEXT
);

-- 9. Deals
CREATE TABLE IF NOT EXISTS deals (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    group_name VARCHAR(255) DEFAULT 'General',
    group_type VARCHAR(20) DEFAULT 'gold' CHECK (group_type IN ('gold', 'currency')),
    amount DECIMAL(15, 2) NOT NULL,
    total_investment DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    to_branch_id VARCHAR(50), -- Removed FOREIGN KEY to support custom entities
    to_branch_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed', 'cancelled')),
    total_pl DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    expense DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    manager_share DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    gold_volume DECIMAL(15, 2) DEFAULT 0.00,
    managing_branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE RESTRICT,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Deal Investors (Many-to-Many junction table)
CREATE TABLE IF NOT EXISTS deal_investors (
    deal_id VARCHAR(50) REFERENCES deals(id) ON DELETE CASCADE,
    investor_id VARCHAR(50) REFERENCES investors(id) ON DELETE RESTRICT,
    investor_name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    is_gold BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (deal_id, investor_id)
);

-- 11. Deal Transactions (detailed CSV data)
CREATE TABLE IF NOT EXISTS deal_transactions (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    time VARCHAR(5) DEFAULT NULL,          -- HH:MM format, e.g. "14:30"
    deal_id VARCHAR(50) REFERENCES deals(id) ON DELETE CASCADE,
    deal_number VARCHAR(50) DEFAULT NULL,
    weight DECIMAL(15, 2) NOT NULL,
    rate DECIMAL(15, 2) NOT NULL,
    pure_cost_aed DECIMAL(15, 2) NOT NULL,
    currency_amount DECIMAL(15, 2) DEFAULT 0.00,
    purchase_rate DECIMAL(15, 6) DEFAULT 0.000000,
    conversion_rate DECIMAL(15, 6) DEFAULT 0.000000,
    live_sell_rate DECIMAL(15, 2) NOT NULL,
    sell_premium_discount DECIMAL(15, 2) NOT NULL,
    sales_aed DECIMAL(15, 2) NOT NULL,
    expenses DECIMAL(15, 2) NOT NULL,
    gross_profit DECIMAL(15, 2) NOT NULL,
    net_profit_per_gram DECIMAL(15, 6) NOT NULL,
    management_profit DECIMAL(15, 2) NOT NULL,
    fix_or_unfix VARCHAR(20) NOT NULL,
    margin_deposit DECIMAL(15, 2) NOT NULL,
    premium_discount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Deal Transaction Expenses (itemised key-value expenses per deal transaction)
CREATE TABLE IF NOT EXISTS deal_transaction_expenses (
    id VARCHAR(50) PRIMARY KEY,
    deal_transaction_id VARCHAR(50) NOT NULL REFERENCES deal_transactions(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value DECIMAL(15, 2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dte_deal_transaction_id ON deal_transaction_expenses(deal_transaction_id);

-- 13. Deal Transaction Payouts (Snapshot of exact profit splits at time of settlement)
CREATE TABLE IF NOT EXISTS deal_transaction_payouts (
    id VARCHAR(50) PRIMARY KEY,
    deal_transaction_id VARCHAR(50) NOT NULL REFERENCES deal_transactions(id) ON DELETE CASCADE,
    investor_id VARCHAR(50) NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
    investor_name VARCHAR(255) NOT NULL,
    payout_amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dtp_deal_transaction_id ON deal_transaction_payouts(deal_transaction_id);

-- 14. Physical Balances
CREATE TABLE IF NOT EXISTS physical_balances (
    branch_id VARCHAR(50) PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
    initial_capital DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    initial_volume DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    available_fund DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    available_volume DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Physical Buys
CREATE TABLE IF NOT EXISTS physical_buys (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    particulars TEXT NOT NULL,
    gross_weight DECIMAL(15, 2) NOT NULL,
    pure_conversion DECIMAL(15, 4) NOT NULL,
    pure_gram DECIMAL(15, 2) NOT NULL,
    idr_gram DECIMAL(15, 2) NOT NULL,
    idr_to_usdt DECIMAL(15, 2) NOT NULL,
    idr_rate DECIMAL(15, 4) NOT NULL,
    total DECIMAL(15, 2) NOT NULL,
    buy_value DECIMAL(15, 2) NOT NULL,
    remaining_weight DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Physical Sells
CREATE TABLE IF NOT EXISTS physical_sells (
    id VARCHAR(50) PRIMARY KEY,
    buy_id VARCHAR(50) NOT NULL REFERENCES physical_buys(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    particulars TEXT DEFAULT '',
    gross_weight DECIMAL(15, 2) NOT NULL DEFAULT 0,
    pure_conversion DECIMAL(15, 4) NOT NULL DEFAULT 1,
    pure_gram DECIMAL(15, 2) NOT NULL DEFAULT 0,
    idr_gram DECIMAL(15, 2) NOT NULL DEFAULT 0,
    idr_to_usdt DECIMAL(15, 2) NOT NULL DEFAULT 0,
    idr_rate DECIMAL(15, 4) NOT NULL DEFAULT 0,
    total DECIMAL(15, 2) NOT NULL DEFAULT 0,
    sell_value DECIMAL(15, 2) NOT NULL,
    profit DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Tax Invoices
CREATE TABLE IF NOT EXISTS tax_invoices (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
    doc_no VARCHAR(100) UNIQUE NOT NULL,
    doc_date DATE NOT NULL,
    ref_no VARCHAR(100),
    ref_date DATE,
    order_type VARCHAR(50) NOT NULL,
    fixing_type VARCHAR(50) NOT NULL,
    department VARCHAR(100) NOT NULL,
    vat_type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    sales_man VARCHAR(100),
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    customer_details TEXT,
    trade_type VARCHAR(10) NOT NULL DEFAULT 'sell' CHECK (trade_type IN ('buy', 'sell')),
    terms VARCHAR(50),
    due_date DATE,
    decl_no VARCHAR(100),
    remarks TEXT,
    
    -- Summaries
    gross_wt DECIMAL(15, 3) NOT NULL,
    pure_wt DECIMAL(15, 7) NOT NULL,
    add_chrg DECIMAL(15, 2) NOT NULL,
    mkg_chrg DECIMAL(15, 2) NOT NULL,
    gold_value DECIMAL(15, 2) NOT NULL,
    gross_amt DECIMAL(15, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    discount_amt DECIMAL(15, 2) DEFAULT 0.00,
    net_amt_dc DECIMAL(15, 2) NOT NULL,
    net_amt_bc DECIMAL(15, 2) NOT NULL,
    tax_amt DECIMAL(15, 2) NOT NULL,
    
    -- Settlements
    cash_pay DECIMAL(15, 2) DEFAULT 0.00,
    bank_pay DECIMAL(15, 2) DEFAULT 0.00,
    cc_pay DECIMAL(15, 2) DEFAULT 0.00,
    party_pay DECIMAL(15, 2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. Tax Invoice Items
CREATE TABLE IF NOT EXISTS tax_invoice_items (
    id VARCHAR(50) PRIMARY KEY,
    invoice_id VARCHAR(50) REFERENCES tax_invoices(id) ON DELETE CASCADE,
    product_code VARCHAR(255) NOT NULL,
    mtl_type VARCHAR(50) NOT NULL,
    pieces INT NOT NULL DEFAULT 1,
    purity DECIMAL(15, 7) NOT NULL,
    gross_qty DECIMAL(15, 3) NOT NULL,
    pure_qty DECIMAL(15, 7) NOT NULL,
    mkg_rate DECIMAL(15, 5) NOT NULL,
    mkg_amt DECIMAL(15, 2) NOT NULL,
    mtl_amt DECIMAL(15, 2) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    tax_amt DECIMAL(15, 2) NOT NULL,
    net_amt DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 20. Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE, -- NULL means Global
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, name)
);

-- 21. Product Subcategories
CREATE TABLE IF NOT EXISTS product_subcategories (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE, -- NULL means Global
    category_id VARCHAR(50) REFERENCES product_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, name)
);

-- 22. Products
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE, -- NULL means Global
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id VARCHAR(50) REFERENCES product_categories(id) ON DELETE RESTRICT,
    subcategory_id VARCHAR(50) REFERENCES product_subcategories(id) ON DELETE RESTRICT,
    metal_type VARCHAR(50) NOT NULL,
    purity DECIMAL(15, 7) NOT NULL,
    weight DECIMAL(15, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    brand VARCHAR(255),
    origin VARCHAR(255),
    buy_premium DECIMAL(15, 2) DEFAULT 0.00,
    sell_premium DECIMAL(15, 2) DEFAULT 0.00,
    making_charge DECIMAL(15, 2) DEFAULT 0.00,
    vat_percent DECIMAL(5, 2) DEFAULT 0.00,
    inventory_type VARCHAR(50) NOT NULL,
    redeemable BOOLEAN NOT NULL DEFAULT FALSE,
    hedging_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, sku)
);

-- Branch daily close (Transaction Beta — day session / Z-report)
CREATE TABLE IF NOT EXISTS branch_day_closes (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    business_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ,
    closed_by VARCHAR(255),
    opening_snapshot JSONB NOT NULL DEFAULT '{}',
    closing_snapshot JSONB,
    UNIQUE(branch_id, business_date)
);

CREATE INDEX IF NOT EXISTS idx_branch_day_closes_branch_date ON branch_day_closes(branch_id, business_date DESC);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS business_date DATE;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS entered_by VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS entered_by_name VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS entered_by_user_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_transactions_branch_business_date ON transactions(branch_id, business_date);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);

-- Physical buy/sell extended fields
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS txn_id VARCHAR(50);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(15, 2);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS product_id VARCHAR(50) REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS item VARCHAR(255);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS purity DECIMAL(15, 7);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS touch_loss DECIMAL(15, 4) DEFAULT 0;
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS actual_purity DECIMAL(15, 2);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS market_usd DECIMAL(15, 4);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS deal DECIMAL(15, 2);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS idr_amount DECIMAL(15, 2);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS usd_amount DECIMAL(15, 2);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS aed_amount DECIMAL(15, 2);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS total_weight DECIMAL(15, 2);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS tlt_idr_value DECIMAL(15, 2);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS tlt_aed_value DECIMAL(15, 2);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS total_usdt DECIMAL(15, 4);

ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS txn_id VARCHAR(50);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(15, 2);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS narration TEXT;
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS purity DECIMAL(15, 7);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS touch_loss DECIMAL(15, 4) DEFAULT 0;
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS actual_purity DECIMAL(15, 2);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS market_usd DECIMAL(15, 4);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS deal DECIMAL(15, 2);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS idr_amount DECIMAL(15, 2);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS usd_amount DECIMAL(15, 2);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS aed_amount DECIMAL(15, 2);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS total_weight DECIMAL(15, 2);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS tlt_idr_value DECIMAL(15, 2);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS tlt_aed_value DECIMAL(15, 2);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS total_usdt DECIMAL(15, 4);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS cost_value DECIMAL(15, 2);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS margin DECIMAL(15, 4);

-- USDT module
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

-- Branch staff page permissions (RBAC)
CREATE TABLE IF NOT EXISTS user_page_permissions (
    user_id VARCHAR(128) NOT NULL,
    branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    page_id VARCHAR(50) NOT NULL,
    access_level VARCHAR(10) NOT NULL DEFAULT 'none' CHECK (access_level IN ('none', 'read', 'write')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    PRIMARY KEY (user_id, branch_id, page_id)
);

CREATE INDEX IF NOT EXISTS idx_user_page_permissions_branch ON user_page_permissions(branch_id);

-- =========================================================================
-- IC Transfer Module (Optimized & Relational)
-- =========================================================================

CREATE TABLE IF NOT EXISTS ic_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ic_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    commission NUMERIC(10, 2),
    region_id UUID REFERENCES ic_regions(id) ON DELETE SET NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ic_suppliers_region ON ic_suppliers(region_id);

CREATE TABLE IF NOT EXISTS ic_warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    commission NUMERIC(10, 2),
    region_id UUID REFERENCES ic_regions(id) ON DELETE SET NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ic_warehouses_region ON ic_warehouses(region_id);

CREATE TABLE IF NOT EXISTS ic_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buy_rate NUMERIC(15, 4) NOT NULL,
    sale_rate NUMERIC(15, 4) NOT NULL,
    sar_conversion NUMERIC(15, 4) NOT NULL,
    inr_conversion NUMERIC(15, 4) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ic_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES ic_suppliers(id) ON DELETE SET NULL,
    location_id UUID REFERENCES ic_regions(id) ON DELETE SET NULL,
    warehouse_id UUID REFERENCES ic_warehouses(id) ON DELETE SET NULL,
    unit_rate NUMERIC(15, 4) NOT NULL,
    units NUMERIC(15, 4) NOT NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    inr_total NUMERIC(15, 4),
    aed_total NUMERIC(15, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ic_purchases_supplier ON ic_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ic_purchases_warehouse ON ic_purchases(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_ic_purchases_location ON ic_purchases(location_id);
CREATE INDEX IF NOT EXISTS idx_ic_purchases_created ON ic_purchases(created_at);

CREATE TABLE IF NOT EXISTS ic_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    entered_by VARCHAR(255), -- Signed-in user (branch user)
    entered_by_name VARCHAR(255),
    entered_by_user_id VARCHAR(255),
    location_id UUID REFERENCES ic_regions(id) ON DELETE SET NULL,
    units NUMERIC(15, 4) NOT NULL,
    unit_rate NUMERIC(15, 4) NOT NULL,
    address TEXT,
    payment_mode VARCHAR(50),
    inr_amount NUMERIC(15, 4),
    aed_amount NUMERIC(15, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ic_sales_user ON ic_sales(entered_by_user_id);
CREATE INDEX IF NOT EXISTS idx_ic_sales_location ON ic_sales(location_id);
CREATE INDEX IF NOT EXISTS idx_ic_sales_created ON ic_sales(created_at);

CREATE TABLE IF NOT EXISTS ic_warehouse_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES ic_warehouses(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    units NUMERIC(15, 4) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ic_warehouse_tx_warehouse ON ic_warehouse_transactions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_ic_warehouse_tx_created ON ic_warehouse_transactions(created_at);
