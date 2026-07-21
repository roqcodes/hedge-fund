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
    gross_weight DECIMAL(28, 14) NOT NULL,
    pure_conversion DECIMAL(15, 4) NOT NULL,
    pure_gram DECIMAL(28, 14) NOT NULL,
    idr_gram DECIMAL(15, 2) NOT NULL,
    idr_to_usdt DECIMAL(15, 2) NOT NULL,
    idr_rate DECIMAL(28, 14) NOT NULL,
    total DECIMAL(28, 14) NOT NULL,
    buy_value DECIMAL(28, 14) NOT NULL,
    remaining_weight DECIMAL(28, 14) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Physical Sells
CREATE TABLE IF NOT EXISTS physical_sells (
    id VARCHAR(50) PRIMARY KEY,
    buy_id VARCHAR(50) NOT NULL REFERENCES physical_buys(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    particulars TEXT DEFAULT '',
    gross_weight DECIMAL(28, 14) NOT NULL DEFAULT 0,
    pure_conversion DECIMAL(15, 4) NOT NULL DEFAULT 1,
    pure_gram DECIMAL(28, 14) NOT NULL DEFAULT 0,
    idr_gram DECIMAL(15, 2) NOT NULL DEFAULT 0,
    idr_to_usdt DECIMAL(15, 2) NOT NULL DEFAULT 0,
    idr_rate DECIMAL(28, 14) NOT NULL DEFAULT 0,
    total DECIMAL(28, 14) NOT NULL DEFAULT 0,
    sell_value DECIMAL(28, 14) NOT NULL,
    profit DECIMAL(28, 14) NOT NULL,
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
    notes TEXT\r\n);\r\n
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
    cognito_user_id VARCHAR(128) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cognito_user_id VARCHAR(128) UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'AED';
CREATE INDEX IF NOT EXISTS idx_customers_cognito_user_id ON customers(cognito_user_id);

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
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS actual_purity DECIMAL(28, 14);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS market_usd DECIMAL(15, 4);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS deal DECIMAL(28, 14);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS idr_amount DECIMAL(28, 14);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS usd_amount DECIMAL(28, 14);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS aed_amount DECIMAL(28, 14);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS total_weight DECIMAL(28, 14);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS tlt_idr_value DECIMAL(28, 14);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS tlt_aed_value DECIMAL(28, 14);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS total_usdt DECIMAL(28, 14);
ALTER TABLE physical_buys ADD COLUMN IF NOT EXISTS fix_or_unfix VARCHAR(20) DEFAULT 'unfixed';

ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS txn_id VARCHAR(50);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(15, 2);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS narration TEXT;
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS purity DECIMAL(15, 7);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS touch_loss DECIMAL(15, 4) DEFAULT 0;
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS actual_purity DECIMAL(28, 14);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS market_usd DECIMAL(15, 4);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS deal DECIMAL(28, 14);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS idr_amount DECIMAL(28, 14);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS usd_amount DECIMAL(28, 14);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS aed_amount DECIMAL(28, 14);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS total_weight DECIMAL(28, 14);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS tlt_idr_value DECIMAL(28, 14);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS tlt_aed_value DECIMAL(28, 14);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS total_usdt DECIMAL(28, 14);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS cost_value DECIMAL(28, 14);
ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS margin DECIMAL(28, 14);

-- Physical deal drafts (scratchpad only).
-- Fully isolated from physical_buys/physical_sells: drafts never affect
-- balances, customer ledgers/KYC, KPIs or the sellable-stock list. The full
-- draft object is stored as JSONB so the shape can evolve without migrations.
CREATE TABLE IF NOT EXISTS physical_draft_buys (
    draft_id   VARCHAR(64) PRIMARY KEY,
    branch_id  VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    payload    JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_physical_draft_buys_branch ON physical_draft_buys(branch_id);

CREATE TABLE IF NOT EXISTS physical_draft_sells (
    draft_id   VARCHAR(64) PRIMARY KEY,
    branch_id  VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    buy_id     VARCHAR(50) REFERENCES physical_buys(id) ON DELETE CASCADE,
    payload    JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_physical_draft_sells_branch ON physical_draft_sells(branch_id);

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
ALTER TABLE ic_suppliers ADD COLUMN IF NOT EXISTS branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_ic_suppliers_branch ON ic_suppliers(branch_id);

CREATE TABLE IF NOT EXISTS ic_warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    commission NUMERIC(10, 2),
    region_id UUID REFERENCES ic_regions(id) ON DELETE SET NULL,
    email VARCHAR(255),
    address TEXT,
    current_stock NUMERIC(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ic_warehouses_region ON ic_warehouses(region_id);

ALTER TABLE ic_warehouses ADD COLUMN IF NOT EXISTS current_stock NUMERIC(15, 4) NOT NULL DEFAULT 0;
ALTER TABLE ic_warehouses ADD COLUMN IF NOT EXISTS send_delivery_proof_to_customer BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE ic_warehouses ADD COLUMN IF NOT EXISTS branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_ic_warehouses_branch ON ic_warehouses(branch_id);

CREATE TABLE IF NOT EXISTS ic_rate_groups (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    sale_rate DECIMAL(28, 14) NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(28, 14) NOT NULL DEFAULT 1,
    created_by_branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ic_rate_groups ADD COLUMN IF NOT EXISTS created_by_branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ic_rate_groups_created_by_branch ON ic_rate_groups(created_by_branch_id);
ALTER TABLE ic_rate_groups ADD COLUMN IF NOT EXISTS pricing_config JSONB DEFAULT NULL;
ALTER TABLE ic_rate_groups ALTER COLUMN sale_rate TYPE NUMERIC(28, 14);
ALTER TABLE ic_rate_groups ALTER COLUMN conversion_rate TYPE NUMERIC(28, 14);

CREATE TABLE IF NOT EXISTS ic_rate_group_customers (
    group_id VARCHAR(50) REFERENCES ic_rate_groups(id) ON DELETE CASCADE,
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, customer_id)
);

CREATE TABLE IF NOT EXISTS ic_rate_group_branches (
    group_id VARCHAR(50) REFERENCES ic_rate_groups(id) ON DELETE CASCADE,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, branch_id)
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
    converted_total NUMERIC(15, 4),
    aed_total NUMERIC(15, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ic_purchases_supplier ON ic_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ic_purchases_warehouse ON ic_purchases(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_ic_purchases_location ON ic_purchases(location_id);
CREATE INDEX IF NOT EXISTS idx_ic_purchases_created ON ic_purchases(created_at);

ALTER TABLE ic_purchases ADD COLUMN IF NOT EXISTS converted_total NUMERIC(15, 4);
ALTER TABLE ic_purchases ADD COLUMN IF NOT EXISTS aed_total NUMERIC(15, 4);

CREATE TABLE IF NOT EXISTS ic_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    order_customer_name VARCHAR(255),
    order_customer_id VARCHAR(255),
    entered_by VARCHAR(255),
    entered_by_name VARCHAR(255),
    entered_by_user_id VARCHAR(255),
    warehouse_id UUID REFERENCES ic_warehouses(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50), -- transfer | cdm | by_hand | nre
    units NUMERIC(15, 4) NOT NULL,
    unit_rate NUMERIC(15, 4) NOT NULL,
    converted_amount NUMERIC(15, 4),
    aed_amount NUMERIC(15, 4),
    bank TEXT,
    address TEXT,
    location TEXT,
    district TEXT,
    image_url TEXT,
    conversion_rate NUMERIC(15, 6) DEFAULT 1.0,
    currency VARCHAR(10) DEFAULT 'AED',
    service_charge NUMERIC(15, 4) DEFAULT 0.00,
    collected_units NUMERIC(15, 4) DEFAULT 0.00,
    priority VARCHAR(20) DEFAULT 'Normal' CHECK (priority IN ('High', 'Normal', 'Low')),
    payment_status VARCHAR(20) DEFAULT 'pending',
    order_status VARCHAR(30) DEFAULT 'pending',
    rejection_remarks TEXT,
    status_updated_at TIMESTAMP WITH TIME ZONE,
    status_updated_by VARCHAR(255),
    delivery_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ic_sales_user ON ic_sales(entered_by_user_id);
CREATE INDEX IF NOT EXISTS idx_ic_sales_warehouse ON ic_sales(warehouse_id);
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

-- =========================================================================
-- Warehouse Portal & Delivery Module
-- =========================================================================

CREATE TABLE IF NOT EXISTS ic_warehouse_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES ic_warehouses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ic_warehouse_groups_warehouse ON ic_warehouse_groups(warehouse_id);

CREATE TABLE IF NOT EXISTS ic_delivery_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES ic_warehouses(id) ON DELETE CASCADE,
    account_id VARCHAR(50) UNIQUE NOT NULL, -- e.g. USER0006
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    region_id UUID REFERENCES ic_regions(id) ON DELETE SET NULL,
    group_id UUID REFERENCES ic_warehouse_groups(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ic_delivery_agents_warehouse ON ic_delivery_agents(warehouse_id);

-- Idempotent column adds for databases created before consolidated ic_sales definition
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS delivery_agent_id UUID REFERENCES ic_delivery_agents(id) ON DELETE SET NULL;
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS collected_units NUMERIC(15, 4) DEFAULT 0.00;
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Normal';
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS order_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS rejection_remarks TEXT;
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS status_updated_by VARCHAR(255);
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS delivery_image_url TEXT;
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS derived_from_sale_id UUID REFERENCES ic_sales(id) ON DELETE SET NULL;
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS service_charge NUMERIC(15, 4) DEFAULT 0.00;
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS bank TEXT;
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC(15, 6) DEFAULT 1.0;
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'AED';
-- End-customer selected by the branch manager (customer_name still holds the owning branch for association/filtering)
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS order_customer_name VARCHAR(255);
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS order_customer_id VARCHAR(255);
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS fulfillment_handler VARCHAR(20) NOT NULL DEFAULT 'hq_admin';
ALTER TABLE ic_sales DROP CONSTRAINT IF EXISTS ic_sales_fulfillment_handler_check;
ALTER TABLE ic_sales ADD CONSTRAINT ic_sales_fulfillment_handler_check
  CHECK (fulfillment_handler IN ('hq_admin', 'branch'));
CREATE INDEX IF NOT EXISTS idx_ic_sales_fulfillment_handler ON ic_sales(fulfillment_handler);
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS admin_unit_rate NUMERIC(15, 6);
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS admin_conversion_rate NUMERIC(15, 6);

-- Sub-customers: third-party recipients scoped to a portal customer (no login)
CREATE TABLE IF NOT EXISTS ic_sub_customers (
    id VARCHAR(50) PRIMARY KEY,
    parent_customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ic_sub_customers_parent ON ic_sub_customers(parent_customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ic_sub_customers_parent_name ON ic_sub_customers(parent_customer_id, LOWER(name));

ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS sub_customer_id VARCHAR(50) REFERENCES ic_sub_customers(id) ON DELETE SET NULL;
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS sub_customer_name VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_ic_sales_sub_customer ON ic_sales(sub_customer_id);
CREATE INDEX IF NOT EXISTS idx_ic_sales_order_customer ON ic_sales(order_customer_id);

-- Drop legacy constraint if present, then apply expanded order_status check
ALTER TABLE ic_sales DROP CONSTRAINT IF EXISTS ic_sales_order_status_check;
ALTER TABLE ic_sales ADD CONSTRAINT ic_sales_order_status_check
  CHECK (order_status IN (
    'pending_branch_review', 'branch_rejected',
    'pending', 'accepted', 'admin_rejected', 'wh_rejected',
    'wh_processing', 'da_rejected', 'delivery_pending_admin',
    'cancellation_pending', 'cancelled', 'completed'
  ));

ALTER TABLE ic_sales DROP CONSTRAINT IF EXISTS ic_sales_payment_status_check;
ALTER TABLE ic_sales ADD CONSTRAINT ic_sales_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'partial'));

ALTER TABLE ic_sales DROP CONSTRAINT IF EXISTS ic_sales_priority_check;
ALTER TABLE ic_sales ADD CONSTRAINT ic_sales_priority_check
  CHECK (priority IN ('High', 'Normal', 'Low'));

-- Backfill workflow + units from legacy delivery_status / collected_amount (if still present)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ic_sales' AND column_name = 'delivery_status'
  ) THEN
    UPDATE ic_sales SET order_status = 'completed'
      WHERE order_status = 'pending' AND delivery_status IN ('Completed', 'Partial');

    UPDATE ic_sales SET order_status = 'wh_processing'
      WHERE order_status = 'pending' AND delivery_agent_id IS NOT NULL;

    UPDATE ic_sales SET order_status = 'accepted'
      WHERE order_status = 'pending' AND warehouse_id IS NOT NULL AND delivery_agent_id IS NULL;

    UPDATE ic_sales SET collected_units = units
      WHERE order_status = 'completed' AND COALESCE(collected_units, 0) = 0
        AND delivery_status IN ('Completed', 'Partial');
  END IF;
END $$;

UPDATE ic_sales SET collected_units = units
  WHERE order_status = 'completed' AND COALESCE(collected_units, 0) = 0;

-- Drop redundant / legacy columns and orphan index
DROP INDEX IF EXISTS idx_ic_sales_location;
ALTER TABLE ic_sales DROP COLUMN IF EXISTS location_id;
ALTER TABLE ic_sales DROP CONSTRAINT IF EXISTS ic_sales_delivery_status_check;
ALTER TABLE ic_sales DROP COLUMN IF EXISTS delivery_status;
ALTER TABLE ic_sales DROP COLUMN IF EXISTS collected_amount;

CREATE INDEX IF NOT EXISTS idx_ic_sales_derived_from ON ic_sales(derived_from_sale_id);

-- Idempotent adjustments for database hardening
ALTER TABLE ic_sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Make sure critical columns cannot be NULL
ALTER TABLE ic_sales ALTER COLUMN order_status SET NOT NULL;
ALTER TABLE ic_sales ALTER COLUMN payment_status SET NOT NULL;
ALTER TABLE ic_sales ALTER COLUMN priority SET NOT NULL;

-- Missing indexes for query performance optimization
CREATE INDEX IF NOT EXISTS idx_ic_sales_order_status ON ic_sales(order_status);
CREATE INDEX IF NOT EXISTS idx_ic_sales_customer_name_lower ON ic_sales(LOWER(customer_name));
CREATE INDEX IF NOT EXISTS idx_ic_sales_delivery_agent ON ic_sales(delivery_agent_id);

-- Ensure warehouse stock cannot go negative
ALTER TABLE ic_warehouses DROP CONSTRAINT IF EXISTS ic_warehouses_stock_nonnegative;
ALTER TABLE ic_warehouses ADD CONSTRAINT ic_warehouses_stock_nonnegative CHECK (current_stock >= 0);

-- Bulk Sells Module
CREATE TABLE IF NOT EXISTS physical_bulk_sells (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    particulars TEXT DEFAULT '',
    gross_weight DECIMAL(28, 14) NOT NULL DEFAULT 0,
    pure_conversion DECIMAL(15, 4) NOT NULL DEFAULT 1,
    pure_gram DECIMAL(28, 14) NOT NULL DEFAULT 0,
    idr_gram DECIMAL(15, 2) NOT NULL DEFAULT 0,
    idr_to_usdt DECIMAL(15, 2) NOT NULL DEFAULT 0,
    idr_rate DECIMAL(28, 14) NOT NULL DEFAULT 0,
    total DECIMAL(28, 14) NOT NULL DEFAULT 0,
    sell_value DECIMAL(28, 14) NOT NULL,
    profit DECIMAL(28, 14) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    txn_id VARCHAR(50),
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    opening_balance DECIMAL(15, 2),
    narration TEXT,
    notes TEXT,
    payment_mode VARCHAR(30),
    idr_amount DECIMAL(28, 14),
    usd_amount DECIMAL(28, 14),
    aed_amount DECIMAL(28, 14),
    total_weight DECIMAL(28, 14),
    tlt_idr_value DECIMAL(28, 14),
    tlt_aed_value DECIMAL(28, 14),
    total_usdt DECIMAL(28, 14)
);

ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS bulk_sell_id VARCHAR(50) REFERENCES physical_bulk_sells(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_physical_sells_bulk_sell ON physical_sells(bulk_sell_id);

-- Fund Entity Settlement Ledger (AR/AP)
CREATE TABLE IF NOT EXISTS fund_entity_ledger (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    entry_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL DEFAULT '',
    debit DECIMAL(15, 2) NOT NULL DEFAULT 0,
    credit DECIMAL(15, 2) NOT NULL DEFAULT 0,
    reference_type VARCHAR(30),
    reference_id VARCHAR(50),
    customer_currency VARCHAR(10),
    customer_currency_rate DECIMAL(15, 6),
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

-- Branch USDT Capital (working capital in USDT)
CREATE TABLE IF NOT EXISTS branch_usdt_balances (
    branch_id VARCHAR(50) PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
    initial_capital DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    available_fund DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE branch_usdt_balances ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE branch_usdt_balances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;


