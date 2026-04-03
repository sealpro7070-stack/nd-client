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

  // Click the "Buku/E-Buku" card
  await page.locator('text=Buku/E-Buku').first().waitFor({ timeout: 10000 })
  await page.locator('text=Buku/E-Buku').first().click()
  await page.waitForTimeout(500)

  await clickButton(page, 'Seterusnya')
  await page.waitForURL('**/record/add/book', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(2000)
  console.log(`[fillForm] Step 2: book details — ${page.url()}`)

  // ── Step 2: Book Details ────────────────────────────────────────────

  // Title
  await vueSet(page, '#title', book.title)

  // Jenis Buku — click the radio label (Bootstrap btn-check renders as toggle)
  const bookTypeId = (settings?.book_type === 'E-Buku') ? 'typeebook' : 'typephysical'
  await page.locator(`label[for="${bookTypeId}"]`).click().catch(() => {})
  await page.waitForTimeout(200)

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

  await page.waitForTimeout(500)
  await clickButton(page, 'Seterusnya')
  await page.waitForTimeout(2000)
  console.log('[fillForm] Step 3: enrichment')

  // ── Step 3: Pengayaan (Enrichment) ─────────────────────────────────

  // Rumusan — minimum 10 words
  await vueSet(page, '#summary', ensureMinWords(book.synopsis, 10))

  // Pengajaran — minimum 5 words
  await vueSet(page, '#review', ensureMinWords(book.moral, 5))

  // Click 5th star
  await clickFifthStar(page)

  await page.waitForTimeout(500)
  await clickButton(page, 'Seterusnya')
  await page.waitForTimeout(2000)
  console.log('[fillForm] Step 4: cover image (skip)')

  // ── Step 4: Gambar Kulit Buku — skip ───────────────────────────────
  await clickButton(page, 'Seterusnya')
  await page.waitForTimeout(2000)
  console.log('[fillForm] Step 5: final review — clicking Hantar')

  // ── Step 5: Final Review — scroll + Hantar ─────────────────────────
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)

  const hantarBtn = page.locator('button:has-text("Hantar")').first()
  await hantarBtn.waitFor({ state: 'visible', timeout: 10000 })
  await hantarBtn.click()

  // Dismiss up to 2 SweetAlert dialogs (confirm prompt + success notification)
  for (let i = 0; i < 2; i++) {
    try {
      await page.locator('.swal2-popup').waitFor({ state: 'visible', timeout: 5000 })
      const btn = page.locator('.swal2-confirm').first()
      if (await btn.count()) {
        await btn.click()
        console.log(`[fillForm] Dismissed SweetAlert ${i + 1}`)
        await page.waitForTimeout(600)
      } else {
        break
      }
    } catch {
      break // No SweetAlert appeared — form may have submitted directly
    }
  }

  await waitForSuccess(page)
  console.log(`[fillForm] ✓ Submitted: "${book.title}"`)
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Set value on an input/textarea and trigger Vue reactivity
 */
async function vueSet(page, selector, value) {
  await page.evaluate(([sel, val]) => {
    const el = document.querySelector(sel)
    if (!el) return
    // Use native setter so Vue 3 detects the change
    const proto = Object.getPrototypeOf(el)
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(el, val)
    else el.value = val
    el.dispatchEvent(new Event('input',  { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, [selector, value])
  await page.waitForTimeout(150)
}

/**
 * Set value on the Nth <select> element and trigger Vue reactivity
 */
async function vueSelectNth(page, index, value) {
  await page.evaluate(([idx, val]) => {
    const el = document.querySelectorAll('select')[idx]
    if (!el) return
    const proto = Object.getPrototypeOf(el)
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(el, val)
    else el.value = val
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, [index, value])
  await page.waitForTimeout(150)
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
 * Click the 5th star in the rating widget
 */
async function clickFifthStar(page) {
  try {
    const starBtns = page.locator('button.btn-link:has(i.fa-star), button:has(i[class*="fa-star"])')
    const count = await starBtns.count()
    if (count >= 5) {
      await starBtns.nth(4).click()
      console.log('[fillForm] Clicked 5th star')
    } else {
      console.warn(`[fillForm] Only found ${count} stars`)
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
      // /record/add/success is a success page — don't treat it as "still on form"
      if (url.includes('/record/add/success')) return true
      // Navigated completely away from the form area
      if (!url.includes('/record/add')) return true
      return false
    }, { timeout: 25000 })
  } catch {
    const url = page.url()
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
