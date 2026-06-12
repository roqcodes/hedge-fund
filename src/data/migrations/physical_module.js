const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
    const rawUrl = process.env.DATABASE_URL || '';
    const connectionString = rawUrl.split('?')[0];

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        await client.query(`
            -- 1. Physical Balances
            CREATE TABLE IF NOT EXISTS physical_balances (
                branch_id VARCHAR(50) PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
                initial_capital DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
                initial_volume DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
                available_fund DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
                available_volume DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- 2. Physical Buys
            CREATE TABLE IF NOT EXISTS physical_buys (
                id VARCHAR(50) PRIMARY KEY,
                branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
                date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                particulars TEXT NOT NULL,
                gross_weight DECIMAL(15, 2) NOT NULL,
                pure_conversion DECIMAL(15, 4) NOT NULL,
                pure_gram DECIMAL(15, 2) NOT NULL,
                idr_gram DECIMAL(15, 2) NOT NULL,
                idr_to_usdt DECIMAL(15, 2) NOT NULL,
                idr_rate DECIMAL(15, 4) NOT NULL,
                total DECIMAL(15, 2) NOT NULL,
                buy_value DECIMAL(15, 2) NOT NULL,
                remaining_weight DECIMAL(15, 2) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- 3. Physical Sells
            CREATE TABLE IF NOT EXISTS physical_sells (
                id VARCHAR(50) PRIMARY KEY,
                buy_id VARCHAR(50) NOT NULL REFERENCES physical_buys(id) ON DELETE CASCADE,
                date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                sell_weight DECIMAL(15, 2) NOT NULL,
                sell_value DECIMAL(15, 2) NOT NULL,
                profit DECIMAL(15, 2) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Migration completed successfully.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await client.end();
    }
}
main();
