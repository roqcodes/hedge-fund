import fs from 'fs';
import path from 'path';
import { branches } from '../data/mockData';

function generateSql() {
  let sql = `-- HEDGE Capital Management Database Initialization\n`;
  sql += `-- Resets all tables and seeds ONLY branches and HQ balance\n\n`;

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

  // 3. Seed Branches
  sql += `-- 3. Seeding Branches\n`;
  for (const b of branches) {
    sql += `INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
VALUES ('${b.id}', '${b.name.replace(/'/g, "''")}', '${b.location.replace(/'/g, "''")}', '${b.managerName.replace(/'/g, "''")}', ${b.cashBalance}, ${b.goldBalance}, ${b.currentBalance}, ${b.openingBalance}, ${b.closingBalance}, ${b.dailyPL}, '${b.status}', '${b.lastActivity}', '${b.createdAt}');\n`;
  }

  const outputPath = path.resolve(process.cwd(), 'src/data/seed_branches_only.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log(`Successfully generated SQL file at: ${outputPath}`);
}

generateSql();
