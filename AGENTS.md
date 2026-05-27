<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:db-migration-rules -->
# Database Migrations — AWS RDS (PostgreSQL)

The database is an **AWS RDS PostgreSQL** instance. The connection string lives in `.env` under `DATABASE_URL`.

## Running migrations / DDL

Always use the `psql` CLI with the full connection URL from `.env`. The canonical command is:

```powershell
psql "postgresql://postgres:A9F1awg62x5os4t8lPBC@hedge-fund-db.cc5ayciaofbl.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require" -c "<SQL STATEMENT HERE>"
```

For multi-statement scripts (e.g. a migration file):

```powershell
psql "postgresql://postgres:A9F1awg62x5os4t8lPBC@hedge-fund-db.cc5ayciaofbl.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require" -f path/to/migration.sql
```

**Rules for agents:**
- Never hardcode a DATABASE_URL in source code — always read it from `process.env.DATABASE_URL` via `src/lib/env.ts`.
- Always add `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` guards so migrations are idempotent.
- Schema source of truth lives in `src/data/schema.sql` — keep it in sync with every DDL change.
<!-- END:db-migration-rules -->
