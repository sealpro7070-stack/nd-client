/**
 * fillForm.js — AINS book record submission
 *
 * Confirmed DOM structure (from live inspection 2026-03-25):
 *   Step 1 — /record/add        : select "Buku/E-Buku" card → Seterusnya
 *   Step 2 — /record/add/book   : fill book details → Seterusnya
 *     - Date:    <p id="date">  (pre-filled, leave it)
 *     - Title:   <input id="title">
 *     - Jenis:   radio id="typephysical" / id="typeebook" (click the <label>)
 *     - Kategori:<select> nth(0)  values: "fiction" | "nonFiction"
 *     - Pages:   <input id="noOfPage" type="number">
 *     - Author:  <input id="author">
 *     - Publisher:<input id="publisher">
 *     - Bahasa:  <select> nth(1)  values: "my" | "en" | "others"
 *   Step 3 — Pengayaan          : fill enrichment → Seterusnya
 *     - Rumusan: <textarea id="summary">  (min 10 words)
 *     - Pengajaran: <textarea id="review"> (min 5 words)
 *     - Stars: <button class="btn btn-link"><i class="fa-regular fa-star fa-2xl">
 *   Step 4 — Gambar Kulit Buku  : skip → Seterusnya
 *   Step 5 — Rumusan (review)   : scroll down → click "Hantar"
 */

const RECORD_ADD_URL = 'https://ains.moe.gov.my/record/add'

const CATEGORY_MAP = {
  'Novel': 'fiction', 'Novel Klasik': 'fiction', 'Novel Sukan': 'fiction',
  'Cerpen': 'fiction', 'Puisi': 'fiction', 'Sajak': 'fiction',
  'Remaja': 'fiction', 'Cerita Rakyat': 'fiction', 'Fiksyen': 'fiction',
  'Fiction': 'fiction', 'Adventure': 'fiction', 'Young Adult': 'fiction',
  'Classic': 'fiction', 'Mystery': 'fiction', 'Fantasy': 'fiction',
  'Sejarah': 'nonFiction', 'Keluarga': 'nonFiction', 'Motivasi': 'nonFiction',
  'Bahasa': 'nonFiction', 'Sains': 'nonFiction', 'Biografi': 'nonFiction',
  'Non-Fiction': 'nonFiction', 'Biography': 'nonFiction', 'History': 'nonFiction',
  'Science': 'nonFiction', 'Self-Help': 'nonFiction',
}

const LANGUAGE_MAP = {
  'Melayu': 'my', 'BM': 'my', 'Bahasa Melayu': 'my',
  'Inggeris': 'en', 'BI': 'en', 'English': 'en', 'Bahasa Inggeris': 'en',
  'Cina': 'others', 'Chinese': 'others', 'Mandarin': 'others',
  'Tamil': 'others', 'India': 'others',
}

