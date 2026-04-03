const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { requireAuth } = require('../lib/auth-middleware')

const VALID_LANGUAGES  = ['Melayu', 'Inggeris', 'Cina', 'Tamil']
const VALID_BOOK_TYPES = ['Fizikal', 'E-Buku']

// GET /api/settings
router.get('/', requireAuth, async (req, res) => {
  const userId = req.authUser.id

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return res.status(500).json({ error: 'Failed to load settings' })
  if (!data)  return res.status(404).json({ error: 'Settings not found' })

  res.json(data)
})

// POST /api/settings
// Body: { books_per_month, language, book_type, auto_schedule, schedule_day }
router.post('/', requireAuth, async (req, res) => {
  const userId = req.authUser.id
  const { books_per_month, language, book_type, auto_schedule, schedule_day } = req.body

  const updates = { updated_at: new Date().toISOString() }

  if (books_per_month !== undefined) {
    const v = parseInt(books_per_month)
    if (isNaN(v) || v < 1 || v > 50) return res.status(400).json({ error: 'books_per_month must be between 1 and 50' })
    updates.books_per_month = v
  }
  if (language !== undefined) {
    if (!VALID_LANGUAGES.includes(language)) return res.status(400).json({ error: `language must be one of: ${VALID_LANGUAGES.join(', ')}` })
    updates.language = language
  }
  if (book_type !== undefined) {
    if (!VALID_BOOK_TYPES.includes(book_type)) return res.status(400).json({ error: `book_type must be one of: ${VALID_BOOK_TYPES.join(', ')}` })
    updates.book_type = book_type
  }
  if (auto_schedule !== undefined) updates.auto_schedule = !!auto_schedule
  if (schedule_day !== undefined) {
    const v = parseInt(schedule_day)
    if (isNaN(v) || v < 1 || v > 28) return res.status(400).json({ error: 'schedule_day must be between 1 and 28' })
    updates.schedule_day = v
  }

  const { data, error } = await supabase
    .from('settings')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
    .select()
    .maybeSingle()

  if (error) return res.status(500).json({ error: 'Failed to save settings' })

  res.json({ success: true, settings: data })
})

module.exports = router
