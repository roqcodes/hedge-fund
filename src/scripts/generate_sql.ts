import fs from 'fs';
import path from 'path';

function generateSql() {
  let sql = `-- HEDGE Capital Management Database Initialization\n`;
  sql += `-- Resets all tables and seeds ONLY HQ balance\n\n`;

  // 1. Truncate all tables
  sql += `-- 1. Resetting database\n`;
  sql += `TRUNCATE TABLE \n`;
  sql += `  hq_balance, \n`;
  sql += `  branches, \n`;
  sql += `  transactions, \n`;
  sql += `  expenses, \n`;
  sql += `  invoices, \n`;
  sql += `  notifications, \n`;
  sql += `  investor_deposits, \n`;
  sql += `  deal_investors, \n`;
  sql += `  deals, \n`;
  sql += `  investors \n`;
  sql += `CASCADE;\n\n`;

  // 2. Initialize HQ Balance
  sql += `-- 2. Initialize HQ Treasury Balance\n`;
  sql += `INSERT INTO hq_balance (id, amount) VALUES (1, 50000000.00) ON CONFLICT (id) DO NOTHING;\n\n`;

  const outputPath = path.resolve(process.cwd(), 'src/data/seed_branches_only.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log(`Successfully generated SQL file at: ${outputPath}`);
}

generateSql();
