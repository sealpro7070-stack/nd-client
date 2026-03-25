const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')

// GET /api/settings?userId=xxx
router.get('/', async (req, res) => {
  const { userId } = req.query

  if (!userId) return res.status(400).json({ error: 'userId is required' })

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Settings not found' })

  res.json(data)
})

// POST /api/settings
// Body: { userId, books_per_month, language, book_type, auto_schedule, schedule_day }
router.post('/', async (req, res) => {
  const { userId, books_per_month, language, book_type, auto_schedule, schedule_day } = req.body

  if (!userId) return res.status(400).json({ error: 'userId is required' })

  const updates = {
    updated_at: new Date().toISOString()
  }

  if (books_per_month !== undefined) updates.books_per_month = books_per_month
  if (language !== undefined) updates.language = language
  if (book_type !== undefined) updates.book_type = book_type
  if (auto_schedule !== undefined) updates.auto_schedule = auto_schedule
  if (schedule_day !== undefined) updates.schedule_day = schedule_day

  const { data, error } = await supabase
    .from('settings')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  res.json({ success: true, settings: data })
})

module.exports = router
