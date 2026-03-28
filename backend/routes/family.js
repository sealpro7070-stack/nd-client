/**
 * family.js — Family plan slot management
 *
 * One family account can hold up to 3 AINS "slots" (one per child/sibling).
 * Each slot has its own AINS session, language preference, and submission history.
 * The parent user connects each slot's AINS account and triggers submissions.
 */

const express  = require('express')
const router   = express.Router()
const crypto   = require('crypto')
const supabase = require('../lib/supabase')
const { encrypt, decrypt } = require('../lib/crypto')
const { requireAuth } = require('../lib/auth-middleware')
const sm       = require('../lib/session-manager')
const { startBotForSlot } = require('../bot/bot')

const MAX_SLOTS = 3

// Guard: must have an active family plan
async function requireFamily(req, res, next) {
  const { data: user } = await supabase
    .from('users')
    .select('plan, plan_expires_at')
    .eq('id', req.authUser.id)
    .single()

  const expired = user?.plan_expires_at && new Date(user.plan_expires_at) < new Date()
  if (user?.plan !== 'family' || expired) {
    return res.status(403).json({ error: 'Family plan required. Please upgrade to access this feature.' })
  }
  next()
}

// ── GET /api/family/slots
// List all family slots for the current user
router.get('/slots', requireAuth, requireFamily, async (req, res) => {
  const { data, error } = await supabase
    .from('family_slots')
    .select('id, slot_name, language, books_per_month, created_at, ains_email_encrypted')
    .eq('user_id', req.authUser.id)
    .order('created_at')

  if (error) return res.status(500).json({ error: error.message })

  // Decrypt email for display (masked)
  const slots = (data || []).map(s => {
    let email = null
    if (s.ains_email_encrypted) {
      try { email = decrypt(s.ains_email_encrypted) } catch {}
    }
    return {
      id:              s.id,
      slot_name:       s.slot_name,
      language:        s.language,
      books_per_month: s.books_per_month,
      created_at:      s.created_at,
      ains_connected:  !!s.ains_email_encrypted,
      ains_email:      email ? email.replace(/(.{2}).*(@.*)/, '$1***$2') : null,
    }
  })

  res.json({ slots })
})

// ── POST /api/family/slots
// Add a new slot (max 3)
// Body: { slot_name }
router.post('/slots', requireAuth, requireFamily, async (req, res) => {
  const userId = req.authUser.id
  const { slot_name } = req.body

  if (!slot_name?.trim()) return res.status(400).json({ error: 'slot_name is required' })

  // Count existing slots
  const { count } = await supabase
    .from('family_slots')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (count >= MAX_SLOTS) {
    return res.status(400).json({ error: `Maximum ${MAX_SLOTS} slots allowed on the Family plan.` })
  }

  const { data, error } = await supabase
    .from('family_slots')
    .insert({ user_id: userId, slot_name: slot_name.trim() })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'A slot with that name already exists.' })
    return res.status(500).json({ error: error.message })
  }

  res.json({ success: true, slot: data })
})

