const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { encrypt } = require('../lib/crypto')

// POST /api/auth/save-credentials
// Body: { userId, username, password }
router.post('/save-credentials', async (req, res) => {
  const { userId, username, password } = req.body

  if (!userId || !username || !password) {
    return res.status(400).json({ error: 'userId, username and password are required' })
  }

  try {
    const usernameEncrypted = encrypt(username)
    const passwordEncrypted = encrypt(password)

    const { error } = await supabase
      .from('users')
      .update({
        ains_username_encrypted: usernameEncrypted,
        ains_password_encrypted: passwordEncrypted,
        ains_creds_updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) return res.status(500).json({ error: error.message })

    res.json({ success: true, message: 'AINS credentials saved securely' })
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
