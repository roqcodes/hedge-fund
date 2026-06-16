const { Pool } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=')[1].trim();

const pool = new Pool({
  connectionString: env,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const res = await pool.query("SELECT * FROM branches WHERE name ILIKE '%indonesia%'");
  console.log(res.rows[0]);
  process.exit(0);
}

check();
