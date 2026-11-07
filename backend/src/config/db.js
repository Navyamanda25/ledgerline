const { Pool } = require('pg')
require('dotenv').config()

// In the cloud we use one DATABASE_URL (with SSL).
// On your computer we keep using the separate DB_* settings.
const useUrl = Boolean(process.env.DATABASE_URL)

const pool = new Pool(
  useUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
)

pool.options.max = 10
pool.options.idleTimeoutMillis = 30000
pool.options.connectionTimeoutMillis = 5000

// Log unexpected errors from idle database connections
pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL connection error:', error.message)
})

module.exports = pool