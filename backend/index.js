require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes     = require('./routes/auth')
const settingsRoutes = require('./routes/settings')
const triggerRoutes  = require('./routes/trigger')
const historyRoutes  = require('./routes/history')
const adminRoutes    = require('./routes/admin')
const paymentsRoutes = require('./routes/payments')
const familyRoutes   = require('./routes/family')

// Start cron scheduler
require('./scheduler/cron')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'https://nilam-auto.vercel.app',
    'https://nilam-auto.vercel.app',
    /\.vercel\.app$/,
    'http://localhost:5173',
    'http://localhost:3000',
  ],
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

app.listen(PORT, () => {
  console.log(`Nilam Auto backend running on port ${PORT}`)
})
