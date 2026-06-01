const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const supabase = require('../lib/supabase')
const { injectSession, loginWithCredentials } = require('./login')
const { fillForm } = require('./fillForm')

const AINS_BASE = 'https://ains.moe.gov.my'
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots')

// Ensure screenshots dir exists
try {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
} catch (err) {
  console.warn('[bot] Could not create screenshots directory:', err.message)
}

async function launchBrowser() {
  const browser = await chromium.launch({
    headless: process.env.SHOW_BROWSER !== '1',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ]
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'ms-MY',
    timezoneId: 'Asia/Kuala_Lumpur',
  })

  // Thorough automation masking — prevents bot detection
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

  return { browser, context }
}

async function loginAndVerify(context, cookie, ssUser, ssProfile, cookies) {
  const page = await context.newPage()
  const isLoggedIn = await injectSession(context, page, cookie, ssUser, ssProfile, cookies)
  return { page, isLoggedIn }
}

async function takeScreenshot(page, label) {
  if (process.env.NODE_ENV === 'production') return null
  try {
    const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    const filename = `${safeLabel}-${Date.now()}.png`
    const filepath = path.join(SCREENSHOTS_DIR, filename)
    await page.screenshot({ path: filepath, fullPage: true })
    console.log(`[bot] Screenshot saved: ${filename}`)
    return filepath
  } catch {
    return null
  }
}

// error_message sentinel marking a book AINS rejected as "Duplicate entry".
// bot.js excludes these book_ids from future runs so the same book is never retried.
const DUP_MARKER = 'duplicate'
// Max books we'll swap through per slot when AINS keeps reporting duplicates.
const MAX_REPLACEMENTS = 5

async function runBot({ user, settings, cookie, ssUser, ssProfile, cookies, books, submissions, spareBooks = [], month, year, familySlotId = null }) {
  let browser
  try {
    const launched = await launchBrowser()
    browser = launched.browser
    const context = launched.context

    // Inject session (use captured cookie)
    const { page, isLoggedIn } = await loginAndVerify(context, cookie, ssUser, ssProfile, cookies)

    if (!isLoggedIn) {
      console.error('[bot] All login methods failed')
      await takeScreenshot(page, 'session-failed')

      await markSubmissions(submissions.map(s => s.id), 'failed', 'AINS session expired. Please reconnect using "Connect AINS Account" on the dashboard.')
      await browser.close()
      return { success: false, reason: 'session_expired' }
    }

    console.log(`[bot] Logged in. Starting ${books.length} submission(s) for ${user.email}`)

    const results = []
    const spares = Array.isArray(spareBooks) ? [...spareBooks] : []

    for (let i = 0; i < books.length; i++) {
      let book = books[i]
      const submission = submissions[i]
      let replacements = 0
      let resolved = false

      while (!resolved) {
        console.log(`[bot] [${i + 1}/${books.length}] Submitting: "${book.title}"`)

        try {
          await fillForm(page, book, settings)

          await supabase
            .from('submissions')
            .update({ status: 'success', book_id: book.id, submitted_at: new Date().toISOString() })
            .eq('id', submission.id)

          results.push({ book: book.title, status: 'success' })
          console.log(`[bot] ✓ Success: "${book.title}"`)
          resolved = true

        } catch (err) {
          // Session expired — stop all submissions, let outer catch handle it
          if (err.code === 'SESSION_EXPIRED') throw err

          // AINS already has this book on the account. Record it so it's never
          // picked again, then swap in a replacement so the run still hits target.
          const isDuplicate = /duplicate entry/i.test(err.message || '')
          if (isDuplicate) {
            const spare = replacements < MAX_REPLACEMENTS ? spares.shift() : null
            if (spare) {
              console.log(`[bot] ↻ "${book.title}" already on AINS — recording + swapping to "${spare.title}"`)
              // The submission row will be reused for the replacement, so persist
              // the duplicate book separately as a marker row (failed, not charged).
              await supabase.from('submissions').insert({
                user_id: user.id, book_id: book.id, month, year,
                status: 'failed', error_message: DUP_MARKER, family_slot_id: familySlotId,
              }).then(() => {}, () => {})
              replacements++
              book = spare
              await page.waitForTimeout(1500)
              continue
            }
            // No replacement left — this row itself becomes the duplicate record.
            console.log(`[bot] ↻ "${book.title}" already on AINS — no replacement available`)
            await supabase
              .from('submissions')
              .update({ status: 'failed', error_message: DUP_MARKER })
              .eq('id', submission.id)
            results.push({ book: book.title, status: 'duplicate', error: err.message })
            resolved = true
          } else {
            console.error(`[bot] ✗ Failed: "${book.title}" — ${err.message}`)
            await takeScreenshot(page, `fail-${book.title.replace(/\s+/g, '-').slice(0, 20)}`)
            await supabase
              .from('submissions')
              .update({ status: 'failed' })
              .eq('id', submission.id)
            results.push({ book: book.title, status: 'failed', error: err.message })
            resolved = true
          }
        }
      }

      // Random human-like delay between submissions (3–8 seconds)
      if (i < books.length - 1) {
        const delay = 3000 + Math.random() * 5000
        console.log(`[bot] Waiting ${Math.round(delay / 1000)}s before next submission...`)
        await page.waitForTimeout(delay)
      }
    }

    await browser.close()
    const successCount = results.filter(r => r.status === 'success').length
    console.log(`[bot] Done. ${successCount}/${books.length} submitted successfully.`)
    return { success: true, results }

  } catch (err) {
    console.error('[bot] Fatal error:', err.message)
    if (browser) await browser.close().catch(() => {})
    const safeMsg = err.message.length > 200 ? err.message.substring(0, 200) + '...' : err.message
    await markSubmissions(submissions.map(s => s.id), 'failed', safeMsg)
    if (err.code === 'SESSION_EXPIRED') return { success: false, reason: 'session_expired' }
    return { success: false, reason: err.message }
  }
}

async function markSubmissions(ids, status, note) {
  if (!ids || !ids.length) return
  const update = { status }
  if (note) update.error_message = note
  try {
    await supabase
      .from('submissions')
      .update(update)
      .in('id', ids)
  } catch (err) {
    console.error('[bot] markSubmissions failed:', err.message)
  }
}

module.exports = { runBot, launchBrowser, loginAndVerify, takeScreenshot }
