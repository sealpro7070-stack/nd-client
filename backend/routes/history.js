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

  // Use DB aggregation instead of loading all rows into memory
  const { data: counts, error } = await supabase.rpc('get_submission_stats', {
    p_user_id: userId,
    p_month: currentMonth,
    p_year: currentYear,
    p_week_start: weekStart,
  })

  if (error) {
    // Fallback to in-memory filtering if RPC doesn't exist yet
    const { data: allSubmissions, error: fallbackErr } = await supabase
      .from('submissions')
      .select('status, month, year, created_at')
      .eq('user_id', userId)

    if (fallbackErr) return res.status(500).json({ error: 'Failed to load stats' })

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

    return res.json({ total, successful: total, thisMonth, thisWeek, thisMonthPending, thisMonthFailed, currentMonth, currentYear })
  }

  const row = counts?.[0] || {}
  const total = parseInt(row.total_success || 0)
  res.json({
    total,
    successful: total,
    thisMonth: parseInt(row.this_month_success || 0),
    thisWeek: parseInt(row.this_week_success || 0),
    thisMonthPending: parseInt(row.this_month_pending || 0),
    thisMonthFailed: parseInt(row.this_month_failed || 0),
    currentMonth,
    currentYear,
  })
})

module.exports = router
