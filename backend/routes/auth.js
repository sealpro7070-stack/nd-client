const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { encrypt } = require('../lib/crypto')

// POST /api/auth/save-cookie
// Body: { userIdentifier (email or UUID), cookie }
router.post('/save-cookie', async (req, res) => {
  const { userIdentifier, userId, cookie, ssUser, ssProfile, cookies } = req.body

  // Support both old (userId) and new (userIdentifier) field names
  const identifier = userIdentifier || userId

  if (!identifier || !cookie) {
    return res.status(400).json({ error: 'userIdentifier and cookie are required' })
  }

  try {
    // Store all 3 sessionStorage keys + browser cookies so bot can inject all
    const sessionData = JSON.stringify({ token: cookie, ssUser: ssUser || null, ssProfile: ssProfile || null, cookies: cookies || [] })
    const cookieEncrypted = encrypt(sessionData)

    // Detect if identifier is a UUID or an email
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)

    let query = supabase
      .from('users')
      .update({
        cookie_encrypted: cookieEncrypted,
        cookie_updated_at: new Date().toISOString()
      })

    if (isUUID) {
      query = query.eq('id', identifier)
    } else {
      // Treat as email
      query = query.eq('email', identifier.toLowerCase().trim())
    }

    const { error, count } = await query

    if (error) return res.status(500).json({ error: error.message })

    res.json({ success: true, message: 'Cookie saved securely' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/register
// Body: { id, email, delima_id }
router.post('/register', async (req, res) => {
  const { id, email, delima_id } = req.body

  if (!id || !email) {
    return res.status(400).json({ error: 'id and email are required' })
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({ id, email, delima_id }, { onConflict: 'id' })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    res.json({ success: true, user: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
