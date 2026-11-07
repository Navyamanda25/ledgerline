const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const pool = require('./config/db')

const authRoutes = require('./routes/auth.routes')
const transactionRoutes = require('./routes/transaction.routes')
const accountRoutes = require('./routes/account.routes')
const auditRoutes = require('./routes/audit.routes')

const app = express()

// ============================================
// STARTUP SAFETY CHECK
// ============================================

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required in production.')
  process.exit(1)
}

// Needed on Render/Vercel-style hosting so rate limiting sees real client IPs
app.set('trust proxy', 1)

// ============================================
// SECURITY MIDDLEWARE
// ============================================

app.use(helmet())

const allowedOrigin = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .replace(/\/+$/, '')

app.use(cors({
  origin: allowedOrigin,
}))

app.use(express.json({ limit: '10kb' }))

// General limit: 300 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
})

// Strict limit on login: 20 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
})

app.use('/api', apiLimiter)
app.use('/api/auth/login', loginLimiter)

// ============================================
// HEALTH CHECK ROUTES
// ============================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LedgerLine backend is running',
    timestamp: new Date().toISOString(),
  })
})

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
app.use('/api/audit', auditRoutes)

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
// ERROR HANDLER (bad JSON, unexpected errors)
// ============================================

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
    })
  }

  console.error('Unexpected error:', err.message)

  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server',
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