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
    const playwrightCookies = cookies
      .filter(c => c.domain && c.domain.includes('moe.gov.my'))
      .map(c => {
        const pc = {
          name: c.name,
          value: c.value,
          domain: c.domain.startsWith('.') ? c.domain : '.' + c.domain,
          path: c.path || '/',
          httpOnly: c.httpOnly || false,
          secure: c.secure || false,
          sameSite: 
            (c.sameSite && c.sameSite.toLowerCase() === 'no_restriction') ? 'None'
            : (c.sameSite && c.sameSite.toLowerCase() === 'none') ? 'None'
            : (c.sameSite && c.sameSite.toLowerCase() === 'strict') ? 'Strict'
            : 'Lax',
        }
        
        const expires = c.expires || c.expirationDate || -1
        if (expires !== -1) {
          pc.expires = Math.floor(expires)
        }
        
        return pc
      })
      
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

  // 5. Wait for Vue SPA to fully mount and render.
  //    2s was too short — Vue needs time to: read sessionStorage → validate token →
  //    call refresh API if expired → re-render dashboard. 5s covers slow Railway cold starts.
  await page.waitForTimeout(5000)

  // 5a. Also try to wait for Vue router to navigate away from the base URL.
  //     Logged-in users land at /home (or similar). This resolves faster than a fixed wait
  //     when the session is healthy, without racing against a slow render.
  await page.waitForFunction(
    () => window.location.pathname !== '/',
    { timeout: 8000 }
  ).catch(() => {
    // Timed out — page stayed at '/'. Could be login redirect or just slow Vue boot.
    // Fall through to text check.
  })

  // 6. Debug screenshot
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `debug-login-${Date.now()}.png`), fullPage: true }).catch(() => { })

  // 7. Check login status
  const checkStatus = async () => {
    const url = page.url()
    const pageText = await page.textContent('body').catch(() => '')
    const onLoginPage = /Log masuk dengan akaun DELIMa|Sign in with DELIMa/i.test(pageText)
    const hasAuthError = /No Authorization|Tiada Kebenaran/i.test(pageText)
    // Also treat Microsoft login redirect as not logged in
    const onMicrosoft = url.includes('login.microsoftonline.com') || url.includes('login.microsoft.com')
    return { url, onLoginPage, hasAuthError, onMicrosoft, isLoggedIn: !onLoginPage && !hasAuthError && !onMicrosoft }
  }

  let status = await checkStatus()
  console.log(`[login] URL: ${status.url}`)
  console.log(`[login] First check: ${status.isLoggedIn ? 'LOGGED IN' : 'FAILED'} (loginPage=${status.onLoginPage}, authError=${status.hasAuthError}, ms=${status.onMicrosoft})`)

  // 8. Retry once — if still failing, wait another 5s and check again.
  //    This handles the case where the token was injected but the refresh API call
  //    hasn't completed yet (common on first run after Railway restart).
  if (!status.isLoggedIn) {
    console.log('[login] Retrying after 5s...')
    await page.waitForTimeout(5000)
    status = await checkStatus()
    console.log(`[login] Retry check: ${status.isLoggedIn ? 'LOGGED IN' : 'FAILED'} (loginPage=${status.onLoginPage}, authError=${status.hasAuthError}, ms=${status.onMicrosoft})`)
  }

  return status.isLoggedIn
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
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `step1-ains-${Date.now()}.png`), fullPage: true }).catch(() => { })

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
    } catch { }
  }
  if (!clicked) console.warn('[login] No login button found on AINS page')

  // 3. Wait for redirect to Microsoft login
  await page.waitForTimeout(4000)
  const urlAfterClick = page.url()
  console.log(`[login] After click URL: ${urlAfterClick}`)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `step2-loginform-${Date.now()}.png`), fullPage: true }).catch(() => { })

  const isMicrosoft = urlAfterClick.includes('login.microsoftonline.com') || urlAfterClick.includes('login.microsoft.com')
  const isGoogle = urlAfterClick.includes('accounts.google.com')

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
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `step3-afterusername-${Date.now()}.png`), fullPage: true }).catch(() => { })
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
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `step4-afterpassword-${Date.now()}.png`), fullPage: true }).catch(() => { })
    console.log('[login] After password URL:', page.url())

    // Step C: Dismiss "Stay signed in?" if shown
    try {
      const noBtn = page.locator('#idBtn_Back')
      await noBtn.waitFor({ state: 'visible', timeout: 3000 })
      await noBtn.click()
      console.log('[login] Dismissed "Stay signed in?" dialog')
      await page.waitForTimeout(2000)
    } catch { }

  } else if (isGoogle) {
    // ── Google Workspace login ────────────────────────────────────────────
    console.log('[login] Google login page detected')

    // Step A: Enter email
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 12000 })
      await page.fill('input[type="email"]', username)
      console.log('[login] Filled Google email')
      await page.waitForTimeout(500)
      
      // Click Next
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Seterusnya"), #identifierNext button').first()
      await nextBtn.click()
      console.log('[login] Clicked Next (email)')
    } catch (e) {
      console.warn('[login] Google email step failed:', e.message)
    }

    // Wait for password screen
    await page.waitForTimeout(4000)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `step3-after-google-email-${Date.now()}.png`), fullPage: true }).catch(() => { })

    // Step B: Enter password
    try {
      const passwordLocator = page.locator('input[type="password"]').filter({ visible: true }).first()
      await passwordLocator.waitFor({ state: 'visible', timeout: 12000 })
      await passwordLocator.fill(password)
      console.log('[login] Filled Google password')
      await page.waitForTimeout(500)
      
      // Click Next
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Seterusnya"), #passwordNext button').first()
      await nextBtn.click()
      console.log('[login] Clicked Next (password)')
    } catch (e) {
      console.warn('[login] Google password step failed:', e.message)
    }

    // Wait for post-login redirect
    await page.waitForTimeout(4000)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `step4-after-google-pwd-${Date.now()}.png`), fullPage: true }).catch(() => { })
    console.log('[login] After Google password URL:', page.url())

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
      } catch { }
    }
    try {
      // Google's login page has a hidden password field (aria-hidden, tabindex=-1, name="hiddenPassword")
      // and a separate visible one — must target only the visible one
      const passwordLocator = page.locator('input[type="password"]').filter({ visible: true }).first()
      await passwordLocator.waitFor({ state: 'visible', timeout: 10000 })
      await passwordLocator.fill(password)
      console.log('[login] Filled password (fallback, visible filter)')
    } catch { console.warn('[login] Could not fill password field') }
    await page.waitForTimeout(500)
    const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Log masuk")', 'button:has-text("Login")']
    for (const sel of submitSelectors) {
      try {
        const btn = page.locator(sel).first()
        if (await btn.count() > 0) { await btn.click(); console.log(`[login] Submitted via: ${sel}`); break }
      } catch { }
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
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `final-${Date.now()}.png`), fullPage: true }).catch(() => { })

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
