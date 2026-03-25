const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')

const ADMIN_EMAIL = process.env.ADMIN_EMAIL

// ── Admin auth middleware ─────────────────────────────────────────
// Decodes the JWT payload directly (no extra client needed),
// then uses the service role to look up the real user by ID.
async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) return res.status(401).json({ error: 'No token provided' })

  try {
    // Decode JWT payload (middle segment, base64url)
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
    )
    const userId = payload.sub
    if (!userId) return res.status(401).json({ error: 'Invalid token' })

    // Look up the real user via service role admin API
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !user) return res.status(401).json({ error: 'Invalid token' })
    if (user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Access denied' })

    req.adminUser = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// GET /api/admin/users — list all users with stats
router.get('/users', requireAdmin, async (req, res) => {
  // 1. Get ALL users from Supabase Auth (service role can do this)
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (authError) return res.status(500).json({ error: authError.message })

  const authUsers = authData.users || []

  // 2. Auto-create any missing public.users rows
  if (authUsers.length > 0) {
    const rows = authUsers.map(u => ({
      id: u.id,
      email: u.email,
      // Admin is always active
      is_active: u.email === ADMIN_EMAIL ? true : false,
      created_at: u.created_at
    }))
    await supabase.from('users').upsert(rows, { onConflict: 'id', ignoreDuplicates: true })

    // Ensure admin is always active even if row already existed
    await supabase.from('users').update({ is_active: true }).eq('email', ADMIN_EMAIL)
  }

  // 3. Fetch public.users for activation + cookie status
  const { data: publicUsers } = await supabase
    .from('users')
    .select('id, is_active, delima_id, cookie_updated_at')

  const publicMap = {}
  for (const u of (publicUsers || [])) publicMap[u.id] = u

  // 4. Fetch submission counts
  const userIds = authUsers.map(u => u.id)
  const { data: subCounts } = userIds.length
    ? await supabase.from('submissions').select('user_id, status').in('user_id', userIds)
    : { data: [] }

  const countMap = {}
  for (const s of (subCounts || [])) {
    if (!countMap[s.user_id]) countMap[s.user_id] = { total: 0, success: 0 }
    countMap[s.user_id].total++
    if (s.status === 'success') countMap[s.user_id].success++
  }

  // 5. Merge everything
  const users = authUsers
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(u => ({
      id: u.id,
      email: u.email,
      delima_id:           publicMap[u.id]?.delima_id || null,
      is_active:           publicMap[u.id]?.is_active || false,
      has_cookie:          !!publicMap[u.id]?.cookie_updated_at,
      cookie_updated_at:   publicMap[u.id]?.cookie_updated_at || null,
      created_at:          u.created_at,
      last_sign_in:        u.last_sign_in_at,
      submissions_total:   countMap[u.id]?.total   || 0,
      submissions_success: countMap[u.id]?.success || 0,
    }))

  res.json({ users })
})

// POST /api/admin/activate — toggle is_active for a user
router.post('/activate', requireAdmin, async (req, res) => {
  const { userId, activate } = req.body

  if (!userId || typeof activate !== 'boolean') {
    return res.status(400).json({ error: 'userId and activate (boolean) are required' })
  }

  const { data, error } = await supabase
    .from('users')
    .update({ is_active: activate })
    .eq('id', userId)
    .select('id, email, is_active')
    .single()

  if (error) return res.status(500).json({ error: error.message })

  res.json({ success: true, user: data })
})

module.exports = router