async function fillForm(page, book, settings) {

  // ── Step 1: Navigate + select Buku/E-Buku ──────────────────────────
  await page.goto(RECORD_ADD_URL, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)
  console.log(`[fillForm] Loaded ${page.url()}`)

  // Detect session expiry — AINS redirects away from /record/add when session is invalid
  const currentUrl = page.url()
  if (!currentUrl.includes('/record/add')) {
    console.warn(`[fillForm] Session expired — redirected to ${currentUrl}`)
    const err = new Error('AINS session expired. Please reconnect your AINS account.')
    err.code = 'SESSION_EXPIRED'
    throw err
  }

  // Click the "Buku/E-Buku" card
  await page.locator('text=Buku/E-Buku').first().waitFor({ timeout: 15000 })
  await page.locator('text=Buku/E-Buku').first().click()
  await page.waitForTimeout(500)

  await clickButton(page, 'Seterusnya')
  await page.waitForURL('**/record/add/book', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(2000)
  console.log(`[fillForm] Step 2: book details — ${page.url()}`)

  // ── Step 2: Book Details ────────────────────────────────────────────

  // Validate required book data before filling
  if (!book.title || !book.author || !book.publisher || !book.pages) {
    throw new Error(`Incomplete book data: title=${!!book.title}, author=${!!book.author}, publisher=${!!book.publisher}, pages=${book.pages}`)
  }

  // Title
  await vueSet(page, '#title', book.title)

  // Jenis Buku — click the radio label (Bootstrap btn-check renders as toggle)
  const bookTypeId = (settings?.book_type === 'E-Buku') ? 'typeebook' : 'typephysical'
  const typeLabel = page.locator(`label[for="${bookTypeId}"]`)
  if (await typeLabel.count() > 0) {
    await typeLabel.click()
    await page.waitForTimeout(300)
  } else {
    console.warn(`[fillForm] Book type label for ${bookTypeId} not found`)
  }

  // Kategori — first <select> on page (no id/name)
  const categoryVal = CATEGORY_MAP[book.category] || 'fiction'
  await vueSelectNth(page, 0, categoryVal)

  // Bilangan Mukasurat
  await vueSet(page, '#noOfPage', String(book.pages))

  // Penulis
  await vueSet(page, '#author', book.author)

  // Penerbit
  await vueSet(page, '#publisher', book.publisher)

  // Bahasa — second <select> on page
  const langVal = LANGUAGE_MAP[book.language] || 'my'
  await vueSelectNth(page, 1, langVal)

  // Verify fields are populated before proceeding
  const fieldCheck = await page.evaluate(() => ({
    title: document.querySelector('#title')?.value || '',
    pages: document.querySelector('#noOfPage')?.value || '',
    author: document.querySelector('#author')?.value || '',
    publisher: document.querySelector('#publisher')?.value || '',
  }))
  console.log(`[fillForm] Field verification:`, fieldCheck)
  if (!fieldCheck.title || !fieldCheck.pages || !fieldCheck.author || !fieldCheck.publisher) {
    throw new Error(`Field verification failed — some fields are empty: ${JSON.stringify(fieldCheck)}`)
  }

  await clickButton(page, 'Seterusnya')
  await page.waitForTimeout(3000)
  // Wait for enrichment form fields to be visible before proceeding
  await page.waitForSelector('#summary, #review', { timeout: 10000 }).catch(() => {})
  console.log('[fillForm] Step 3: enrichment')

  // ── Step 3: Pengayaan (Enrichment) ─────────────────────────────────

  // Rumusan — minimum 10 words
  const summaryText = ensureMinWords(book.synopsis, 10)
  await vueSet(page, '#summary', summaryText)

  // Pengajaran — minimum 5 words
  const reviewText = ensureMinWords(book.moral, 5)
  await vueSet(page, '#review', reviewText)

  // Verify enrichment fields
  const enrichCheck = await page.evaluate(() => ({
    summary: document.querySelector('#summary')?.value || '',
    review: document.querySelector('#review')?.value || '',
  }))
  if (!enrichCheck.summary || !enrichCheck.review) {
    throw new Error(`Enrichment fields empty: ${JSON.stringify(enrichCheck)}`)
  }

  await clickButton(page, 'Seterusnya')
  await page.waitForTimeout(2000)
  console.log('[fillForm] Step 4: cover image (skip)')

  // ── Step 4: Gambar Kulit Buku — skip ───────────────────────────────
  await clickButton(page, 'Seterusnya')
  await page.waitForTimeout(2000)
  console.log('[fillForm] Step 5: final review — clicking Hantar')

  // ── Step 5: Final Review — scroll + click stars + Hantar ───────────
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1000)

  // Stars (Penilaian) are on the final review page — click the 5th star
  await clickFifthStar(page)
  await page.waitForTimeout(500)

  // Capture any network errors that happen during/after Hantar click
  let networkError = null
  const networkListener = async res => {
    if (res.status() >= 400) {
      const url = res.url()
      if (url.includes('nilam-records') || url.includes('submit')) {
        let body = ''
        try { body = await res.text() } catch {}
        networkError = { status: res.status(), url, body }
        console.log(`[fillForm] Network error detected: ${res.status()} ${url}`)
        console.log(`[fillForm] Error body: ${body.slice(0, 500)}`)
      }
    }
  }
  page.on('response', networkListener)

  const hantarBtn = page.locator('button:has-text("Hantar")').first()
  await hantarBtn.waitFor({ state: 'visible', timeout: 10000 })
  await hantarBtn.click()

  // Wait longer for the API call to complete before dismissing alerts
  await page.waitForTimeout(1500)

  // Dismiss up to 2 SweetAlert dialogs (confirm prompt + success notification)
  let alertIndicatedSuccess = false
  for (let i = 0; i < 2; i++) {
    try {
      await page.locator('.swal2-popup').waitFor({ state: 'visible', timeout: 5000 })
      const alertText = await page.locator('.swal2-popup').textContent().catch(() => '')
      const cleaned = alertText?.replace(/\s+/g, ' ').trim() || ''
      console.log(`[fillForm] SweetAlert ${i + 1} text: ${cleaned.slice(0, 200)}`)
      // Detect success keywords — AINS shows a success dialog after accepted submission
      if (/berjaya|success|rekod.*dihantar|dihantar.*berjaya/i.test(cleaned)) {
        alertIndicatedSuccess = true
        console.log('[fillForm] SweetAlert indicates success')
      }
      const btn = page.locator('.swal2-confirm').first()
      if (await btn.count()) {
        await btn.click()
        console.log(`[fillForm] Dismissed SweetAlert ${i + 1}`)
        await page.waitForTimeout(800)
      } else {
        break
      }
    } catch {
      break
    }
  }

  // Remove listener before waitForSuccess to avoid false positives
  page.off('response', networkListener)

  if (networkError) {
    const detail = networkError.body ? ` — ${networkError.body.slice(0, 300)}` : ''
    throw new Error(`AINS API rejected submission: HTTP ${networkError.status} on ${networkError.url.replace('https://ains-api.moe.gov.my/api', '[api]')}${detail}`)
  }

  // If a success SweetAlert was shown, the submission went through even if AINS
  // navigates back to /record/add (Step 1) to start a new entry — don't wait further.
  if (alertIndicatedSuccess) {
    console.log(`[fillForm] ✓ Submitted: "${book.title}"`)
    return
  }

  await waitForSuccess(page)
  console.log(`[fillForm] ✓ Submitted: "${book.title}"`)
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Set value on an input/textarea and trigger Vue reactivity
 */
async function vueSet(page, selector, value) {
  // Strategy 1: Playwright's native fill (triggers full input pipeline)
  try {
    const el = page.locator(selector).first()
    await el.waitFor({ state: 'visible', timeout: 5000 })
    await el.fill(String(value))
    await page.waitForTimeout(200)
    return
  } catch (e) {
    console.warn(`[fillForm] Native fill failed for ${selector}: ${e.message}, falling back to JS injection`)
  }

  // Strategy 2: JS injection with comprehensive Vue 3 reactivity triggers
  await page.evaluate(([sel, val]) => {
    const el = document.querySelector(sel)
    if (!el) return
    const proto = Object.getPrototypeOf(el)
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(el, val)
    else el.value = val

    // Vue 3 v-model listens to input, change, blur, and keydown
    el.dispatchEvent(new Event('input',  { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new Event('blur',   { bubbles: true }))
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }))
    el.dispatchEvent(new KeyboardEvent('keyup',   { bubbles: true, key: 'Tab' }))
  }, [selector, value])
  await page.waitForTimeout(300)
}

