/**
 * referrals.js — Marketer / referral program
 *
 * Flow:
 *   1. Admin creates a referral code for a marketer (POST /admin/codes)
 *   2. Marketer shares  https://nilamdesk.vercel.app/?ref=THEIRCODE
 *   3. New user signs up with that code stored on their account (users.referred_by)
 *   4. When that user's FIRST plan payment is approved, payments.js records a
 *      commission row (10% of the order) — see record on payment approval.
 *   5. Admin pays the marketer manually via TNG and marks the commission "paid".
 *
 * "First order only" is enforced by a UNIQUE(referred_user_id) constraint on
 * referral_commissions, so a user can generate at most one commission.
 */

const express  = require('express')
const router   = express.Router()
const supabase = require('../lib/supabase')
const { requireAuth, isAdminEmail } = require('../lib/auth-middleware')

function requireAdmin(req, res, next) {
  if (!isAdminEmail(req.authUser?.email)) {
    return res.status(403).json({ error: 'Admin only' })
  }
  next()
}

// Normalise a code to a safe, consistent form (uppercase alphanumeric, max 32)
function normalizeCode(raw) {
  if (!raw || typeof raw !== 'string') return null
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32)
  return code || null
}

// ── GET /api/referrals/stats?token=XXX
// PUBLIC (no login): a marketer's own read-only stats, looked up by their
// secret view_token. Returns aggregates + their commission rows, but never
// the referred users' identities (privacy).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
router.get('/stats', async (req, res) => {
  const token = (req.query.token || '').trim()
  if (!UUID_RE.test(token)) return res.status(400).json({ error: 'Invalid link.' })

  const { data: code, error } = await supabase
    .from('referral_codes')
    .select('code, owner_name, rate, active')
    .eq('view_token', token)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!code) return res.status(404).json({ error: 'Link not found.' })

  const { count: signups } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', code.code)

  const { data: comms } = await supabase
    .from('referral_commissions')
    .select('order_amount, commission_amount, status, created_at, paid_at')
    .eq('code', code.code)
    .order('created_at', { ascending: false })

  let pending_total = 0, paid_total = 0, orders = 0
  for (const c of (comms || [])) {
    if (c.status === 'void') continue
    orders++
    if (c.status === 'paid') paid_total += Number(c.commission_amount)
    else pending_total += Number(c.commission_amount)
  }

  res.json({
    code: code.code,
    owner_name: code.owner_name,
    rate: code.rate,
    active: code.active,
    stats: { signups: signups || 0, orders, pending_total, paid_total },
    commissions: (comms || []).filter(c => c.status !== 'void'),
  })
})

// ── GET /api/referrals/validate?code=XXX
// Used by the frontend to confirm a code is real/active before signup.
router.get('/validate', requireAuth, async (req, res) => {
  const code = normalizeCode(req.query.code)
  if (!code) return res.json({ valid: false })

  const { data, error } = await supabase
    .from('referral_codes')
    .select('code, owner_name, active')
    .eq('code', code)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!data || !data.active) return res.json({ valid: false })
  res.json({ valid: true, owner_name: data.owner_name })
})

