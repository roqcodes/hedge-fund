process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Client } = require('pg');

const DATABASE_URL = "postgresql://postgres:A9F1awg62x5os4t8lPBC@hedge-fund-db.cc5ayciaofbl.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require";

async function dumpSchema() {
  const client = new Client({ 
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    // Get all tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    const tables = tablesRes.rows.map(row => row.table_name);
    
    let schemaDump = "";
    
    for (const table of tables) {
      schemaDump += `\n--- TABLE: ${table} ---\n`;
      
      const columnsRes = await client.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      
      for (const col of columnsRes.rows) {
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const nullable = col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL';
        const defaultValue = col.column_default ? `DEFAULT ${col.column_default}` : '';
        schemaDump += `${col.column_name.padEnd(20)} ${col.data_type}${length} ${nullable} ${defaultValue}\n`;
      }
    }
    
    console.log(schemaDump);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

dumpSchema();
