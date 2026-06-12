const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:A9F1awg62x5os4t8lPBC@aibak-global-production.cc5ayciaofbl.us-east-1.rds.amazonaws.com:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    
    console.log('Running physical_sells migration...');
    try {
        await client.query("ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS particulars TEXT DEFAULT ''");
        await client.query("ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS gross_weight DECIMAL(15, 2) NOT NULL DEFAULT 0");
        await client.query("ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS pure_conversion DECIMAL(15, 4) NOT NULL DEFAULT 1");
        await client.query("ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS pure_gram DECIMAL(15, 2) NOT NULL DEFAULT 0");
        await client.query("ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS idr_gram DECIMAL(15, 2) NOT NULL DEFAULT 0");
        await client.query("ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS idr_to_usdt DECIMAL(15, 2) NOT NULL DEFAULT 0");
        await physical_sells_migration(client);
    } catch(e) {
        console.error(e);
    }
    await client.end();
}

async function physical_sells_migration(client) {
    await client.query("ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS idr_rate DECIMAL(15, 4) NOT NULL DEFAULT 0");
    await client.query("ALTER TABLE physical_sells ADD COLUMN IF NOT EXISTS total DECIMAL(15, 2) NOT NULL DEFAULT 0");
    await client.query("UPDATE physical_sells SET pure_gram = sell_weight WHERE pure_gram = 0");
    await client.query("ALTER TABLE physical_sells DROP COLUMN IF EXISTS sell_weight");
    console.log('Migration complete');
}

main();
