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

  const countNum = count ? parseInt(count) : null

  // Wait up to 3 minutes for bot to complete. If it takes longer, respond mid-flight.
  let responded = false
  const respond = (payload) => {
    if (!responded) { responded = true; res.json(payload) }
  }

  // Timeout after 170s — Railway's limit is ~180s
  const timeout = setTimeout(() => {
    respond({ success: true, message: `Submitting ${countNum ?? 'scheduled'} book(s) in the background. Check History in a few minutes.` })
  }, 170000)

  try {
    const result = await startBot(userId, null, null, null, null, countNum)
    clearTimeout(timeout)
    if (result?.success === false && result?.reason === 'login_failed') {
      respond({ success: false, error: 'AINS login failed. Your IC number or DELIMa password is incorrect. Update them in Settings.' })
    } else if (result?.skipped) {
      respond({ success: true, message: `Already submitted this month's quota. Nothing to do!` })
    } else {
      const done = result?.results?.filter(r => r.status === 'success').length ?? 0
      const total = result?.results?.length ?? countNum ?? '?'
      respond({ success: true, message: `Done! ${done}/${total} book(s) submitted. Check History for details.` })
    }
  } catch (err) {
    clearTimeout(timeout)
    console.error('[trigger] Bot error:', err.message)
    respond({ success: false, error: err.message })
  }
})

module.exports = router
