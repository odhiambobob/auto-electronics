import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Create postgres client
const client = postgres(connectionString, {
  ssl: 'require',
  max: 10,
})

// Create drizzle instance
export const db = drizzle(client, { schema })

// Re-export schema
export * from './schema'
