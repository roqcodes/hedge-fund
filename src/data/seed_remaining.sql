-- Remaining Seed Data for HEDGE Capital Management

-- 1. Seeding Investors
INSERT INTO investors (id, name, email, phone, nationality, emirates_id, passport_no, address, city, country, cash_deposit, gold_deposit, gold_weight_grams, status, risk_profile, kyc_status, joined_date, last_activity, assigned_branch_id, assigned_branch_name, preferred_contact, notes)
VALUES ('INV001', 'Khalid Al Mansoori', 'k.mansoori@email.ae', '+971 50 123 4567', 'UAE', '784-1985-1234567-1', NULL, 'Villa 12, Al Barsha South', 'Dubai', 'United Arab Emirates', 5500000, 185000, 420, 'active', 'balanced', 'verified', '2023-06-15', '2026-05-03T09:30:00+04:00', 'BR014', 'MAALI', 'whatsapp', 'Long-term partner; prefers quarterly statements.')
ON CONFLICT (id) DO NOTHING;

-- Deposits for Khalid Al Mansoori
INSERT INTO investor_deposits (id, investor_id, date, type, amount, gold_grams, notes)
VALUES ('DEP001', 'INV001', '2026-04-28', 'cash', 500000, NULL, 'Top-up — Q2 allocation')
ON CONFLICT (id) DO NOTHING;
INSERT INTO investor_deposits (id, investor_id, date, type, amount, gold_grams, notes)
VALUES ('DEP002', 'INV001', '2026-03-10', 'gold', 45000, 100, 'Physical gold intake')
ON CONFLICT (id) DO NOTHING;

INSERT INTO investors (id, name, email, phone, nationality, emirates_id, passport_no, address, city, country, cash_deposit, gold_deposit, gold_weight_grams, status, risk_profile, kyc_status, joined_date, last_activity, assigned_branch_id, assigned_branch_name, preferred_contact, notes)
VALUES ('INV002', 'Fatima Al Hashimi', 'fatima.hashimi@corp.ae', '+971 55 987 6543', 'UAE', '784-1990-7654321-2', NULL, 'Tower B, Business Bay', 'Dubai', 'United Arab Emirates', 2800000, 320000, 725, 'active', 'conservative', 'verified', '2024-01-20', '2026-05-02T14:15:00+04:00', 'BR021', 'MAADA', 'email', NULL)
ON CONFLICT (id) DO NOTHING;