// ── DELETE /api/family/slots/:slotId
router.delete('/slots/:slotId', requireAuth, requireFamily, async (req, res) => {
  const { error } = await supabase
    .from('family_slots')
    .delete()
    .eq('id', req.params.slotId)
    .eq('user_id', req.authUser.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ── PATCH /api/family/slots/:slotId/settings
// Update slot language + books_per_month
router.patch('/slots/:slotId/settings', requireAuth, requireFamily, async (req, res) => {
  const { language, books_per_month } = req.body
  const updates = {}
  if (language) updates.language = language
  if (books_per_month) updates.books_per_month = Math.min(15, Math.max(1, parseInt(books_per_month)))

  const { error } = await supabase
    .from('family_slots')
    .update(updates)
    .eq('id', req.params.slotId)
    .eq('user_id', req.authUser.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ── POST /api/family/slots/:slotId/connect
// Start a Playwright login for this family slot
// Body: { email, password }
router.post('/slots/:slotId/connect', requireAuth, requireFamily, async (req, res) => {
  const { slotId } = req.params
  const { email, password } = req.body
  const userId = req.authUser.id

  if (!email || !password) return res.status(400).json({ error: 'email and password required' })

  // Verify slot belongs to user
  const { data: slot } = await supabase
    .from('family_slots')
    .select('id')
    .eq('id', slotId)
    .eq('user_id', userId)
    .single()

  if (!slot) return res.status(404).json({ error: 'Slot not found' })

  // Use a composite key for session manager so it doesn't conflict with parent session
  const sessionKey = `${userId}__slot__${slotId}`

  res.json({ status: 'connecting' })

  ;(async () => {
    try {
      const { ssToken, ssUser, ssProfile, cookies } = await sm.performLogin(
        sessionKey, email, password, () => {}
      )

      // Check uniqueness: this AINS account must not be linked elsewhere
      if (ssUser) {
        try {
          const parsed = JSON.parse(ssUser)
          const ainsId = parsed?.id || parsed?.userId || parsed?.username || null
          if (ainsId) {
            const hash = crypto.createHash('sha256').update(String(ainsId)).digest('hex')

            // Check against main users table
            const { data: userConflict } = await supabase
              .from('users')
              .select('id')
              .eq('ains_user_id_hash', hash)
              .neq('id', userId)
              .maybeSingle()

            // Check against other family slots
            const { data: slotConflict } = await supabase
              .from('family_slots')
              .select('id')
              .eq('ains_user_id_hash', hash)
              .neq('id', slotId)
              .maybeSingle()

            if (userConflict || slotConflict) {
              console.error('[family] AINS account already linked elsewhere')
              return
            }

            await supabase.from('family_slots')
              .update({ ains_user_id_hash: hash })
              .eq('id', slotId)
          }
        } catch {}
      }

      const sessionData = JSON.stringify({ ssToken, ssUser, ssProfile, cookies })
      const { encrypt: enc } = require('../lib/crypto')
      await supabase.from('family_slots').update({
        ains_cookie_encrypted: enc(sessionData),
        ains_email_encrypted:  enc(email),
      }).eq('id', slotId)

      console.log(`[family] Slot ${slotId} connected successfully`)
    } catch (err) {
      console.error(`[family] Slot connect failed: ${err.message}`)
    }
  })()
})

// ── GET /api/family/slots/:slotId/connect-status
// Polls session cookie presence (simple: connected = has encrypted cookie)
router.get('/slots/:slotId/connect-status', requireAuth, requireFamily, async (req, res) => {
  const { data } = await supabase
    .from('family_slots')
    .select('ains_cookie_encrypted')
    .eq('id', req.params.slotId)
    .eq('user_id', req.authUser.id)
    .single()

  res.json({ connected: !!data?.ains_cookie_encrypted })
})

// ── POST /api/family/slots/:slotId/trigger
// Trigger book submission for a specific family slot
router.post('/slots/:slotId/trigger', requireAuth, requireFamily, async (req, res) => {
  const { slotId } = req.params
  const userId = req.authUser.id

  const { data: slot } = await supabase
    .from('family_slots')
    .select('*')
    .eq('id', slotId)
    .eq('user_id', userId)
    .single()

  if (!slot) return res.status(404).json({ error: 'Slot not found' })
  if (!slot.ains_cookie_encrypted) {
    return res.status(400).json({ error: 'AINS not connected for this slot. Please connect first.' })
  }

  let responded = false
  const respond = (payload) => { if (!responded) { responded = true; res.json(payload) } }

  const timeout = setTimeout(() => {
    respond({ success: true, message: 'Submitting books in the background. Check History shortly.' })
  }, 170000)

  try {
    const result = await startBotForSlot(userId, slotId, slot)
    clearTimeout(timeout)
    if (result?.success === false && result?.reason === 'session_expired') {
      respond({ success: false, error: 'AINS session expired. Please reconnect this slot.' })
    } else if (result?.skipped) {
      respond({ success: true, message: "Already submitted this month's quota for this slot." })
    } else {
      const done  = result?.results?.filter(r => r.status === 'success').length ?? 0
      const total = result?.results?.length ?? '?'
      respond({ success: true, message: `Done! ${done}/${total} book(s) submitted.` })
    }
  } catch (err) {
    clearTimeout(timeout)
    respond({ success: false, error: err.message })
  }
})

module.exports = router
