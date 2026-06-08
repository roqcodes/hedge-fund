<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:db-migration-rules -->
# Database Migrations — AWS RDS (PostgreSQL)

The database is an **AWS RDS PostgreSQL** instance. The connection string lives in `.env` under `DATABASE_URL`.

## Running migrations / DDL

1. **Attempt psql first**: Try using the `psql` CLI:
   ```powershell
   psql "postgresql://postgres:A9F1awg62x5os4t8lPBC@hedge-fund-db.cc5ayciaofbl.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require" -c "<SQL>"
   ```

2. **Fallback to Node `pg` script**: If `psql` is not recognized, write a temporary Node.js script. 
   **CRITICAL**: You MUST remove `?sslmode=require` from the connection string in the script, and pass `ssl: { rejectUnauthorized: false }` to the `Client` constructor to avoid self-signed certificate errors.
   
   Example:
   ```javascript
   const { Client } = require('pg');

   async function main() {
       const client = new Client({
           connectionString: 'postgresql://postgres:A9F1awg62x5os4t8lPBC@hedge-fund-db.cc5ayciaofbl.us-east-1.rds.amazonaws.com:5432/postgres',
           ssl: { rejectUnauthorized: false }
       });
       await client.connect();
       
       await client.query("...");
       await client.end();
   }
   main();
   ```

**Rules for agents:**
- Never hardcode a DATABASE_URL in source code — always read it from `process.env.DATABASE_URL` via `src/lib/env.ts`.
- Always add `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` guards so migrations are idempotent.
- Schema source of truth lives in `src/data/schema.sql` — keep it in sync with every DDL change.
<!-- END:db-migration-rules -->