/**
 * Set value on the Nth <select> element and trigger Vue reactivity
 */
async function vueSelectNth(page, index, value) {
  // Strategy 1: Playwright native selectOption
  try {
    const select = page.locator('select').nth(index)
    await select.waitFor({ state: 'visible', timeout: 5000 })
    await select.selectOption(value)
    await page.waitForTimeout(200)
    return
  } catch (e) {
    console.warn(`[fillForm] Native selectOption failed for select[${index}]: ${e.message}, falling back to JS injection`)
  }

  // Strategy 2: JS injection
  await page.evaluate(([idx, val]) => {
    const el = document.querySelectorAll('select')[idx]
    if (!el) return
    const proto = Object.getPrototypeOf(el)
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(el, val)
    else el.value = val
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new Event('blur',   { bubbles: true }))
  }, [index, value])
  await page.waitForTimeout(300)
}

/**
 * Click a button by its exact text
 */
async function clickButton(page, text) {
  const btn = page.locator(`button:has-text("${text}")`).first()
  await btn.waitFor({ state: 'visible', timeout: 10000 })
  await btn.click()
  await page.waitForTimeout(800)
}

/**
 * Click the 5th star in the Penilaian (rating) widget on the final review page.
 * Tries multiple selector strategies since the star element type varies by AINS version.
 */
