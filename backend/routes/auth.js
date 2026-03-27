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
    if (type === 'clickAt') {
      const { x, y } = req.body
      if (x == null || y == null) return res.status(400).json({ error: 'x and y required for clickAt' })
      await sm.clickAt(userId, x, y)
      // Wait for page to respond to click before screenshot
      await new Promise(r => setTimeout(r, 500))
    } else if (type === 'click') {
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
    let url = ''
    try { url = sm.getUrl(userId) } catch { /* ok */ }
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
    const session = sm.getSession(userId)
    if (!session) {
      return res.json({ loggedIn: false, sessionLost: true, message: 'Session expired or not started. Please tap Restart to try again.' })
    }

    let url = ''
    try { url = sm.getUrl(userId) || '' } catch { /* session gone */ }
    const pageText = await sm.getPageText(userId).catch(() => '')

    // Check login success: on dashboard (ains.moe.gov.my) and no login page
    const onAins = url.includes('ains.moe.gov.my')
    const onLoginPage = /Log masuk dengan akaun DELIMa|Sign in with DELIMa|login\.microsoft/i.test(pageText)
    const hasError = /No Authorization|Tiada Kebenaran|password.*incorrect|account.*not.*exist/i.test(pageText)
    const sessionLostOnPage = /session.*lost|sesi.*tamat|your session.*expired|something went wrong.*sign.*in again/i.test(pageText)
    const isLoggedIn = onAins && !onLoginPage && !hasError

    if (isLoggedIn) {
      const cookies = await sm.getCookies(userId)
      if (cookies && cookies.length > 0) {
        // Wait for AINS Vue app to finish initializing sessionStorage after OAuth redirect
        const sessionObj = sm.getSession(userId)
        await sessionObj.page.waitForFunction(
          () => sessionStorage.getItem('jb-app-token') !== null,
          { timeout: 8000 }
        ).catch(() => {
          console.warn('[auth] Timed out waiting for jb-app-token — capturing whatever is available')
        })

        // Dump all storage keys to help debug missing keys
        const storageKeys = await sessionObj.page.evaluate(() => ({
          ss: Object.keys(sessionStorage),
          ls: Object.keys(localStorage),
        })).catch(() => ({ ss: [], ls: [] }))
        console.log('[auth] Storage keys after login:', JSON.stringify(storageKeys))

        // Try sessionStorage first, fall back to localStorage
        const getAny = (key) => sessionObj.page.evaluate(
          (k) => sessionStorage.getItem(k) || localStorage.getItem(k), key
        ).catch(() => null)

        const [ssToken, ssUser, ssProfile] = await Promise.all([
          getAny('jb-app-token'),
          getAny('jb-app-user'),
          getAny('jb-app-profile'),
        ])

        console.log(`[auth] Session captured: ssToken=${!!ssToken}, ssUser=${!!ssUser}, cookies=${cookies.length}`)

        // One AINS per account: extract AINS user identifier from ssUser and check uniqueness
        if (ssUser) {
          try {
            const parsed = JSON.parse(ssUser)
            const ainsId = parsed?.id || parsed?.userId || parsed?.username || parsed?.ic || null
            if (ainsId) {
              const crypto = require('crypto')
              const hash = crypto.createHash('sha256').update(String(ainsId)).digest('hex')

              const { data: conflict } = await supabase
                .from('users')
                .select('id')
                .eq('ains_user_id_hash', hash)
                .neq('id', userId)
                .single()

              if (conflict) {
                await sm.destroySession(userId)
                return res.status(409).json({ error: 'This AINS account is already connected to another Nilam Auto account.' })
              }

              // Save the hash for future uniqueness checks (ignore if column doesn't exist yet)
              await supabase.from('users').update({ ains_user_id_hash: hash }).eq('id', userId).catch(() => {})
            }
          } catch (e) {
            console.warn('[auth] Could not parse ssUser for uniqueness check:', e.message)
          }
        }

        // Save full session data as JSON — preserving domain info and sessionStorage values
        const sessionData = JSON.stringify({
          ssToken,
          ssUser,
          ssProfile,
          cookies: cookies.map(c => ({
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path || '/',
            httpOnly: c.httpOnly || false,
            secure: c.secure || false,
            sameSite: c.sameSite === 'no_restriction' ? 'None'
                    : c.sameSite === 'lax'            ? 'Lax'
                    : c.sameSite === 'strict'          ? 'Strict'
                    : 'Lax',
            expires: c.expirationDate || -1,
          }))
        })

        const encrypted = encrypt(sessionData)
        const { error } = await supabase
          .from('users')
          .update({ ains_cookie_encrypted: encrypted })
          .eq('id', userId)

        if (error) {
          console.error('[auth] Failed to save session:', error.message)
          return res.status(500).json({ error: `Failed to save credentials: ${error.message}` })
        }

        await sm.destroySession(userId)
        return res.json({ success: true, loggedIn: true, message: 'AINS login captured and saved!' })
      }
    }

    // Still waiting or error
    if (sessionLostOnPage) {
      await sm.destroySession(userId).catch(() => {})
      return res.json({ loggedIn: false, sessionLost: true, message: 'Session lost. Tap "Restart" to try again.' })
    }

    let screenshot = null
    try { screenshot = await sm.getScreenshot(userId) } catch { /* session gone */ }
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
