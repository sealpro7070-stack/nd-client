/**
 * session-manager.js — Manages Playwright browser sessions for silent AINS login
 * Launches a headless browser, performs the full Microsoft login flow server-side,
 * waits for MFA approval, then captures and returns the AINS session tokens + cookies.
 */

const { chromium } = require('playwright')

const sessions = {} // { userId: { browser, context, page } }

const AINS_URL = 'https://ains.moe.gov.my'
const MFA_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes for user to approve MFA

/**
 * Launch a headless Chromium browser with anti-bot masking
 */
async function createSession(userId) {
  console.log(`[session] Creating session for user ${userId}`)

  if (sessions[userId]) {
    await destroySession(userId).catch(() => {})
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-ipc-flooding-protection',
    ],
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'ms-MY',
    timezoneId: 'Asia/Kuala_Lumpur',
    extraHTTPHeaders: { 'Accept-Language': 'ms-MY,ms;q=0.9,en-US;q=0.8,en;q=0.7' },
  })

  const page = await context.newPage()

  // Thorough automation masking — prevents Microsoft bot detection
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
    Object.defineProperty(navigator, 'languages', { get: () => ['ms-MY', 'ms', 'en-US', 'en'] })
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' })
    window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} }
    const originalQuery = window.navigator.permissions.query
    window.navigator.permissions.query = (params) =>
      params.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(params)
  })

  sessions[userId] = { browser, context, page }
  return sessions[userId]
}

/**
 * Get an existing session
 */
function getSession(userId) {
  return sessions[userId] || null
}

/**
 * Destroy a session and close the browser
 */
async function destroySession(userId) {
  const session = sessions[userId]
  if (!session) return

  try {
    await session.browser.close().catch(() => {})
  } catch {}

  delete sessions[userId]
  console.log(`[session] Destroyed session for ${userId}`)
}

/**
 * Get all cookies from the context
 */
async function getCookies(userId) {
  const session = getSession(userId)
  if (!session) throw new Error('Session not found')
  return session.context.cookies()
}

/**
 * Perform the full silent Microsoft login flow for AINS.
 * Types credentials server-side, waits for MFA approval, returns session data.
 *
 * @param {string} userId
 * @param {string} email
 * @param {string} password
 * @param {function} onStatus - called with 'waiting_mfa' once password is submitted
 * @returns {{ ssToken, ssUser, ssProfile, cookies }}
 */
async function performLogin(userId, email, password, onStatus) {
  await createSession(userId)
  const { page } = sessions[userId]

  try {
    console.log(`[login] Navigating to AINS for user ${userId}`)
    await page.goto(AINS_URL, { waitUntil: 'networkidle', timeout: 30000 })

    // Wait for Microsoft login page
    await page.waitForURL(/login\.microsoftonline\.com|login\.microsoft\.com/, { timeout: 15000 })
    console.log(`[login] On Microsoft login page`)

    // Type email
    await page.locator('input[type="email"], #i0116').first().fill(email)
    await page.locator('input[type="submit"], #idSIButton9').first().click()

    // Wait for password field
    await page.waitForSelector('#i0118, input[type="password"]', { timeout: 10000 })
    await page.locator('#i0118, input[type="password"]').first().fill(password)

    // Click sign in
    await page.locator('input[type="submit"], #idSIButton9').first().click()
    console.log(`[login] Credentials submitted, waiting for MFA`)

    if (onStatus) onStatus('waiting_mfa')

    // Wait for MFA approval — URL leaves Microsoft login pages
    await page.waitForURL(
      (url) => !url.includes('login.microsoftonline.com') && !url.includes('login.microsoft.com'),
      { timeout: MFA_TIMEOUT_MS }
    )
    console.log(`[login] MFA approved, now on: ${page.url()}`)

    // Wait for AINS Vue app to set jb-app-token in sessionStorage
    await page.waitForFunction(
      () => sessionStorage.getItem('jb-app-token') !== null,
      { timeout: 8000 }
    ).catch(() => {
      console.warn('[login] Timed out waiting for jb-app-token — capturing whatever is available')
    })

    const storageKeys = await page.evaluate(() => ({
      ss: Object.keys(sessionStorage),
      ls: Object.keys(localStorage),
    })).catch(() => ({ ss: [], ls: [] }))
    console.log('[login] Storage keys after login:', JSON.stringify(storageKeys))

    const getAny = (key) => page.evaluate(
      (k) => sessionStorage.getItem(k) || localStorage.getItem(k), key
    ).catch(() => null)

    const [ssToken, ssUser, ssProfile] = await Promise.all([
      getAny('jb-app-token'),
      getAny('jb-app-user'),
      getAny('jb-app-profile'),
    ])

    const cookies = await getCookies(userId)
    console.log(`[login] Session captured: ssToken=${!!ssToken}, ssUser=${!!ssUser}, cookies=${cookies.length}`)

    await destroySession(userId)
    return { ssToken, ssUser, ssProfile, cookies }
  } catch (err) {
    await destroySession(userId).catch(() => {})
    throw err
  }
}

module.exports = {
  createSession,
  getSession,
  destroySession,
  getCookies,
  performLogin,
}
