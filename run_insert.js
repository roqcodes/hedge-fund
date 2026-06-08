const { Client } = require('pg');
const fs = require('fs');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:A9F1awg62x5os4t8lPBC@hedge-fund-db.cc5ayciaofbl.us-east-1.rds.amazonaws.com:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    const sql = fs.readFileSync('insert_investors.sql', 'utf8');

    try {
        await client.query(sql);
        console.log('Successfully inserted investors');
    } catch (err) {
        console.error('Error inserting investors:', err);
    } finally {
        await client.end();
    }
}

main();
