const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { requireAuth } = require('../lib/auth-middleware')

// GET /api/history
router.get('/', requireAuth, async (req, res) => {
  const userId = req.authUser.id
  const { limit = 20, offset = 0 } = req.query
  const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100)
  const offsetNum = Math.max(parseInt(offset) || 0, 0)

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
    .range(offsetNum, offsetNum + limitNum - 1)

  if (error) return res.status(500).json({ error: 'Failed to load history' })

  res.json({ submissions: data, total: count })
})

// Monday 00:00:00 MYT (UTC+8), expressed as UTC — mirrors bot.js getWeekStart()
function getWeekStart() {
  const MYT_OFFSET_MS = 8 * 60 * 60 * 1000
  const nowMYT = new Date(Date.now() + MYT_OFFSET_MS)
  const day = nowMYT.getUTCDay()
  const mondayMYT = new Date(nowMYT)
  mondayMYT.setUTCDate(nowMYT.getUTCDate() - ((day + 6) % 7))
  mondayMYT.setUTCHours(0, 0, 0, 0)
  return new Date(mondayMYT.getTime() - MYT_OFFSET_MS)
}

// GET /api/history/stats
router.get('/stats', requireAuth, async (req, res) => {
  const userId = req.authUser.id

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear  = now.getFullYear()
  const weekStart    = getWeekStart().toISOString()

  const { data: allSubmissions, error } = await supabase
    .from('submissions')
    .select('status, month, year, created_at')
    .eq('user_id', userId)

  if (error) return res.status(500).json({ error: 'Failed to load stats' })

  const total    = allSubmissions.filter(s => s.status === 'success').length
  const thisMonth = allSubmissions.filter(
    s => s.month === currentMonth && s.year === currentYear && s.status === 'success'
  ).length
  const thisWeek = allSubmissions.filter(
    s => s.status === 'success' && s.created_at >= weekStart
  ).length
  const thisMonthPending = allSubmissions.filter(
    s => s.month === currentMonth && s.year === currentYear && s.status === 'pending'
  ).length
  const thisMonthFailed = allSubmissions.filter(
    s => s.month === currentMonth && s.year === currentYear && s.status === 'failed'
  ).length

  res.json({ total, successful: total, thisMonth, thisWeek, thisMonthPending, thisMonthFailed, currentMonth, currentYear })
})

module.exports = router
