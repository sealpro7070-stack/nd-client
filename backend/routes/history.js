const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')

// GET /api/history?userId=xxx OR ?userIdentifier=email&limit=20&offset=0
router.get('/', async (req, res) => {
  let { userId, userIdentifier, limit = 20, offset = 0 } = req.query

  if (!userId && !userIdentifier) return res.status(400).json({ error: 'userId or userIdentifier is required' })

  // Resolve email to userId
  if (!userId && userIdentifier) {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', userIdentifier)
      .single()
    if (!user) return res.status(404).json({ error: 'User not found' })
    userId = user.id
  }

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

  if (error) return res.status(500).json({ error: error.message })

  res.json({ submissions: data, total: count })
})

// GET /api/history/stats?userId=xxx
router.get('/stats', async (req, res) => {
  const { userId } = req.query

  if (!userId) return res.status(400).json({ error: 'userId is required' })

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const { data: allSubmissions, error } = await supabase
    .from('submissions')
    .select('status, month, year, submitted_at')
    .eq('user_id', userId)

  if (error) return res.status(500).json({ error: error.message })

  const total = allSubmissions.filter(s => s.status === 'success').length
  const successful = total
  const thisMonth = allSubmissions.filter(
    s => s.month === currentMonth && s.year === currentYear && s.status === 'success'
  ).length
  const thisMonthPending = allSubmissions.filter(
    s => s.month === currentMonth && s.year === currentYear && s.status === 'pending'
  ).length
  const thisMonthFailed = allSubmissions.filter(
    s => s.month === currentMonth && s.year === currentYear && s.status === 'failed'
  ).length

  res.json({ total, successful, thisMonth, thisMonthPending, thisMonthFailed, currentMonth, currentYear })
})

module.exports = router
