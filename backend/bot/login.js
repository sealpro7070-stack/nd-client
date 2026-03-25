/**
 * login.js — Session injection helper
 *
 * How AINS auth works (from app bundle analysis):
 * - jb-app-token = CryptoJS.AES.encrypt(rawJWT, "25QE7gaD88")
 * - Router guard calls validateToken() which checks JWT format (NOT expiry)
 * - So even an expired token passes the guard and reaches the dashboard
 * - When API calls get 401, AINS auto-refreshes via POST ains-api.moe.gov.my/api/token/refresh
 * - That refresh call uses HttpOnly cookies — we must inject those too
 */

const path = require('path')
const AINS_BASE = 'https://ains.moe.gov.my'
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots')

/**
 * @param {import('playwright').BrowserContext} context
 * @param {import('playwright').Page} page
 * @param {string} token - jb-app-token value (CryptoJS encrypted JWT)
 * @param {Array}  cookies - all captured browser cookies (ains.moe.gov.my + ains-api.moe.gov.my)
 * @returns {Promise<boolean>}
 */
async function injectSession(context, page, token, ssUser, ssProfile, cookies = []) {
  console.log(`[login] Token preview: ${token ? token.substring(0, 30) + '...' : 'NULL'}`)
  console.log(`[login] ssUser=${!!ssUser}, ssProfile=${!!ssProfile}, cookies=${cookies.length}`)

  // 1. Inject all browser cookies into the Playwright context BEFORE any navigation
  //    This gives AINS the refresh token cookie so it can auto-renew the expired JWT
  if (cookies.length > 0) {
    const playwrightCookies = cookies.map(c => ({
      name:     c.name,
      value:    c.value,
      domain:   c.domain.startsWith('.') ? c.domain : '.' + c.domain,
      path:     c.path || '/',
      httpOnly: c.httpOnly || false,
      secure:   c.secure || false,
      sameSite: c.sameSite === 'no_restriction' ? 'None'
               : c.sameSite === 'lax'            ? 'Lax'
               : c.sameSite === 'strict'          ? 'Strict'
               : 'Lax',
      expires:  c.expirationDate || -1,
    }))
    try {
      await context.addCookies(playwrightCookies)
      console.log(`[login] Cookies injected OK`)
    } catch (e) {
      console.warn(`[login] Cookie injection warning: ${e.message}`)
    }
  }

  // Log network errors for debugging
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[network] ${res.status()} ${res.url().replace('https://ains-api.moe.gov.my/api', '[api]')}`)
    }
  })

  // 2. Navigate to AINS to establish origin
  await page.goto(AINS_BASE, { waitUntil: 'domcontentloaded', timeout: 30000 })

  // 3. Inject all 3 sessionStorage keys AINS needs to authenticate
  await page.evaluate(([t, u, p]) => {
    sessionStorage.setItem('jb-app-token', t)
    if (u) sessionStorage.setItem('jb-app-user', u)
    if (p) sessionStorage.setItem('jb-app-profile', p)
  }, [token, ssUser, ssProfile])

  const tokenSet = await page.evaluate(() => !!sessionStorage.getItem('jb-app-token'))
  const userSet  = await page.evaluate(() => !!sessionStorage.getItem('jb-app-user'))
  const profSet  = await page.evaluate(() => !!sessionStorage.getItem('jb-app-profile'))
  console.log(`[login] sessionStorage injected: token=${tokenSet}, user=${userSet}, profile=${profSet}`)

  // 4. Navigate to root — this triggers Vue Router guard which reads sessionStorage
  //    (use goto not reload, so router re-evaluates the route)
  await page.goto(AINS_BASE, { waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForTimeout(3000)

  // 5. Debug screenshot
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `debug-login-${Date.now()}.png`), fullPage: true }).catch(() => {})

  // 6. Check login status
  const url = page.url()
  const pageText = await page.textContent('body').catch(() => '')
  const onLoginPage = /Log masuk dengan akaun DELIMa|Sign in with DELIMa/i.test(pageText)
  const hasAuthError = /No Authorization|Tiada Kebenaran/i.test(pageText)
  const isLoggedIn = !onLoginPage && !hasAuthError

  console.log(`[login] URL: ${url}`)
  console.log(`[login] Result: ${isLoggedIn ? 'LOGGED IN' : 'FAILED'} (loginPage=${onLoginPage}, authError=${hasAuthError})`)

  return isLoggedIn
}

module.exports = { injectSession }
