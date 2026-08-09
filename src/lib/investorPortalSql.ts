/** Deals where the investor participates — only their own stake in deal_investors_json. */

export const SQL_INVESTOR_DEALS = `

SELECT

  dl.*,

  di.amount AS my_investment_amount,

  di.is_gold AS my_is_gold,

  COALESCE(

    json_agg(

      json_build_object(

        'investorId', di.investor_id,

        'investorName', di.investor_name,

        'amount', di.amount,

        'isGold', di.is_gold

      )

    ) FILTER (WHERE di.investor_id = $1),

    '[]'::json

  ) AS deal_investors_json

FROM deals dl

INNER JOIN deal_investors di ON di.deal_id = dl.id AND di.investor_id = $1

WHERE ($2::varchar IS NULL OR dl.managing_branch_id = $2 OR dl.managing_branch_id IS NULL)

GROUP BY dl.id, di.amount, di.is_gold

ORDER BY dl.date DESC

`;



/** Deal transactions for investor's groups — branch-scoped, own payout only. */

export const SQL_INVESTOR_DEAL_TRANSACTIONS = `

WITH my_deals AS (

  SELECT di.deal_id

  FROM deal_investors di

  INNER JOIN deals d ON d.id = di.deal_id

  WHERE di.investor_id = $1

    AND ($2::varchar IS NULL OR d.managing_branch_id = $2 OR d.managing_branch_id IS NULL)

)

SELECT dt.id, dt.date, dt.time, dt.deal_id, dt.deal_number, dt.weight, dt.rate,

  dt.pure_cost_aed, dt.currency_amount, dt.purchase_rate, dt.conversion_rate,

  dt.avg_purity, dt.live_sell_rate, dt.sell_premium_discount, dt.sales_aed,

  dt.expenses, dt.gross_profit, dt.net_profit_per_gram, dt.management_profit,

  dt.fix_or_unfix, dt.margin_deposit, dt.premium_discount,

  COALESCE(

    (SELECT COUNT(*)::int FROM deal_transaction_buys b WHERE b.deal_transaction_id = dt.id),

    0

  ) AS buy_count,

  COALESCE(

    (SELECT payout_amount FROM deal_transaction_payouts p

     WHERE p.deal_transaction_id = dt.id AND p.investor_id = $1

     LIMIT 1),

    0

  ) AS my_payout_amount

FROM deal_transactions dt

INNER JOIN my_deals md ON md.deal_id = dt.deal_id

ORDER BY dt.date DESC

`;



/** Single transaction detail for investor — buys + only their payout; access-gated. */

export const SQL_INVESTOR_DEAL_TRANSACTION_DETAIL = `

WITH access AS (

  SELECT dt.id, dt.deal_id

  FROM deal_transactions dt

  INNER JOIN deal_investors di ON di.deal_id = dt.deal_id AND di.investor_id = $2

  WHERE dt.id = $1

),

buy_agg AS (

  SELECT b.deal_transaction_id,

    COALESCE(json_agg(

      json_build_object(

        'id', b.id,

        'dealTransactionId', b.deal_transaction_id,

        'txnId', b.txn_id,

        'date', b.date,

        'time', b.time,

        'weight', b.weight,

        'purity', b.purity,

        'pureCostAed', b.pure_cost_aed,

        'currencyAmount', b.currency_amount,

        'purchaseRate', b.purchase_rate,

        'createdAt', b.created_at

      ) ORDER BY b.created_at ASC

    ), '[]'::json) AS buys

  FROM deal_transaction_buys b

  INNER JOIN access a ON a.id = b.deal_transaction_id

  GROUP BY b.deal_transaction_id

),

my_payout AS (

  SELECT p.deal_transaction_id,

    COALESCE(json_agg(

      json_build_object(

        'id', p.id,

        'dealTransactionId', p.deal_transaction_id,

        'investorId', p.investor_id,

        'investorName', p.investor_name,

        'payoutAmount', p.payout_amount,

        'createdAt', p.created_at

      )

    ), '[]'::json) AS payouts

  FROM deal_transaction_payouts p

  INNER JOIN access a ON a.id = p.deal_transaction_id

  WHERE p.investor_id = $2

  GROUP BY p.deal_transaction_id

)

SELECT dt.id, dt.date, dt.time, dt.deal_id, dt.deal_number, dt.weight, dt.rate,

  dt.pure_cost_aed, dt.currency_amount, dt.purchase_rate, dt.conversion_rate,

  dt.avg_purity, dt.live_sell_rate, dt.sell_premium_discount, dt.sales_aed,

  dt.expenses, dt.gross_profit, dt.net_profit_per_gram, dt.management_profit,

  dt.fix_or_unfix, dt.margin_deposit, dt.premium_discount,

  COALESCE(mp.payouts, '[]'::json) AS payouts,

  '[]'::json AS expenses_details,

  COALESCE(b.buys, '[]'::json) AS buys,

  COALESCE(

    (SELECT payout_amount FROM deal_transaction_payouts p

     WHERE p.deal_transaction_id = dt.id AND p.investor_id = $2

     LIMIT 1),

    0

  ) AS my_payout_amount

FROM deal_transactions dt

INNER JOIN access a ON a.id = dt.id

LEFT JOIN buy_agg b ON b.deal_transaction_id = dt.id

LEFT JOIN my_payout mp ON mp.deal_transaction_id = dt.id

LIMIT 1

`;