// ── GET /api/referrals/admin/codes
// List all codes with aggregated commission stats.
router.get('/admin/codes', requireAuth, requireAdmin, async (req, res) => {
  const { data: codes, error } = await supabase
    .from('referral_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  // Aggregate commissions per code in one pass
  const { data: comms } = await supabase
    .from('referral_commissions')
    .select('code, status, commission_amount')

  // Count signups attributed to each code
  const { data: signups } = await supabase
    .from('users')
    .select('referred_by')
    .not('referred_by', 'is', null)

  const agg = {}
  for (const c of (codes || [])) {
    agg[c.code] = { signups: 0, orders: 0, pending_total: 0, paid_total: 0 }
  }
  for (const s of (signups || [])) {
    if (agg[s.referred_by]) agg[s.referred_by].signups++
  }
  for (const k of (comms || [])) {
    if (!agg[k.code]) continue
    if (k.status === 'void') continue
    agg[k.code].orders++
    if (k.status === 'paid') agg[k.code].paid_total += Number(k.commission_amount)
    else agg[k.code].pending_total += Number(k.commission_amount)
  }

  const result = (codes || []).map(c => ({ ...c, stats: agg[c.code] }))
  res.json({ codes: result })
})

// ── POST /api/referrals/admin/codes
// Body: { code, owner_name, owner_contact?, rate? }
router.post('/admin/codes', requireAuth, requireAdmin, async (req, res) => {
  const code = normalizeCode(req.body.code)
  const owner_name = (req.body.owner_name || '').trim()
  const owner_contact = (req.body.owner_contact || '').trim() || null
  let rate = req.body.rate === undefined ? 0.10 : Number(req.body.rate)

  if (!code) return res.status(400).json({ error: 'Code must be alphanumeric.' })
  if (!owner_name) return res.status(400).json({ error: 'Owner name is required.' })
  if (isNaN(rate) || rate < 0 || rate > 1) {
    return res.status(400).json({ error: 'Rate must be between 0 and 1 (e.g. 0.10 for 10%).' })
  }

  const { data: existing } = await supabase
    .from('referral_codes').select('code').eq('code', code).maybeSingle()
  if (existing) return res.status(409).json({ error: 'That code already exists.' })

  const { data, error } = await supabase
    .from('referral_codes')
    .insert({ code, owner_name, owner_contact, rate })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true, code: data })
})

// ── POST /api/referrals/admin/codes/toggle
// Body: { code, active }
router.post('/admin/codes/toggle', requireAuth, requireAdmin, async (req, res) => {
  const code = normalizeCode(req.body.code)
  const { active } = req.body
  if (!code || typeof active !== 'boolean') {
    return res.status(400).json({ error: 'code and active (boolean) are required.' })
  }

  const { data, error } = await supabase
    .from('referral_codes')
    .update({ active })
    .eq('code', code)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true, code: data })
})

// ── GET /api/referrals/admin/commissions?status=pending|paid|void
router.get('/admin/commissions', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.query
  let q = supabase
    .from('referral_commissions')
    .select(`*, users!referral_commissions_referred_user_id_fkey (email)`)
    .order('created_at', { ascending: false })
    .limit(500)

  if (status && ['pending', 'paid', 'void'].includes(status)) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })
  res.json({ commissions: data })
})

// ── POST /api/referrals/admin/commissions/mark-paid
// Body: { commissionId }  — mark a single commission as paid
//   or  { code }          — mark ALL pending commissions for a code as paid
router.post('/admin/commissions/mark-paid', requireAuth, requireAdmin, async (req, res) => {
  const { commissionId, code } = req.body
  const now = new Date().toISOString()

  if (commissionId) {
    const { data, error } = await supabase
      .from('referral_commissions')
      .update({ status: 'paid', paid_at: now })
      .eq('id', commissionId)
      .eq('status', 'pending')
      .select()
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true, updated: data?.length || 0 })
  }

  const normCode = normalizeCode(code)
  if (!normCode) return res.status(400).json({ error: 'commissionId or code is required.' })

  const { data, error } = await supabase
    .from('referral_commissions')
    .update({ status: 'paid', paid_at: now })
    .eq('code', normCode)
    .eq('status', 'pending')
    .select()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true, updated: data?.length || 0 })
})

// ── POST /api/referrals/admin/commissions/void
// Body: { commissionId } — void a suspicious/fraudulent commission
router.post('/admin/commissions/void', requireAuth, requireAdmin, async (req, res) => {
  const { commissionId } = req.body
  if (!commissionId) return res.status(400).json({ error: 'commissionId is required.' })

  const { data, error } = await supabase
    .from('referral_commissions')
    .update({ status: 'void' })
    .eq('id', commissionId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true, commission: data })
})

module.exports = router
