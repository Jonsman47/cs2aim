import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the global leaderboard backend.')
}

const shouldUseSsl = process.env.DATABASE_SSL === 'true'

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
})

export const runMigrations = async () => {
  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql')
  const schemaSql = await readFile(schemaPath, 'utf8')
  await pool.query(schemaSql)
}
