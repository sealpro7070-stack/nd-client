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

  // 3. Inject sessionStorage keys — only inject non-null values.
  //    If token is null (Google OAuth captured before Vue set it), skip injecting "null"
  //    so AINS can auto-refresh from its HttpOnly refresh-token cookie instead.
  await page.evaluate(([t, u, p]) => {
    if (t) sessionStorage.setItem('jb-app-token', t)
    if (u) sessionStorage.setItem('jb-app-user', u)
    if (p) sessionStorage.setItem('jb-app-profile', p)
  }, [token, ssUser, ssProfile])

  const tokenSet = await page.evaluate(() => !!sessionStorage.getItem('jb-app-token'))
  console.log(`[login] sessionStorage injected: token=${tokenSet}`)

  // 4. Navigate to root — triggers Vue Router guard which reads sessionStorage.
  //    If no token was injected, AINS will use its refresh cookie to get a fresh one.
  await page.goto(AINS_BASE, { waitUntil: 'networkidle', timeout: 45000 })

  // If token was null, wait up to 10s for AINS to auto-set it via cookie refresh
  if (!token) {
    console.log('[login] No token injected — waiting for AINS to set it via cookie refresh...')
    await page.waitForFunction(
      () => !!sessionStorage.getItem('jb-app-token'),
      { timeout: 10000 }
    ).catch(() => console.warn('[login] AINS did not auto-set token — checking page state anyway'))
  }

  await page.waitForTimeout(2000)

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
 * DELIMa uses Microsoft Azure AD — login.microsoftonline.com
 * Flow: AINS → click "Log masuk" → Microsoft login → username → password → back to AINS
 */
