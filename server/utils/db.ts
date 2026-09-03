import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDb() {
  if (_db) return _db

  const config = useRuntimeConfig()
  
  if (!config.databaseUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Database is not configured',
    })
  }

  const client = postgres(config.databaseUrl, {
    ssl: 'require',
    max: 10,
  })

  _db = drizzle(client, { schema })
  return _db
}

export { schema }
