-- Void support for IC Fund vouchers (audit trail; balances exclude voided rows)

ALTER TABLE ic_fund_vouchers
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

ALTER TABLE ic_fund_vouchers
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

ALTER TABLE ic_fund_vouchers
  ADD COLUMN IF NOT EXISTS voided_by_name VARCHAR(255);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ic_fund_vouchers_status_check'
  ) THEN
    ALTER TABLE ic_fund_vouchers
      ADD CONSTRAINT ic_fund_vouchers_status_check
      CHECK (status IN ('active', 'void'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ic_fund_vouchers_branch_status_date
  ON ic_fund_vouchers (branch_id, status, voucher_date DESC);
