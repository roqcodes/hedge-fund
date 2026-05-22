-- HEDGE Capital Management Database Initialization
-- Resets all tables and seeds ONLY branches and HQ balance

-- 1. Resetting database
TRUNCATE TABLE 
  hq_balance, 
  branches, 
  transactions, 
  expenses, 
  invoices, 
  notifications, 
  investor_deposits, 
  deal_investors, 
  deals, 
  investors 
CASCADE;

-- 2. Initialize HQ Treasury Balance
INSERT INTO hq_balance (id, amount) VALUES (1, 50000000.00) ON CONFLICT (id) DO NOTHING;

-- 3. Seeding Branches
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR001', 'AEROCITY', 'Delhi, India', 'Group Treasury', 12500000, 0, 12500000, 12350000, 12500000, 150000, 'active', '2026-05-03T10:00:00+04:00', '2024-01-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR002', 'BLUESHINE', 'Dubai, UAE', 'Group Treasury', 0, 2250, 2250, 2223, 2250, 27, 'active', '2026-05-03T10:00:00+04:00', '2024-02-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR003', 'BAB AL TAWASEL', 'Dubai, UAE', 'Group Treasury', 6000000, 1000, 6001000, 5928988, 6001000, 72012, 'active', '2026-05-03T10:00:00+04:00', '2024-03-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR004', 'DELHI - AS IC', 'Delhi, India', 'Group Treasury', 2700000, 0, 2700000, 2667600, 2700000, 32400, 'active', '2026-05-03T10:00:00+04:00', '2024-04-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR005', 'RAHMATHULLH GROUP', 'Dubai, UAE', 'Group Treasury', 0, 0, 0, 0, 0, 0, 'inactive', '2026-04-15T09:00:00+04:00', '2024-05-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR006', 'BAHRAIN - IC', 'Manama, Bahrain', 'Group Treasury', 578592, 0, 578592, 571649, 578592, 6943, 'active', '2026-05-03T10:00:00+04:00', '2024-06-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR007', 'MADANI', 'Dubai, UAE', 'Group Treasury', 0, 0, 0, 0, 0, 0, 'inactive', '2026-04-15T09:00:00+04:00', '2024-07-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR008', 'MADANI GROUP FEB MGMNT FEE REC', 'Dubai, UAE', 'Group Treasury', 0, 0, 0, 0, 0, 0, 'inactive', '2026-04-15T09:00:00+04:00', '2024-08-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR009', 'BAHRAIN - COMPANY', 'Manama, Bahrain', 'Group Treasury', 289017, 0, 289017, 285549, 289017, 3468, 'active', '2026-05-03T10:00:00+04:00', '2024-09-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR010', 'JEDA- COMPANY', 'Jeddah, Saudi Arabia', 'Group Treasury', 874306, 0, 874306, 863814, 874306, 10492, 'active', '2026-05-03T10:00:00+04:00', '2024-10-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR011', 'AL NOOR BH', 'Manama, Bahrain', 'Group Treasury', 150000, 0, 150000, 148200, 150000, 1800, 'active', '2026-05-03T10:00:00+04:00', '2024-11-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR012', 'RESTUARENT', 'Dubai, UAE', 'Group Treasury', 290000, 0, 290000, 286520, 290000, 3480, 'active', '2026-05-03T10:00:00+04:00', '2024-12-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR013', 'UGANDA', 'Kampala, Uganda', 'Group Treasury', 1218750, 0, 1218750, 1204125, 1218750, 14625, 'active', '2026-05-03T10:00:00+04:00', '2024-01-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR014', 'MAALI', 'Dubai, UAE', 'Group Treasury', 2480098, 0, 2480098, 2450337, 2480098, 29761, 'active', '2026-05-03T10:00:00+04:00', '2024-02-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR015', 'TANZANIA', 'Dar es Salaam, Tanzania', 'Group Treasury', 4000000, 0, 4000000, 3952000, 4000000, 48000, 'active', '2026-05-03T10:00:00+04:00', '2024-03-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR016', 'TANZ WORK SHOP CAPITAL', 'Dar es Salaam, Tanzania', 'Group Treasury', 35433, 0, 35433, 35008, 35433, 425, 'active', '2026-05-03T10:00:00+04:00', '2024-04-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR017', 'RAWANDA GROUP 1', 'Kigali, Rwanda', 'Group Treasury', 14410, 0, 14410, 14237, 14410, 173, 'active', '2026-05-03T10:00:00+04:00', '2024-05-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR018', 'RAWANDA 2 (25 K $)', 'Kigali, Rwanda', 'Group Treasury', 91750, 0, 91750, 90649, 91750, 1101, 'active', '2026-05-03T10:00:00+04:00', '2024-06-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR019', 'ABU YASIN GROUP', 'Dubai, UAE', 'Group Treasury', 360000, 0, 360000, 355680, 360000, 4320, 'active', '2026-05-03T10:00:00+04:00', '2024-07-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR020', 'ABU YASIN GROUP MGMNT FEE', 'Dubai, UAE', 'Group Treasury', 0, 0, 0, 0, 0, 0, 'inactive', '2026-04-15T09:00:00+04:00', '2024-08-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR021', 'MAADA', 'Dubai, UAE', 'Group Treasury', 706189, 0, 706189, 697715, 706189, 8474, 'active', '2026-05-03T10:00:00+04:00', '2024-09-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR022', 'MAADA NEW COMPANY GROUP', 'Dubai, UAE', 'Group Treasury', 250000, 0, 250000, 247000, 250000, 3000, 'active', '2026-05-03T10:00:00+04:00', '2024-10-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR023', 'BANGKOK CAPITAL', 'Bangkok, Thailand', 'Group Treasury', 76880, 0, 76880, 75957, 76880, 923, 'active', '2026-05-03T10:00:00+04:00', '2024-11-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR024', 'MUMBAI IC SRK', 'Mumbai, India', 'Group Treasury', 0, 0, 0, 0, 0, 0, 'inactive', '2026-04-15T09:00:00+04:00', '2024-12-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR025', 'SUPER CHAIN', 'Dubai, UAE', 'Group Treasury', 0, 0, 0, 0, 0, 0, 'inactive', '2026-04-15T09:00:00+04:00', '2024-01-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR026', 'BACK OFFICE', 'Dubai, UAE — HQ', 'Group Treasury', 0, 2547.91, 2547.91, 2516.91, 2547.91, 31, 'active', '2026-05-03T10:00:00+04:00', '2024-02-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR027', 'DIAMOND 30 % (120 K )', 'Dubai, UAE', 'Group Treasury', 120000, 0, 120000, 118560, 120000, 1440, 'active', '2026-05-03T10:00:00+04:00', '2024-03-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR028', 'RAHMATHULLH GROUP — OPS', 'Dubai, UAE', 'Group Treasury', 120000, 0, 120000, 118560, 120000, 1440, 'active', '2026-05-03T10:00:00+04:00', '2024-04-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR029', 'TRUCK CAPITAL', 'Dubai, UAE', 'Group Treasury', 50000, 0, 50000, 49400, 50000, 600, 'active', '2026-05-03T10:00:00+04:00', '2024-05-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR030', 'SPORT GROUP', 'Dubai, UAE', 'Group Treasury', 0, 0, 0, 0, 0, 0, 'inactive', '2026-04-15T09:00:00+04:00', '2024-06-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR031', 'BANKOK GROUP NEW', 'Bangkok, Thailand', 'Group Treasury', 210000, 0, 210000, 207480, 210000, 2520, 'active', '2026-05-03T10:00:00+04:00', '2024-07-01T09:00:00+04:00');
INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('BR032', 'PORTUGAL WORK 5191', 'Lisbon, Portugal', 'Group Treasury', 75207, 0, 75207, 74305, 75207, 902, 'active', '2026-05-03T10:00:00+04:00', '2024-08-01T09:00:00+04:00');
