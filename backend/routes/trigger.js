const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { startBot } = require('../bot/bot')

// POST /api/trigger
// Body: { userId } OR { userIdentifier: email }
router.post('/', async (req, res) => {
  console.log('[trigger] Received request:', JSON.stringify(req.body).substring(0, 100))
  let { userId, userIdentifier, cookie: directCookie, ssUser: directSsUser, ssProfile: directSsProfile, cookies: directCookies, count } = req.body

  if (!userId && !userIdentifier) {
    return res.status(400).json({ error: 'userId or userIdentifier is required' })
  }

  // Resolve email → userId
  if (!userId && userIdentifier) {
    const { data: found } = await supabase
      .from('users')
      .select('id')
      .eq('email', userIdentifier)
      .single()
    if (!found) return res.status(404).json({ error: 'No Nilam Auto account found for that email.' })
    userId = found.id
  }

  // Quick pre-checks before launching browser
  const { data: user } = await supabase.from('users').select('is_active, cookie_encrypted, email').eq('id', userId).single()
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (!user.is_active) return res.status(403).json({ error: 'Account not activated. Please subscribe.' })
  if (!user.cookie_encrypted && !directCookie) return res.status(400).json({ error: 'No session saved. Use the Chrome extension first.' })

  // Respond immediately — bot runs async in background
  const countNum = count ? parseInt(count) : null
  res.json({ success: true, message: `Bot started — submitting ${countNum ?? 'scheduled'} book(s). Check history in a few minutes.` })

  startBot(userId, directCookie, directSsUser, directSsProfile, directCookies, countNum).catch(err => console.error('[trigger] Bot error:', err.message))
})

module.exports = router
