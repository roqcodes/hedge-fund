/** Lightweight list — no nested buys/payouts/expenses JSON. */
export const SQL_DEAL_TRANSACTIONS_LIST = `
WITH scoped_deals AS (
  SELECT id FROM deals
  WHERE ($1::varchar IS NULL OR managing_branch_id = $1)
    AND (
      $2::boolean = false
      OR cardinality($3::varchar[]) = 0
      OR id = ANY($3::varchar[])
    )
)
SELECT dt.*,
  COALESCE(
    (SELECT COUNT(*)::int FROM deal_transaction_buys b WHERE b.deal_transaction_id = dt.id),
    0
  ) AS buy_count
FROM deal_transactions dt
INNER JOIN scoped_deals sd ON sd.id = dt.deal_id
ORDER BY dt.date DESC
`;

/** Single transaction with full nested details. */
export const SQL_DEAL_TRANSACTION_DETAIL = `
WITH payout_agg AS (
  SELECT deal_transaction_id,
    COALESCE(json_agg(
      json_build_object(
        'id', id,
        'dealTransactionId', deal_transaction_id,
        'investorId', investor_id,
        'investorName', investor_name,
        'payoutAmount', payout_amount,
        'createdAt', created_at
      ) ORDER BY created_at
    ), '[]'::json) AS payouts
  FROM deal_transaction_payouts
  WHERE deal_transaction_id = $1
  GROUP BY deal_transaction_id
),
expense_agg AS (
  SELECT deal_transaction_id,
    COALESCE(json_agg(
      json_build_object(
        'id', id,
        'dealTransactionId', deal_transaction_id,
        'key', key,
        'value', value,
        'timestamp', timestamp,
        'createdAt', created_at
      ) ORDER BY created_at
    ), '[]'::json) AS expenses_details
  FROM deal_transaction_expenses
  WHERE deal_transaction_id = $1
  GROUP BY deal_transaction_id
),
buy_agg AS (
  SELECT deal_transaction_id,
    COALESCE(json_agg(
      json_build_object(
        'id', id,
        'dealTransactionId', deal_transaction_id,
        'txnId', txn_id,
        'date', date,
        'time', time,
        'weight', weight,
        'purity', purity,
        'pureCostAed', pure_cost_aed,
        'currencyAmount', currency_amount,
        'purchaseRate', purchase_rate,
        'createdAt', created_at
      ) ORDER BY created_at ASC
    ), '[]'::json) AS buys
  FROM deal_transaction_buys
  WHERE deal_transaction_id = $1
  GROUP BY deal_transaction_id
)
SELECT dt.*,
  COALESCE(p.payouts, '[]'::json) AS payouts,
  COALESCE(e.expenses_details, '[]'::json) AS expenses_details,
  COALESCE(b.buys, '[]'::json) AS buys
FROM deal_transactions dt
LEFT JOIN payout_agg p ON p.deal_transaction_id = dt.id
LEFT JOIN expense_agg e ON e.deal_transaction_id = dt.id
LEFT JOIN buy_agg b ON b.deal_transaction_id = dt.id
WHERE dt.id = $1
LIMIT 1
`;

/** Optimized deal_transactions load — CTE aggregates instead of per-row correlated subqueries. */
export const SQL_DEAL_TRANSACTIONS_WITH_DETAILS = `
WITH payout_agg AS (
  SELECT deal_transaction_id,
    COALESCE(json_agg(
      json_build_object(
        'id', id,
        'dealTransactionId', deal_transaction_id,
        'investorId', investor_id,
        'investorName', investor_name,
        'payoutAmount', payout_amount,
        'createdAt', created_at
      ) ORDER BY created_at
    ), '[]'::json) AS payouts
  FROM deal_transaction_payouts
  GROUP BY deal_transaction_id
),
expense_agg AS (
  SELECT deal_transaction_id,
    COALESCE(json_agg(
      json_build_object(
        'id', id,
        'dealTransactionId', deal_transaction_id,
        'key', key,
        'value', value,
        'timestamp', timestamp,
        'createdAt', created_at
      ) ORDER BY created_at
    ), '[]'::json) AS expenses_details
  FROM deal_transaction_expenses
  GROUP BY deal_transaction_id
),
buy_agg AS (
  SELECT deal_transaction_id,
    COALESCE(json_agg(
      json_build_object(
        'id', id,
        'dealTransactionId', deal_transaction_id,
        'txnId', txn_id,
        'date', date,
        'time', time,
        'weight', weight,
        'purity', purity,
        'pureCostAed', pure_cost_aed,
        'currencyAmount', currency_amount,
        'purchaseRate', purchase_rate,
        'createdAt', created_at
      ) ORDER BY created_at ASC
    ), '[]'::json) AS buys
  FROM deal_transaction_buys
  GROUP BY deal_transaction_id
),
scoped_deals AS (
  SELECT id FROM deals
  WHERE ($1::varchar IS NULL OR managing_branch_id = $1)
    AND (
      $2::boolean = false
      OR cardinality($3::varchar[]) = 0
      OR id = ANY($3::varchar[])
    )
)
SELECT dt.*,
  COALESCE(p.payouts, '[]'::json) AS payouts,
  COALESCE(e.expenses_details, '[]'::json) AS expenses_details,
  COALESCE(b.buys, '[]'::json) AS buys
FROM deal_transactions dt
INNER JOIN scoped_deals sd ON sd.id = dt.deal_id
LEFT JOIN payout_agg p ON p.deal_transaction_id = dt.id
LEFT JOIN expense_agg e ON e.deal_transaction_id = dt.id
LEFT JOIN buy_agg b ON b.deal_transaction_id = dt.id
ORDER BY dt.date DESC
`;

export const SQL_DEALS_WITH_INVESTORS = `
SELECT
  dl.*,
  COALESCE(
    json_agg(
      json_build_object(
        'investorId', di.investor_id,
        'investorName', di.investor_name,
        'amount', di.amount,
        'isGold', di.is_gold
      )
    ) FILTER (WHERE di.deal_id IS NOT NULL),
    '[]'::json
  ) AS deal_investors_json
FROM deals dl
LEFT JOIN deal_investors di ON di.deal_id = dl.id
WHERE ($1::varchar IS NULL OR dl.managing_branch_id = $1)
  AND (
    $2::boolean = false
    OR cardinality($3::varchar[]) = 0
    OR dl.id = ANY($3::varchar[])
  )
GROUP BY dl.id
ORDER BY dl.date DESC
`;
