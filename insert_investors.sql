INSERT INTO investors (id, name, email, phone, nationality, address, city, country, risk_profile, joined_date, preferred_contact) VALUES
('inv-' || gen_random_uuid(), 'AIBAK GROUP', 'aibak@mock.com', '+971500000000', 'UAE', 'Dubai', 'Dubai', 'UAE', 'conservative', CURRENT_DATE, 'email'),
('inv-' || gen_random_uuid(), 'INAM BHAI', 'inam@mock.com', '+971500000001', 'UAE', 'Dubai', 'Dubai', 'UAE', 'conservative', CURRENT_DATE, 'email'),
('inv-' || gen_random_uuid(), 'TANZANIA', 'tanzania@mock.com', '+971500000002', 'UAE', 'Dubai', 'Dubai', 'UAE', 'conservative', CURRENT_DATE, 'email'),
('inv-' || gen_random_uuid(), 'RAHMAN TM', 'rahman@mock.com', '+971500000003', 'UAE', 'Dubai', 'Dubai', 'UAE', 'conservative', CURRENT_DATE, 'email'),
('inv-' || gen_random_uuid(), 'BLUESHINE', 'blueshine@mock.com', '+971500000004', 'UAE', 'Dubai', 'Dubai', 'UAE', 'conservative', CURRENT_DATE, 'email'),
('inv-' || gen_random_uuid(), 'VISHAL', 'vishal@mock.com', '+971500000005', 'UAE', 'Dubai', 'Dubai', 'UAE', 'conservative', CURRENT_DATE, 'email'),
('inv-' || gen_random_uuid(), 'KHALID BHAI', 'khalid@mock.com', '+971500000006', 'UAE', 'Dubai', 'Dubai', 'UAE', 'conservative', CURRENT_DATE, 'email'),
('inv-' || gen_random_uuid(), 'TABREEZ BHAI', 'tabreez@mock.com', '+971500000007', 'UAE', 'Dubai', 'Dubai', 'UAE', 'conservative', CURRENT_DATE, 'email'),
('inv-' || gen_random_uuid(), 'ATM', 'atm@mock.com', '+971500000008', 'UAE', 'Dubai', 'Dubai', 'UAE', 'conservative', CURRENT_DATE, 'email'),
('inv-' || gen_random_uuid(), 'RIYAZ BHAI', 'riyaz@mock.com', '+971500000009', 'UAE', 'Dubai', 'Dubai', 'UAE', 'conservative', CURRENT_DATE, 'email'),
('inv-' || gen_random_uuid(), 'JASIM', 'jasim@mock.com', '+971500000010', 'UAE', 'Dubai', 'Dubai', 'UAE', 'conservative', CURRENT_DATE, 'email'),
('inv-' || gen_random_uuid(), 'SALAMCHA', 'salamcha@mock.com', '+971500000011', 'UAE', 'Dubai', 'Dubai', 'UAE', 'conservative', CURRENT_DATE, 'email'),
('inv-' || gen_random_uuid(), 'ALI BHAI', 'ali@mock.com', '+971500000012', 'UAE', 'Dubai', 'Dubai', 'UAE', 'conservative', CURRENT_DATE, 'email')
ON CONFLICT DO NOTHING;
