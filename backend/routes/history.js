const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { requireAuth } = require('../lib/auth-middleware')

// GET /api/history
router.get('/', requireAuth, async (req, res) => {
  const userId = req.authUser.id
  const { limit = 20, offset = 0 } = req.query

  const { data, error, count } = await supabase
    .from('submissions')
    .select(`
      *,
      books (
        title,
        author,
        language
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)

  if (error) return res.status(500).json({ error: 'Failed to load history' })

  res.json({ submissions: data, total: count })
})

// GET /api/history/stats
router.get('/stats', requireAuth, async (req, res) => {
  const userId = req.authUser.id

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear  = now.getFullYear()

  const { data: allSubmissions, error } = await supabase
    .from('submissions')
    .select('status, month, year, submitted_at')
    .eq('user_id', userId)

  if (error) return res.status(500).json({ error: 'Failed to load stats' })

  const total    = allSubmissions.filter(s => s.status === 'success').length
  const thisMonth = allSubmissions.filter(
    s => s.month === currentMonth && s.year === currentYear && s.status === 'success'
  ).length
  const thisMonthPending = allSubmissions.filter(
    s => s.month === currentMonth && s.year === currentYear && s.status === 'pending'
  ).length
  const thisMonthFailed = allSubmissions.filter(
    s => s.month === currentMonth && s.year === currentYear && s.status === 'failed'
  ).length

  res.json({ total, successful: total, thisMonth, thisMonthPending, thisMonthFailed, currentMonth, currentYear })
})

module.exports = router
