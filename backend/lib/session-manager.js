/**
 * session-manager.js — Manages Playwright browser sessions for interactive AINS login
 * Sessions are stored in memory per user. Timeout cleanup after 15 minutes of inactivity.
 */

const { chromium } = require('playwright')

const sessions = {} // { userId: { browser, context, page, createdAt, lastActivity } }
const TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes

/**
 * Create a new Playwright session for interactive AINS login
 */
async function createSession(userId) {
  console.log(`[session] Creating session for user ${userId}`)

  // Clean up any existing session
  if (sessions[userId]) {
    await destroySession(userId).catch(() => {})
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'ms-MY',
    timezoneId: 'Asia/Kuala_Lumpur',
  })

  const page = await context.newPage()

  // Mask automation signals
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })

  sessions[userId] = {
    browser,
    context,
    page,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  }

  // Auto-cleanup on timeout
  setTimeout(() => {
    if (sessions[userId] && Date.now() - sessions[userId].lastActivity > TIMEOUT_MS) {
      console.log(`[session] Timeout cleanup for ${userId}`)
      destroySession(userId).catch(() => {})
    }
  }, TIMEOUT_MS + 5000) // Check 5 seconds after timeout

  return sessions[userId]
}

/**
 * Get an existing session, refresh its activity timer
 */
function getSession(userId) {
  const session = sessions[userId]
  if (!session) return null
  session.lastActivity = Date.now()
  return session
}

/**
 * Send a click to the page
 */
async function click(userId, selector) {
  const session = getSession(userId)
  if (!session) throw new Error('Session not found')

  try {
    await session.page.locator(selector).first().click()
    session.lastActivity = Date.now()
  } catch (err) {
    throw new Error(`Click failed: ${err.message}`)
  }
}

/**
 * Send keyboard input to the focused element
 */
async function type(userId, text) {
  const session = getSession(userId)
  if (!session) throw new Error('Session not found')

  try {
    await session.page.keyboard.type(text)
    session.lastActivity = Date.now()
  } catch (err) {
    throw new Error(`Type failed: ${err.message}`)
  }
}

/**
 * Press a key (Enter, Tab, etc.)
 */
async function pressKey(userId, key) {
  const session = getSession(userId)
  if (!session) throw new Error('Session not found')

  try {
    await session.page.keyboard.press(key)
    session.lastActivity = Date.now()
  } catch (err) {
    throw new Error(`Key press failed: ${err.message}`)
  }
}

/**
 * Get current page screenshot as base64 PNG
 */
async function getScreenshot(userId) {
  const session = getSession(userId)
  if (!session) throw new Error('Session not found')

  try {
    const buffer = await session.page.screenshot({ type: 'png' })
    session.lastActivity = Date.now()
    return buffer.toString('base64')
  } catch (err) {
    throw new Error(`Screenshot failed: ${err.message}`)
  }
}

/**
 * Get current page URL
 */
function getUrl(userId) {
  const session = getSession(userId)
  if (!session) throw new Error('Session not found')
  return session.page.url()
}

/**
 * Get page text content for status checking
 */
async function getPageText(userId) {
  const session = getSession(userId)
  if (!session) throw new Error('Session not found')

  try {
    const text = await session.page.textContent('body')
    session.lastActivity = Date.now()
    return text || ''
  } catch {
    return ''
  }
}

/**
 * Navigate to a URL
 */
async function navigate(userId, url) {
  const session = getSession(userId)
  if (!session) throw new Error('Session not found')

  try {
    await session.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    session.lastActivity = Date.now()
  } catch (err) {
    throw new Error(`Navigation failed: ${err.message}`)
  }
}

/**
 * Get all cookies from the context
 */
async function getCookies(userId) {
  const session = getSession(userId)
  if (!session) throw new Error('Session not found')

  try {
    const cookies = await session.context.cookies()
    session.lastActivity = Date.now()
    return cookies
  } catch (err) {
    throw new Error(`Get cookies failed: ${err.message}`)
  }
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

module.exports = {
  createSession,
  getSession,
  click,
  type,
  pressKey,
  getScreenshot,
  getUrl,
  getPageText,
  navigate,
  getCookies,
  destroySession,
}
