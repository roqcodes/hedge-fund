const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:A9F1awg62x5os4t8lPBC@hedge-fund-db.cc5ayciaofbl.us-east-1.rds.amazonaws.com:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    
    try {
        const schemaRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        console.log("USERS SCHEMA:");
        console.table(schemaRes.rows);

        const dataRes = await client.query('SELECT * FROM users LIMIT 10;');
        console.log("\nUSERS DATA:");
        console.table(dataRes.rows);
    } catch (e) {
        console.error("Error querying users table:", e.message);
    }

    await client.end();
}
main();