-- Deposits for Fatima Al Hashimi
INSERT INTO investor_deposits (id, investor_id, date, type, amount, gold_grams, notes)
VALUES ('DEP003', 'INV002', '2026-05-01', 'gold', 80000, 180, NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO investor_deposits (id, investor_id, date, type, amount, gold_grams, notes)
VALUES ('DEP004', 'INV002', '2026-02-14', 'cash', 1200000, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO investors (id, name, email, phone, nationality, emirates_id, passport_no, address, city, country, cash_deposit, gold_deposit, gold_weight_grams, status, risk_profile, kyc_status, joined_date, last_activity, assigned_branch_id, assigned_branch_name, preferred_contact, notes)
VALUES ('INV003', 'Rajesh Mehta', 'rajesh.mehta@invest.in', '+91 98 7654 3210', 'India', NULL, 'Z1234567', 'Bandra Kurla Complex, Unit 402', 'Mumbai', 'India', 3200000, 0, 0, 'active', 'aggressive', 'verified', '2024-08-05', '2026-05-03T11:00:00+04:00', 'BR001', 'AEROCITY', 'phone', NULL)
ON CONFLICT (id) DO NOTHING;

-- Deposits for Rajesh Mehta
INSERT INTO investor_deposits (id, investor_id, date, type, amount, gold_grams, notes)
VALUES ('DEP005', 'INV003', '2026-04-15', 'cash', 800000, NULL, 'Delhi corridor expansion')
ON CONFLICT (id) DO NOTHING;

INSERT INTO investors (id, name, email, phone, nationality, emirates_id, passport_no, address, city, country, cash_deposit, gold_deposit, gold_weight_grams, status, risk_profile, kyc_status, joined_date, last_activity, assigned_branch_id, assigned_branch_name, preferred_contact, notes)
VALUES ('INV004', 'Hassan Rahmathullah', 'h.rahmathullah@group.ae', '+971 52 444 8899', 'UAE', '784-1978-9988776-3', NULL, 'Deira, Port Saeed Road', 'Dubai', 'United Arab Emirates', 1850000, 95000, 215, 'active', 'balanced', 'verified', '2022-11-30', '2026-04-30T16:45:00+04:00', 'BR028', 'RAHMATHULLH GROUP — OPS', 'whatsapp', 'Family office principal.')
ON CONFLICT (id) DO NOTHING;

-- Deposits for Hassan Rahmathullah
INSERT INTO investor_deposits (id, investor_id, date, type, amount, gold_grams, notes)
VALUES ('DEP006', 'INV004', '2026-01-22', 'cash', 350000, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO investor_deposits (id, investor_id, date, type, amount, gold_grams, notes)
VALUES ('DEP007', 'INV004', '2025-12-05', 'gold', 55000, 125, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO investors (id, name, email, phone, nationality, emirates_id, passport_no, address, city, country, cash_deposit, gold_deposit, gold_weight_grams, status, risk_profile, kyc_status, joined_date, last_activity, assigned_branch_id, assigned_branch_name, preferred_contact, notes)
VALUES ('INV005', 'Sarah Ochieng', 's.ochieng@capital.ug', '+256 712 345 678', 'Uganda', NULL, 'UGA987654', 'Plot 45, Kampala Road', 'Kampala', 'Uganda', 950000, 42000, 95, 'active', 'balanced', 'verified', '2025-02-10', '2026-05-01T08:20:00+04:00', 'BR013', 'UGANDA', 'email', NULL)
ON CONFLICT (id) DO NOTHING;

-- Deposits for Sarah Ochieng
INSERT INTO investor_deposits (id, investor_id, date, type, amount, gold_grams, notes)
VALUES ('DEP008', 'INV005', '2026-03-18', 'cash', 250000, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO investors (id, name, email, phone, nationality, emirates_id, passport_no, address, city, country, cash_deposit, gold_deposit, gold_weight_grams, status, risk_profile, kyc_status, joined_date, last_activity, assigned_branch_id, assigned_branch_name, preferred_contact, notes)
VALUES ('INV006', 'Yusuf Al Jeddawi', 'y.aljeddawi@sa.com', '+966 55 112 2334', 'Saudi Arabia', NULL, 'SA4455667', 'Al Andalus District', 'Jeddah', 'Saudi Arabia', 1200000, 210000, 475, 'active', 'conservative', 'verified', '2024-05-22', '2026-04-29T13:30:00+04:00', 'BR010', 'JEDA- COMPANY', 'phone', NULL)
ON CONFLICT (id) DO NOTHING;

-- Deposits for Yusuf Al Jeddawi
INSERT INTO investor_deposits (id, investor_id, date, type, amount, gold_grams, notes)
VALUES ('DEP009', 'INV006', '2026-04-02', 'gold', 60000, 135, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO investors (id, name, email, phone, nationality, emirates_id, passport_no, address, city, country, cash_deposit, gold_deposit, gold_weight_grams, status, risk_profile, kyc_status, joined_date, last_activity, assigned_branch_id, assigned_branch_name, preferred_contact, notes)
VALUES ('INV007', 'Thomas Berg', 't.berg@portugal.eu', '+351 91 234 5678', 'Portugal', NULL, 'PT7788990', 'Avenida da Liberdade 120', 'Lisbon', 'Portugal', 480000, 0, 0, 'active', 'aggressive', 'verified', '2025-09-01', '2026-04-27T10:00:00+04:00', 'BR032', 'PORTUGAL WORK 5191', 'email', NULL)
ON CONFLICT (id) DO NOTHING;

-- Deposits for Thomas Berg
INSERT INTO investor_deposits (id, investor_id, date, type, amount, gold_grams, notes)
VALUES ('DEP010', 'INV007', '2025-11-12', 'cash', 480000, NULL, 'Initial mandate deposit')
ON CONFLICT (id) DO NOTHING;

INSERT INTO investors (id, name, email, phone, nationality, emirates_id, passport_no, address, city, country, cash_deposit, gold_deposit, gold_weight_grams, status, risk_profile, kyc_status, joined_date, last_activity, assigned_branch_id, assigned_branch_name, preferred_contact, notes)
VALUES ('INV008', 'Priya Sharma', 'priya.sharma@invest.in', '+91 99 8877 6655', 'India', NULL, 'M8877665', 'Andheri East, MIDC', 'Mumbai', 'India', 0, 0, 0, 'pending', 'balanced', 'pending', '2026-04-28', '2026-04-28T15:00:00+04:00', NULL, NULL, 'email', 'KYC documents under review.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO investors (id, name, email, phone, nationality, emirates_id, passport_no, address, city, country, cash_deposit, gold_deposit, gold_weight_grams, status, risk_profile, kyc_status, joined_date, last_activity, assigned_branch_id, assigned_branch_name, preferred_contact, notes)
VALUES ('INV009', 'Abdullah Al Qasimi', 'a.qasimi@family.ae', '+971 56 333 2211', 'UAE', '784-1982-5544332-4', NULL, 'Sharjah, Al Majaz', 'Sharjah', 'United Arab Emirates', 750000, 28000, 62, 'inactive', 'conservative', 'expired', '2021-03-08', '2025-11-20T09:00:00+04:00', 'BR003', 'BAB AL TAWASEL', 'phone', 'Account dormant — KYC renewal required.')
ON CONFLICT (id) DO NOTHING;

-- Deposits for Abdullah Al Qasimi
INSERT INTO investor_deposits (id, investor_id, date, type, amount, gold_grams, notes)
VALUES ('DEP011', 'INV009', '2024-06-01', 'cash', 750000, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. Seeding Deals
INSERT INTO deals (id, name, amount, total_investment, balance, to_branch_id, to_branch_name, status, date)
VALUES ('DL001', 'Real Estate Acquisition - Downtown', 15000000, 7500000, -7500000, 'BR003', 'BAB AL TAWASEL', 'active', '2026-05-01T10:00:00+04:00')
ON CONFLICT (id) DO NOTHING;

-- Deal Investors for Real Estate Acquisition - Downtown
INSERT INTO deal_investors (deal_id, investor_id, investor_name, amount, is_gold)
VALUES ('DL001', 'INV001', 'Khalid Al Mansoori', 5000000, false)
ON CONFLICT (deal_id, investor_id) DO NOTHING;
INSERT INTO deal_investors (deal_id, investor_id, investor_name, amount, is_gold)
VALUES ('DL001', 'INV002', 'Fatima Al Hashimi', 2500000, false)
ON CONFLICT (deal_id, investor_id) DO NOTHING;

INSERT INTO deals (id, name, amount, total_investment, balance, to_branch_id, to_branch_name, status, date)
VALUES ('DL002', 'Tech Startup Seed Funding', 2000000, 2500000, 500000, 'BR001', 'AEROCITY', 'completed', '2026-04-15T14:30:00+04:00')
ON CONFLICT (id) DO NOTHING;

-- Deal Investors for Tech Startup Seed Funding
INSERT INTO deal_investors (deal_id, investor_id, investor_name, amount, is_gold)
VALUES ('DL002', 'INV003', 'Rajesh Mehta', 2500000, false)
ON CONFLICT (deal_id, investor_id) DO NOTHING;

