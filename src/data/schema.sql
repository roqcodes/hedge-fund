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
    name VARCHAR(255) UNIQUE NOT NULL,
    location VARCHAR(255) NOT NULL,
    manager_name VARCHAR(255) NOT NULL,
    cash_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    gold_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    closing_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    daily_pl DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
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
    type VARCHAR(50) NOT NULL CHECK (type IN ('transfer', 'expense', 'profit', 'allocation', 'capex', 'opex')),
    status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
    notes TEXT NOT NULL,
    category VARCHAR(100)
);

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
    notes TEXT
);

-- 8. Investor Deposits (History)
CREATE TABLE IF NOT EXISTS investor_deposits (
    id VARCHAR(50) PRIMARY KEY,
    investor_id VARCHAR(50) NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
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
    amount DECIMAL(15, 2) NOT NULL,
    total_investment DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    to_branch_id VARCHAR(50), -- Removed FOREIGN KEY to support custom entities
    to_branch_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed', 'cancelled')),
    total_pl DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    expense DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    manager_share DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Deal Investors (Many-to-Many junction table)
CREATE TABLE IF NOT EXISTS deal_investors (
    deal_id VARCHAR(50) REFERENCES deals(id) ON DELETE CASCADE,
    investor_id VARCHAR(50) REFERENCES investors(id) ON DELETE CASCADE,
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
    live_sell_rate DECIMAL(15, 2) NOT NULL,
    sell_premium_discount DECIMAL(15, 2) NOT NULL,
    sales_aed DECIMAL(15, 2) NOT NULL,
    expenses DECIMAL(15, 2) NOT NULL,
    gross_profit DECIMAL(15, 2) NOT NULL,
    net_profit_per_gram DECIMAL(15, 2) NOT NULL,
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
    key VARCHAR(255) NOT NULL,          -- Expense label, e.g. "Freight", "Customs"
    value DECIMAL(15, 4) NOT NULL,      -- Expense amount in AED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dte_deal_transaction_id ON deal_transaction_expenses(deal_transaction_id);