async function clickFifthStar(page) {
  try {
    const result = await page.evaluate(() => {
      const isVisible = el => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      }
      const safeClick = el => {
        if (typeof el.click === 'function') el.click()
        else el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      }

      // Strategy 1: Font Awesome <i> or <span> with fa-star class
      let stars = [...document.querySelectorAll('i[class*="fa-star"], span[class*="fa-star"]')]
        .filter(isVisible)
      if (stars.length >= 5) {
        const target = stars[4].closest('button') || stars[4]
        safeClick(target)
        return { count: stars.length, clicked: true, method: 'fa-star' }
      }

      // Strategy 2: Find elements inside the Penilaian container
      const allEls = [...document.querySelectorAll('*')]
      const penilaianLabel = allEls.find(el =>
        el.children.length === 0 && (el.textContent || '').trim() === 'Penilaian'
      )
      if (penilaianLabel) {
        let container = penilaianLabel.parentElement
        for (let i = 0; i < 4; i++) {
          const candidates = [...container.querySelectorAll('button, i, span, svg, label')]
            .filter(isVisible)
          if (candidates.length >= 5) {
            const target = candidates[4].closest('button') || candidates[4]
            safeClick(target)
            return { count: candidates.length, clicked: true, method: 'penilaian-container' }
          }
          if (container.parentElement) container = container.parentElement
        }
      }

      // Strategy 3: Any SVG elements that look like stars (5 in a row)
      stars = [...document.querySelectorAll('svg')].filter(isVisible)
      if (stars.length >= 5 && stars.length <= 10) {
        safeClick(stars[4])
        return { count: stars.length, clicked: true, method: 'svg' }
      }

      return { count: 0, clicked: false, method: 'none' }
    })

    if (result.clicked) {
      console.log(`[fillForm] Clicked 5th star (method: ${result.method}, found: ${result.count})`)
    } else {
      console.warn(`[fillForm] Could not find star rating widget`)
    }
  } catch (e) {
    console.warn(`[fillForm] Star click failed: ${e.message}`)
  }
}

async function waitForSuccess(page) {
  try {
    await page.waitForFunction(() => {
      const text = document.body.innerText || ''
      const url  = window.location.href
      if (text.includes('berjaya') || text.includes('Berjaya') || text.includes('mata')) return true
      if (url.includes('/record/add/success')) return true
      if (!url.includes('/record/add')) return true
      // AINS returns to /record/add (step 1 — "Pilih sumber bacaan") after a successful
      // submission. Detect this by checking the page shows the source-selection cards,
      // NOT a mid-form step (which would have /record/add/book, /enrichment, etc.)
      const onStep1 = /^https?:\/\/ains\.moe\.gov\.my\/record\/add\/?$/.test(url)
      if (onStep1 && (text.includes('Pilih sumber bacaan') || text.includes('Buku/E-Buku'))) return true
      return false
    }, { timeout: 25000 })
  } catch {
    const url = page.url()
    const bodyText = await page.textContent('body').catch(() => '')

    // If we're back at step 1 with the source-selection UI, submission succeeded
    const onStep1 = /^https?:\/\/ains\.moe\.gov\.my\/record\/add\/?$/.test(url)
    if (onStep1 && (bodyText.includes('Pilih sumber bacaan') || bodyText.includes('Buku/E-Buku'))) {
      console.log('[fillForm] Detected step-1 redirect — submission accepted by AINS')
      return
    }

    // Detect known error messages on the page
    const errorPatterns = [
      /error|ralat|gagal|failed|tidak berjaya/i,
      /required|diperlukan|wajib|mandatori/i,
      /invalid|tidak sah|salah/i,
      /please fill|sila isi/i,
    ]
    const detectedError = errorPatterns.find(p => p.test(bodyText))

    if (detectedError) {
      const match = bodyText.match(new RegExp(`(.{0,80}${detectedError.source}.{0,80})`, 'i'))
      const snippet = match ? match[0].replace(/\s+/g, ' ').trim() : 'unknown error text'
      throw new Error(`Form rejected by AINS: "${snippet}"`)
    }

    if (url.includes('/record/add') && !url.includes('/record/add/success')) {
      throw new Error('Form did not submit — still on form after 25s')
    }
  }
}

function ensureMinWords(text, minWords) {
  if (!text) return Array(minWords).fill('Bahan bacaan ini sangat').join(' ') + ' bermanfaat.'
  const words = text.trim().split(/\s+/)
  if (words.length >= minWords) return text
  return text + ' Bahan ini sangat bermanfaat dan sesuai untuk semua pembaca.'
}

module.exports = { fillForm }
