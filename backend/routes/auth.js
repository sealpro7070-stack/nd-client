const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { encrypt, decrypt } = require('../lib/crypto')
const sm = require('../lib/session-manager')

// POST /api/auth/start-login-session
// Initiates interactive AINS login (browser session for user to log in themselves)
router.post('/start-login-session', async (req, res) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    await sm.createSession(userId)
    await sm.navigate(userId, 'https://ains.moe.gov.my')
    const screenshot = await sm.getScreenshot(userId)
    const url = sm.getUrl(userId)
    res.json({ success: true, screenshot, url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/get-screenshot
// Returns current screenshot of AINS login page
router.get('/get-screenshot', async (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    const screenshot = await sm.getScreenshot(userId)
    const url = sm.getUrl(userId)
    res.json({ screenshot, url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/send-input
// Body: { userId, type: 'click' | 'type' | 'key', target?: selector, text?: input text, key?: key name }
router.post('/send-input', async (req, res) => {
  const { userId, type, target, text, key } = req.body
  if (!userId || !type) return res.status(400).json({ error: 'userId and type required' })

  try {
    if (type === 'click') {
      if (!target) return res.status(400).json({ error: 'target selector required for click' })
      await sm.click(userId, target)
    } else if (type === 'type') {
      if (!text) return res.status(400).json({ error: 'text required for type' })
      await sm.type(userId, text)
    } else if (type === 'key') {
      if (!key) return res.status(400).json({ error: 'key required for key press' })
      await sm.pressKey(userId, key)
    } else {
      return res.status(400).json({ error: `unknown input type: ${type}` })
    }

    const screenshot = await sm.getScreenshot(userId)
    const url = sm.getUrl(userId)
    res.json({ success: true, screenshot, url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/check-login-status
// Checks if user has successfully logged in, captures and saves cookies if done
router.get('/check-login-status', async (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    const url = sm.getUrl(userId)
    const pageText = await sm.getPageText(userId)

    // Check login success: on dashboard (ains.moe.gov.my) and no login page
    const onAins = url.includes('ains.moe.gov.my')
    const onLoginPage = /Log masuk dengan akaun DELIMa|Sign in with DELIMa|login\.microsoft/i.test(pageText)
    const hasError = /No Authorization|Tiada Kebenaran|password.*incorrect|account.*not.*exist/i.test(pageText)
    const isLoggedIn = onAins && !onLoginPage && !hasError

    if (isLoggedIn) {
      // Capture cookies
      const cookies = await sm.getCookies(userId)
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      if (cookieString) {
        // Encrypt and save
        const encrypted = encrypt(cookieString)
        const { error } = await supabase
          .from('users')
          .update({
            ains_cookie_encrypted: encrypted,
            ains_creds_updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (error) {
          console.error('[auth] Failed to save cookie:', error.message)
          return res.status(500).json({ error: `Failed to save credentials: ${error.message}` })
        }

        // Clean up session
        await sm.destroySession(userId)

        return res.json({ success: true, loggedIn: true, message: 'AINS login captured and saved!' })
      }
    }

    // Still waiting or error
    const screenshot = await sm.getScreenshot(userId)
    res.json({
      loggedIn: false,
      message: isLoggedIn ? 'Login detected, saving...' : hasError ? 'Login error detected' : 'Waiting for login...',
      screenshot,
      url,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/cancel-login-session
// Cancel the interactive login session
router.post('/cancel-login-session', async (req, res) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    await sm.destroySession(userId)
    res.json({ success: true })
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
