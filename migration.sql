-- 1. Drop dead and unused legacy columns
ALTER TABLE deal_transactions 
  DROP COLUMN IF EXISTS y_net,
  DROP COLUMN IF EXISTS srk,
  DROP COLUMN IF EXISTS aibak_profit,
  DROP COLUMN IF EXISTS t_profit;

-- 2. Rename columns to match modern domain logic
ALTER TABLE deal_transactions 
  RENAME COLUMN sales_value_inr TO live_sell_rate;

ALTER TABLE deal_transactions 
  RENAME COLUMN rv_rate TO sell_premium_discount;

ALTER TABLE deal_transactions 
  RENAME COLUMN n_p_per_gr TO net_profit_per_gram;

ALTER TABLE deal_transactions 
  RENAME COLUMN mange TO management_profit;
