const { Pool } = require('pg');

const rawUrl = 'postgresql://postgres:A9F1awg62x5os4t8lPBC@hedge-fund-db.cc5ayciaofbl.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require';
const parsedUrl = new URL(rawUrl);
parsedUrl.search = '';
const cleanUrl = parsedUrl.toString();

const pool = new Pool({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const res = await pool.query(
      "UPDATE deal_transactions SET deal_id = 'DLMPJG9CMI' WHERE deal_id IN ('1', '2', '3')"
    );
    console.log('Update completed. Rows updated:', res.rowCount);
  } catch (err) {
    console.error('Error updating:', err);
  } finally {
    await pool.end();
  }
}

main();
