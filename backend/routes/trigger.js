const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { startBot } = require('../bot/bot')

// POST /api/trigger
// Body: { userId } OR { userIdentifier: email }
router.post('/', async (req, res) => {
  console.log('[trigger] Received request:', JSON.stringify(req.body).substring(0, 100))
  let { userId, count } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  // Quick pre-checks before launching browser
  const { data: user } = await supabase.from('users').select('is_active, ains_username_encrypted, email').eq('id', userId).single()
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (!user.is_active) return res.status(403).json({ error: 'Account not activated. Please subscribe.' })
  if (!user.ains_username_encrypted) return res.status(400).json({ error: 'No AINS credentials saved. Enter them on the dashboard first.' })

  // Respond immediately — bot runs async in background
  const countNum = count ? parseInt(count) : null
  res.json({ success: true, message: `Bot started — submitting ${countNum ?? 'scheduled'} book(s). Check history in a few minutes.` })

  startBot(userId, null, null, null, null, countNum).catch(err => console.error('[trigger] Bot error:', err.message))
})

module.exports = router
