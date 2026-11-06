
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
require('dotenv').config()

const pool = require('./config/db')

const authRoutes = require('./routes/auth.routes')
const transactionRoutes = require('./routes/transaction.routes')
const accountRoutes = require('./routes/account.routes')

const app = express()

// ============================================
// SECURITY MIDDLEWARE
// ============================================

app.use(helmet())

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}))

app.use(express.json({ limit: '10kb' }))

// ============================================
// HEALTH CHECK ROUTES
// ============================================

// Backend health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LedgerLine backend is running',
    timestamp: new Date().toISOString(),
  })
})

// Database health check
app.get('/api/db-health', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT current_database() AS database, NOW() AS database_time'
    )

    res.status(200).json({
      success: true,
      message: 'PostgreSQL connection successful',
      database: result.rows[0].database,
      timestamp: result.rows[0].database_time,
    })
  } catch (error) {
    console.error('Database health check failed:', error.message)

    res.status(503).json({
      success: false,
      message: 'Database connection failed',
    })
  }
})

// ============================================
// API ROUTES
// ============================================

app.use('/api/auth', authRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/accounts', accountRoutes)

// ============================================
// UNKNOWN ROUTES
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  })
})

// ============================================
// START SERVER ONLY WHEN RUN DIRECTLY
// ============================================

if (require.main === module) {
  const PORT = process.env.PORT || 5000

  const server = app.listen(PORT, () => {
    console.log(`LedgerLine backend running on port ${PORT}`)
  })

  // ============================================
  // GRACEFUL SHUTDOWN
  // ============================================

  async function shutdown() {
    console.log('Shutting down LedgerLine backend...')

    server.close(async () => {
      try {
        await pool.end()
        console.log('Database connection pool closed')
        process.exit(0)
      } catch (error) {
        console.error('Shutdown error:', error.message)
        process.exit(1)
      }
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

module.exports = app
