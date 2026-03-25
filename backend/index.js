require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const settingsRoutes = require('./routes/settings')
const triggerRoutes = require('./routes/trigger')
const historyRoutes = require('./routes/history')
const adminRoutes = require('./routes/admin')

// Start cron scheduler
require('./scheduler/cron')

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Playwright)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true
}))
app.use(express.json())

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('[error]', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Nilam Auto backend running on port ${PORT}`)
})
