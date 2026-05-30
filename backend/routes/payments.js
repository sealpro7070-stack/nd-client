/**
 * payments.js — Payment request routes
 *
 * Flow:
 *  1. User selects plan → POST /api/payments/request (creates pending request)
 *  2. User pays via TNG QR and submits reference
 *  3. Admin sees it in Admin panel → POST /api/payments/admin/review (approve/reject)
 *  4. On approve: user.plan updated, plan_expires_at set to +1 year
 *
 * Future: swap manual flow for Lemon Squeezy webhook at POST /api/payments/webhook
 */

const express   = require('express')
const router    = express.Router()
const supabase  = require('../lib/supabase')
const { requireAuth } = require('../lib/auth-middleware')

// Prices in sen (1 RM = 100 sen). payment_requests.amount is stored in sen.
const PLAN_PRICES = { plus: 4990, family: 4800 }
const PLAN_LABELS = { plus: 'Plus', family: 'Family' }

// ─── Admin guard ──────────────────────────────────────────────────────────────
const { isAdminEmail } = require('../lib/auth-middleware')
function requireAdmin(req, res, next) {
  if (!isAdminEmail(req.authUser?.email)) {
    return res.status(403).json({ error: 'Admin only' })
  }
  next()
}

// ── GET /api/payments/my-plan
// Returns the current user's plan info
router.get('/my-plan', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('plan, plan_expires_at, is_active, credits')
    .eq('id', req.authUser.id)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  const planExpired = data.plan_expires_at && new Date(data.plan_expires_at) < new Date()
  res.json({
    plan: data.plan || 'free',
    plan_expires_at: data.plan_expires_at || null,
    is_active: data.is_active,
    credits: data.credits || 0,
  })
})

// ── GET /api/payments/my-request
// Returns the user's latest payment request (so UI can show pending state)
router.get('/my-request', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('user_id', req.authUser.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ request: data || null })
})

// ── POST /api/payments/request
// Body: { plan: 'plus'|'family', reference: '...' }
router.post('/request', requireAuth, async (req, res) => {
  const userId = req.authUser.id
  const { plan, reference, receipt_data } = req.body

  if (!PLAN_PRICES[plan]) {
    return res.status(400).json({ error: 'Invalid plan. Must be "plus" or "family".' })
  }

  // Validate reference length — prevents DoS via oversized strings
  if (reference && reference.trim().length > 100) {
    return res.status(400).json({ error: 'Reference must be 100 characters or fewer.' })
  }

  // Validate receipt MIME type + magic bytes — prevents XSS via SVG/script injection
  if (receipt_data) {
    const ALLOWED_MIME_PREFIXES = ['data:image/jpeg;', 'data:image/png;', 'data:image/webp;', 'data:image/gif;']
    const isValidImage = ALLOWED_MIME_PREFIXES.some(p => receipt_data.startsWith(p))
    if (!isValidImage) {
      return res.status(400).json({ error: 'Receipt must be a JPEG, PNG, WebP, or GIF image.' })
    }
    // Backend size guard: ~6MB base64 ≈ 4.5MB file
    if (receipt_data.length > 6_000_000) {
      return res.status(400).json({ error: 'Receipt image must be under 5MB.' })
    }
    // Magic-bytes validation: verify the base64 payload starts with actual image signatures
    try {
      const base64Body = receipt_data.split(',')[1]
      const buffer = Buffer.from(base64Body, 'base64')
      const isPng = buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
      const isJpg = buffer.slice(0, 2).equals(Buffer.from([0xFF, 0xD8]))
      const isGif = buffer.slice(0, 6).equals(Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) ||
                    buffer.slice(0, 6).equals(Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]))
      const isWebp = buffer.slice(8, 12).equals(Buffer.from([0x57, 0x45, 0x42, 0x50])) // RIFF....WEBP
      if (!isPng && !isJpg && !isGif && !isWebp) {
        return res.status(400).json({ error: 'Receipt image failed integrity check.' })
      }
    } catch {
      return res.status(400).json({ error: 'Invalid receipt image data.' })
    }
  }

  // Block if already has a pending request
  const { data: existing } = await supabase
    .from('payment_requests')
    .select('id, status, created_at')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return res.status(409).json({
      error: 'You already have a pending payment request. Please wait for admin approval.',
      existing,
    })
  }

  // 24-hour cooldown after a rejection to prevent admin queue spam
  const { data: recentRejected } = await supabase
    .from('payment_requests')
    .select('created_at')
    .eq('user_id', userId)
    .eq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentRejected) {
    const hoursSince = (Date.now() - new Date(recentRejected.created_at)) / 3_600_000
    if (hoursSince < 24) {
      const hoursLeft = Math.ceil(24 - hoursSince)
      return res.status(429).json({ error: `Please wait ${hoursLeft} more hour(s) before resubmitting.` })
    }
  }

  // Check if user already on this plan and not expired
  const { data: user } = await supabase
    .from('users')
    .select('plan, plan_expires_at')
    .eq('id', userId)
    .single()

  if (user?.plan === plan && user?.plan_expires_at && new Date(user.plan_expires_at) > new Date()) {
    return res.status(409).json({ error: `You are already on the ${PLAN_LABELS[plan]} plan.` })
  }

  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      user_id:   userId,
      plan,
      amount:    PLAN_PRICES[plan],
      reference: reference ? reference.trim() : null,
      receipt_data: receipt_data || null
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true, request: data })
})

