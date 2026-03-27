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

/**
 * loginWithCredentials — Full Playwright login using DELIMa username+password
 */
async function loginWithCredentials(context, page, username, password) {
  console.log(`[login] loginWithCredentials for user: ${username.substring(0, 4)}****`)

  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[network] ${res.status()} ${res.url().replace('https://ains-api.moe.gov.my/api', '[api]')}`)
    }
  })

  // 1. Navigate to AINS
  await page.goto(AINS_BASE, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)
  console.log(`[login] Loaded AINS: ${page.url()}`)

  // 2. Click the DELIMa login button
  const loginBtnSelectors = [
    'text=Log masuk dengan akaun DELIMa',
    'text=DELIMa',
    'a[href*="delima"]',
    'a[href*="login"]',
    'button:has-text("Log masuk")',
  ]
  for (const sel of loginBtnSelectors) {
    try {
      const btn = page.locator(sel).first()
      if (await btn.count() > 0) {
        await btn.click()
        console.log(`[login] Clicked login button via: ${sel}`)
        break
      }
    } catch {}
  }

  // 3. Wait for login form
  await page.waitForTimeout(3000)
  console.log(`[login] After click URL: ${page.url()}`)
  await page.screenshot({ path: require('path').join(SCREENSHOTS_DIR, `creds-form-${Date.now()}.png`), fullPage: true }).catch(() => {})

  // 4. Fill username (try multiple selectors)
  const usernameSelectors = [
    '#username', 'input[name="username"]', 'input[name="ic"]',
    'input[id*="user"]', 'input[placeholder*="IC"]',
    'input[placeholder*="Nombor"]', 'input[type="text"]',
  ]
  for (const sel of usernameSelectors) {
    try {
      const el = page.locator(sel).first()
      if (await el.count() > 0) {
        await el.fill(username)
        console.log(`[login] Filled username via: ${sel}`)
        break
      }
    } catch {}
  }

  // 5. Fill password
  try {
    await page.locator('input[type="password"]').first().fill(password)
    console.log('[login] Filled password')
  } catch {
    console.warn('[login] Could not fill password field')
  }

  await page.waitForTimeout(500)

  // 6. Submit the form
  const submitSelectors = [
    'button[type="submit"]', 'input[type="submit"]',
    'button:has-text("Log masuk")', 'button:has-text("Login")',
    'button:has-text("Sign in")', 'button:has-text("Masuk")',
  ]
  for (const sel of submitSelectors) {
    try {
      const btn = page.locator(sel).first()
      if (await btn.count() > 0) {
        await btn.click()
        console.log(`[login] Submitted via: ${sel}`)
        break
      }
    } catch {}
  }

  // 7. Wait for redirect back to AINS
  try {
    await page.waitForURL(/ains\.moe\.gov\.my/, { timeout: 30000 })
  } catch {
    console.warn('[login] Did not redirect back to ains.moe.gov.my within 30s')
  }
  await page.waitForTimeout(3000)

  await page.screenshot({ path: require('path').join(SCREENSHOTS_DIR, `creds-result-${Date.now()}.png`), fullPage: true }).catch(() => {})

  // 8. Check login status
  const url = page.url()
  const pageText = await page.textContent('body').catch(() => '')
  const onLoginPage = /Log masuk dengan akaun DELIMa|Sign in with DELIMa/i.test(pageText)
  const hasAuthError = /No Authorization|Tiada Kebenaran|kata laluan|password.*incorrect|invalid/i.test(pageText)
  const isLoggedIn = !onLoginPage && !hasAuthError

  console.log(`[login] URL: ${url}`)
  console.log(`[login] Result: ${isLoggedIn ? 'LOGGED IN' : 'FAILED'} (loginPage=${onLoginPage}, authError=${hasAuthError})`)

  return isLoggedIn
}

module.exports = { injectSession, loginWithCredentials }
