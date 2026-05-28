require('dotenv').config()
require('express-async-errors')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')

const authRoutes     = require('./routes/auth')
const settingsRoutes = require('./routes/settings')
const triggerRoutes  = require('./routes/trigger')
const historyRoutes  = require('./routes/history')
const adminRoutes    = require('./routes/admin')
const paymentsRoutes = require('./routes/payments')
const familyRoutes   = require('./routes/family')

// Start cron scheduler (commented out until SMTP is configured)
// require('./scheduler/cron')

const app = express()
const PORT = process.env.PORT || 3001

// Global crash handlers — log then exit so Railway can restart cleanly
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason)
  process.exit(1)
})
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err)
  process.exit(1)
})

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'https://nilamdesk.vercel.app',
  'https://nilam-auto.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean)

app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))
// Webhook route MUST come before global JSON parser so raw body is preserved
app.use('/api/payments/webhook', paymentsRoutes)

app.use(express.json({ limit: '10mb' }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/trigger', triggerRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/family', familyRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('[error]', err)
  res.status(500).json({ error: 'Internal server error' })
})

// SIGTERM handler: clean up Playwright browsers before exit
const { sessions } = require('./lib/session-manager')
process.on('SIGTERM', async () => {
  console.log('[SIGTERM] Cleaning up sessions...')
  for (const [key, session] of Object.entries(sessions || {})) {
    try { await session?.browser?.close() } catch {}
  }
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`Nilam Auto backend running on port ${PORT}`)
})
