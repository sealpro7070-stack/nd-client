/**
 * bot.js — Main bot orchestrator
 * Fetches user data, decrypts AINS credentials, picks books, runs fillForm.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const supabase = require('../lib/supabase')
const { decrypt } = require('../lib/crypto')
const { runBot } = require('./browser')

async function startBot(userId, directCookie, directSsUser, directSsProfile, directCookies, overrideCount) {
  console.log(`\n[bot] Starting for userId: ${userId}${directCookie ? ' (direct cookie)' : ''}`)

  // 1. Fetch user
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (userErr || !user) throw new Error(`User not found: ${userId}`)
  if (!user.is_active) throw new Error('Account not activated')
  if (!user.ains_username_encrypted) throw new Error('No AINS credentials saved. Enter them on the dashboard.')

  console.log(`[bot] User: ${user.email}`)

  // 2. Fetch settings
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  // Use defaults if no settings row yet
  const userSettings = settings || {
    books_per_month: 4,
    language: 'Melayu',
    book_type: 'Fizikal',
    auto_schedule: true,
    schedule_day: 15
  }

  console.log(`[bot] Settings: ${userSettings.books_per_month} books/month, language=${userSettings.language}`)

  // 3. Decrypt AINS credentials
  let username, password
  try {
    username = decrypt(user.ains_username_encrypted)
    password = decrypt(user.ains_password_encrypted)
    console.log(`[bot] Credentials decrypted for: ${username.substring(0, 4)}****`)
  } catch (err) {
    throw new Error(`Failed to decrypt AINS credentials: ${err.message}`)
  }

  // 4. Check how many successful submissions already this month
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const { data: existing } = await supabase
    .from('submissions')
    .select('book_id')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .eq('status', 'success')

  const alreadySubmitted = existing || []
  const alreadyBookIds = alreadySubmitted.map(s => s.book_id)

  // overrideCount = user explicitly chose "submit N books now" from the dashboard
  // Without override, use quota logic
  let needed
  if (overrideCount && overrideCount > 0) {
    needed = overrideCount
    console.log(`[bot] Manual override: submitting ${needed} book(s) now (${alreadySubmitted.length} already done this month)`)
  } else {
    needed = userSettings.books_per_month - alreadySubmitted.length
    if (needed <= 0) {
      console.log(`[bot] Already submitted ${alreadySubmitted.length}/${userSettings.books_per_month} books this month. Nothing to do.`)
      return { success: true, skipped: true, reason: 'already_complete' }
    }
    console.log(`[bot] Need ${needed} more book(s) to reach monthly quota`)
  }

  // 5. Pick books: matching language, not previously submitted this month
  let booksQuery = supabase
    .from('books')
    .select('*')
    .eq('language', userSettings.language)

  if (alreadyBookIds.length > 0) {
    booksQuery = booksQuery.not('id', 'in', `(${alreadyBookIds.join(',')})`)
  }

  const { data: availableBooks, error: booksErr } = await booksQuery.limit(100)

  if (booksErr) throw new Error(`Failed to fetch books: ${booksErr.message}`)
  if (!availableBooks || availableBooks.length === 0) {
    throw new Error(`No ${userSettings.language} books available. Please add more books to the seed data.`)
  }

  // Shuffle and pick needed count
  const shuffled = availableBooks.sort(() => 0.5 - Math.random()).slice(0, needed)
  console.log(`[bot] Selected ${shuffled.length} book(s):`, shuffled.map(b => b.title))

  // 6. Create pending submission records
  const submissionRows = shuffled.map(book => ({
    user_id: userId,
    book_id: book.id,
    month,
    year,
    status: 'pending'
  }))

  const { data: insertedSubs, error: insertErr } = await supabase
    .from('submissions')
    .insert(submissionRows)
    .select()

  if (insertErr) throw new Error(`Failed to create submission records: ${insertErr.message}`)

  // 7. Run the browser bot
  const result = await runBot({
    user,
    settings: userSettings,
    username,
    password,
    books: shuffled,
    submissions: insertedSubs
  })

  return result
}

module.exports = { startBot }
