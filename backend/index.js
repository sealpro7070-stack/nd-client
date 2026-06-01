require('dotenv').config()
console.log('[BOOT] ENV CHECK — SUPABASE_URL:', process.env.SUPABASE_URL || '(MISSING)')
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
const referralsRoutes = require('./routes/referrals')

// Start cron scheduler (commented out until SMTP is configured)
// require('./scheduler/cron')

const app = express()
const PORT = process.env.PORT || 3001

// Global crash handlers — log but do NOT exit in production.
// Exiting on every unhandled promise makes the server trivial to DoS.
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err)
})

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'https://nilamdesk.com',
  'https://www.nilamdesk.com',
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
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  res.status(501).json({ error: 'Webhook not yet configured. Set LEMONSQUEEZY_WEBHOOK_SECRET to enable.' })
})
// 8mb covers base64 receipt uploads (route caps receipt_data at ~6M chars)
app.use(express.json({ limit: '8mb' }))

// Health check (rate-limited to prevent abuse)
const healthLimiter = new Map()
app.get('/health', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress
  const now = Date.now()
  const entry = healthLimiter.get(ip)
  if (entry && entry.resetAt > now && entry.count > 30) {
    return res.status(429).json({ error: 'Too many requests' })
  }
  if (!entry || entry.resetAt < now) {
    healthLimiter.set(ip, { count: 1, resetAt: now + 60000 })
  } else {
    entry.count++
  }
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
// Each router authenticates per-route via requireAuth. Routes that require an
// ACTIVE (paid) account enforce is_active themselves where it matters
// (e.g. trigger.js, family.js, bot.js). We deliberately do NOT gate every route
// behind a global "active" check: free-tier users are is_active=false yet must
// still reach /api/settings and /api/payments (to configure and to upgrade).
app.use('/api/auth', authRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/trigger', triggerRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/family', familyRoutes)
app.use('/api/referrals', referralsRoutes)

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

const server = app.listen(PORT, () => {
  console.log(`Nilam Auto backend running on port ${PORT}`)
})

// Connection-level timeouts: mitigate Slowloris and idle-connection DoS
server.timeout = 30000           // 30s socket timeout
server.keepAliveTimeout = 5000   // 5s keep-alive
server.headersTimeout = 35000    // must be > keepAliveTimeout
server.maxConnections = 200      // hard cap on concurrent connections
