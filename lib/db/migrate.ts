import { config } from "dotenv"
import { Pool } from "pg"

config({ path: ".env.local" })
config({ path: ".env" })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function migrate() {
  console.log("⚡ Applying database migrations...")
  const client = await pool.connect()
  try {
    await client.query(`
      ALTER TABLE receipts 
      ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'purchase';

      ALTER TABLE receipts 
      ADD COLUMN IF NOT EXISTS credit_reason text;

      ALTER TABLE receipts 
      ADD COLUMN IF NOT EXISTS notes text;
    `)
    console.log("✅ Migration applied successfully! (type, credit_reason, notes columns ready)")
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