// ── GET /api/payments/admin/list
// Admin: list all payment requests (newest first)
router.get('/admin/list', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.query // optional filter: pending | approved | rejected

  let q = supabase
    .from('payment_requests')
    .select(`
      *,
      users!payment_requests_user_id_fkey (email, plan, plan_expires_at)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })
  res.json({ requests: data })
})

// ── POST /api/payments/admin/review
// Body: { requestId, action: 'approve'|'reject' }
router.post('/admin/review', requireAuth, requireAdmin, async (req, res) => {
  const { requestId, action } = req.body
  if (!requestId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'requestId and action (approve|reject) required' })
  }

  // Fetch the request (verify it exists)
  const { data: pr, error: prErr } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (prErr || !pr) return res.status(404).json({ error: 'Payment request not found' })

  // Atomic update: only succeeds if status is still 'pending' — prevents double-approval
  const { data: updated, error: updateErr } = await supabase
    .from('payment_requests')
    .update({
      status:      action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: req.authUser.email,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select()

  if (updateErr) return res.status(500).json({ error: updateErr.message })
  if (!updated?.length) return res.status(409).json({ error: `Request has already been processed` })

  // If approved: update user's plan or add credits
  if (action === 'approve') {
    const requestType = pr.type || 'plan_upgrade'

    if (requestType === 'credit_topup') {
      // Add credits to user balance. credits_amount holds the credit COUNT;
      // pr.amount is money in sen, so fall back to sen/100 (1 credit = RM1).
      const creditsToAdd = pr.credits_amount ?? Math.round(pr.amount / 100)
      const { error: creditErr } = await supabase.rpc('add_credits', {
        target_user_id: pr.user_id,
        amount: creditsToAdd,
      })
      if (creditErr) {
        await supabase.from('payment_requests')
          .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
          .eq('id', requestId)
        return res.status(500).json({ error: 'Payment approved but credits update failed. Please retry.' })
      }
    } else {
      // Plan upgrade
      if (!['plus', 'family'].includes(pr.plan)) {
        return res.status(400).json({ error: 'Invalid plan on this payment request.' })
      }

      // grant_plan is atomic + idempotent: sets plan/expiry/is_active and grants
      // 150 credits ONCE per active plan period (via the credit_grants ledger).
      // This keeps the payment-approval path consistent with admin set-role.
      const { error: planErr } = await supabase.rpc('grant_plan', {
        target_user_id: pr.user_id,
        target_plan: pr.plan,
      })

      if (planErr) {
        // Revert the payment request back to pending — also clear audit fields
        // so admin doesn't see stale reviewed_by on a re-pending request
        await supabase.from('payment_requests')
          .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
          .eq('id', requestId)
        return res.status(500).json({ error: 'Payment approved but plan update failed. Please retry.' })
      }

      // Record a referral commission for the marketer who referred this user.
      // First-order-only is enforced by UNIQUE(referred_user_id), so the upsert
      // is a no-op if a commission already exists. Non-blocking: a failure here
      // must not undo a successful plan grant.
      try {
        const { data: refUser } = await supabase
          .from('users').select('referred_by').eq('id', pr.user_id).single()

        if (refUser?.referred_by) {
          const { data: rc } = await supabase
            .from('referral_codes')
            .select('code, rate, active')
            .eq('code', refUser.referred_by)
            .maybeSingle()

          if (rc && rc.active) {
            // pr.amount is in sen; referral_commissions stores RM (numeric).
            const orderRM = pr.amount / 100
            const commission = Math.round(orderRM * Number(rc.rate) * 100) / 100
            await supabase.from('referral_commissions').upsert({
              code:               rc.code,
              referred_user_id:   pr.user_id,
              payment_request_id: pr.id,
              order_amount:       orderRM,
              commission_amount:  commission,
            }, { onConflict: 'referred_user_id', ignoreDuplicates: true })
          }
        }
      } catch (e) {
        console.error('[payments] referral commission record failed:', e.message)
      }
    }
  }

  res.json({ success: true, action })
})

// ── POST /api/payments/credits/request
// Body: { credits: N, receipt_data } — N credits at RM1 each; open to all users
router.post('/credits/request', requireAuth, async (req, res) => {
  const userId = req.authUser.id
  const { credits, receipt_data } = req.body

  const amount = parseInt(credits)
  if (isNaN(amount) || amount < 1 || amount > 1000) {
    return res.status(400).json({ error: 'Credits must be between 1 and 1000.' })
  }

  if (!receipt_data) {
    return res.status(400).json({ error: 'Receipt is required.' })
  }

  const ALLOWED_MIME_PREFIXES = ['data:image/jpeg;', 'data:image/png;', 'data:image/webp;', 'data:image/gif;']
  if (!ALLOWED_MIME_PREFIXES.some(p => receipt_data.startsWith(p))) {
    return res.status(400).json({ error: 'Receipt must be a JPEG, PNG, WebP, or GIF image.' })
  }
  if (receipt_data.length > 6_000_000) {
    return res.status(400).json({ error: 'Receipt image must be under 5MB.' })
  }
  // Magic-bytes validation
  try {
    const base64Body = receipt_data.split(',')[1]
    const buffer = Buffer.from(base64Body, 'base64')
    const isPng = buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
    const isJpg = buffer.slice(0, 2).equals(Buffer.from([0xFF, 0xD8]))
    const isGif = buffer.slice(0, 6).equals(Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) ||
                  buffer.slice(0, 6).equals(Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]))
    const isWebp = buffer.slice(8, 12).equals(Buffer.from([0x57, 0x45, 0x42, 0x50]))
    if (!isPng && !isJpg && !isGif && !isWebp) {
      return res.status(400).json({ error: 'Receipt image failed integrity check.' })
    }
  } catch {
    return res.status(400).json({ error: 'Invalid receipt image data.' })
  }

  // Block if already has a pending credit top-up request
  const { data: existing } = await supabase
    .from('payment_requests')
    .select('id, status, created_at')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .eq('type', 'credit_topup')
    .maybeSingle()

  if (existing) {
    return res.status(409).json({
      error: 'You already have a pending credit top-up request. Please wait for approval.',
      existing,
    })
  }

  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      user_id:        userId,
      type:           'credit_topup',
      plan:           null,
      amount:         amount * 100,   // money in sen (1 credit = RM1 = 100 sen)
      credits_amount: amount,         // credit COUNT
      receipt_data:   receipt_data,
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true, request: data })
})

// ── GET /api/payments/my-credits-request
// Returns the user's latest credit top-up request
router.get('/my-credits-request', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('user_id', req.authUser.id)
    .eq('type', 'credit_topup')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ request: data || null })
})

// ── GET /api/payments/qr-settings
// Returns the current TNG QR image data (fetched by UpgradeModal — requires login)
router.get('/qr-settings', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'tng_qr')
    .maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ qr_data: data?.value || null })
})

// ── POST /api/payments/admin/qr-settings
// Admin: upload/replace the TNG QR image (stored as base64 data URL)
router.post('/admin/qr-settings', requireAuth, requireAdmin, async (req, res) => {
  const { qr_data } = req.body
  if (!qr_data) return res.status(400).json({ error: 'qr_data required' })

  const ALLOWED_QR_MIME = ['data:image/jpeg;', 'data:image/png;', 'data:image/webp;', 'data:image/gif;']
  if (!ALLOWED_QR_MIME.some(p => qr_data.startsWith(p))) {
    return res.status(400).json({ error: 'QR image must be a JPEG, PNG, WebP, or GIF.' })
  }
  if (qr_data.length > 200_000) {
    return res.status(400).json({ error: 'QR image must be under 150KB.' })
  }

  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key: 'tng_qr', value: qr_data, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ── POST /api/payments/webhook
// Placeholder for future Lemon Squeezy webhook integration
// Set LEMONSQUEEZY_WEBHOOK_SECRET in Railway env when ready
// NOTE: returns 501 until signature verification is implemented — prevents unauthorized plan grants
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  res.status(501).json({ error: 'Webhook not yet configured. Set LEMONSQUEEZY_WEBHOOK_SECRET to enable.' })
})

module.exports = router