async function loginWithCredentials(context, page, username, password) {
  console.log(`[login] loginWithCredentials for user: ${username.substring(0, 4)}****`)

  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[network] ${res.status()} ${res.url()}`)
    }
  })

  // 1. Navigate to AINS
  await page.goto(AINS_BASE, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)
  console.log(`[login] Loaded AINS: ${page.url()}`)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `step1-ains-${Date.now()}.png`), fullPage: true }).catch(() => {})

  // 2. Click the DELIMa login button
  const loginBtnSelectors = [
    'text=Log masuk dengan akaun DELIMa',
    'text=DELIMa',
    'a[href*="login"]',
    'button:has-text("Log masuk")',
    'button:has-text("Login")',
  ]
  let clicked = false
  for (const sel of loginBtnSelectors) {
    try {
      const btn = page.locator(sel).first()
      if (await btn.count() > 0) {
        await btn.click()
        console.log(`[login] Clicked login button via: ${sel}`)
        clicked = true
        break
      }
    } catch {}
  }
  if (!clicked) console.warn('[login] No login button found on AINS page')

  // 3. Wait for redirect to Microsoft login
  await page.waitForTimeout(4000)
  const urlAfterClick = page.url()
  console.log(`[login] After click URL: ${urlAfterClick}`)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `step2-loginform-${Date.now()}.png`), fullPage: true }).catch(() => {})

  const isMicrosoft = urlAfterClick.includes('login.microsoftonline.com') || urlAfterClick.includes('login.microsoft.com')

  if (isMicrosoft) {
    // ── Microsoft Azure AD login ──────────────────────────────────────────
    console.log('[login] Microsoft login page detected')

    // Step A: Enter username (IC number / DELIMa account)
    try {
      await page.waitForSelector('input[name="loginfmt"]', { timeout: 12000 })
      await page.fill('input[name="loginfmt"]', username)
      console.log('[login] Filled Microsoft username (loginfmt)')
      await page.waitForTimeout(500)
      // "Next" button on Microsoft login
      const nextBtn = page.locator('#idSIButton9, input[type="submit"], button[type="submit"]').first()
      await nextBtn.click()
      console.log('[login] Clicked Next')
    } catch (e) {
      console.warn('[login] Microsoft username step failed:', e.message)
    }

    // Wait for password screen
    await page.waitForTimeout(4000)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `step3-afterusername-${Date.now()}.png`), fullPage: true }).catch(() => {})
    console.log('[login] After username URL:', page.url())

    // Step B: Enter password
    try {
      await page.waitForSelector('input[name="passwd"]', { timeout: 12000 })
      await page.fill('input[name="passwd"]', password)
      console.log('[login] Filled Microsoft password (passwd)')
      await page.waitForTimeout(500)
      // "Sign in" button
      const signInBtn = page.locator('#idSIButton9, input[type="submit"], button[type="submit"]').first()
      await signInBtn.click()
      console.log('[login] Clicked Sign in')
    } catch (e) {
      console.warn('[login] Microsoft password step failed:', e.message)
    }

    // Wait for post-login redirect
    await page.waitForTimeout(4000)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `step4-afterpassword-${Date.now()}.png`), fullPage: true }).catch(() => {})
    console.log('[login] After password URL:', page.url())

    // Step C: Dismiss "Stay signed in?" if shown
    try {
      const noBtn = page.locator('#idBtn_Back')
      if (await noBtn.count() > 0) {
        await noBtn.click()
        console.log('[login] Dismissed "Stay signed in?" dialog')
        await page.waitForTimeout(2000)
      }
    } catch {}

  } else {
    // ── Fallback: non-Microsoft form ──────────────────────────────────────
    console.log('[login] Non-Microsoft login form, trying generic selectors')
    const usernameSelectors = [
      '#username', 'input[name="username"]', 'input[name="ic"]',
      'input[placeholder*="IC"]', 'input[placeholder*="Nombor"]', 'input[type="text"]',
    ]
    for (const sel of usernameSelectors) {
      try {
        const el = page.locator(sel).first()
        if (await el.count() > 0) { await el.fill(username); console.log(`[login] Filled username via: ${sel}`); break }
      } catch {}
    }
    try {
      await page.locator('input[type="password"]').first().fill(password)
      console.log('[login] Filled password (fallback)')
    } catch { console.warn('[login] Could not fill password field') }
    await page.waitForTimeout(500)
    const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Log masuk")', 'button:has-text("Login")']
    for (const sel of submitSelectors) {
      try {
        const btn = page.locator(sel).first()
        if (await btn.count() > 0) { await btn.click(); console.log(`[login] Submitted via: ${sel}`); break }
      } catch {}
    }
  }

  // 4. Wait for redirect back to AINS
  try {
    await page.waitForURL(/ains\.moe\.gov\.my/, { timeout: 30000 })
    console.log('[login] Redirected back to AINS')
  } catch {
    console.warn('[login] Did not redirect to ains.moe.gov.my within 30s, URL:', page.url())
  }
  await page.waitForTimeout(3000)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `final-${Date.now()}.png`), fullPage: true }).catch(() => {})

  // 5. Check login status
  const url = page.url()
  const pageText = await page.textContent('body').catch(() => '')
  const onLoginPage = /Log masuk dengan akaun DELIMa|Sign in with DELIMa/i.test(pageText) || url.includes('login.microsoft')
  const hasAuthError = /No Authorization|Tiada Kebenaran/i.test(pageText)
  const hasCredError = /account.*not.*exist|password.*incorrect|username.*incorrect|kata laluan.*salah|akaun.*tidak.*wujud|That.*account.*doesn.*exist/i.test(pageText)
  const isLoggedIn = url.includes('ains.moe.gov.my') && !onLoginPage && !hasAuthError && !hasCredError

  console.log(`[login] Final URL: ${url}`)
  console.log(`[login] Result: ${isLoggedIn ? 'LOGGED IN' : 'FAILED'} (onLogin=${onLoginPage}, authError=${hasAuthError}, credError=${hasCredError})`)

  return isLoggedIn
}

module.exports = { injectSession, loginWithCredentials }
