/**
 * leads.js — Quiz marketing funnel lead capture
 *
 * Flow:
 *   1. A visitor takes a short 3-question quiz on /quiz (no login).
 *   2. They enter name + email and consent to be contacted.
 *   3. POST /api/leads stores the lead (answers, computed result, ref).
 *   4. Admin reviews/exports leads in the Admin "Leads" tab and follows up
 *      manually via email.
 *
 * The table is RLS-locked: only this backend (service role) reads/writes it.
 */

const express  = require('express')
const router   = express.Router()
const supabase = require('../lib/supabase')
const { requireAuth, isAdminEmail, checkRateLimit } = require('../lib/auth-middleware')

function requireAdmin(req, res, next) {
  if (!isAdminEmail(req.authUser?.email)) {
    return res.status(403).json({ error: 'Admin only' })
  }
  next()
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_CHOICES = ['A', 'B', 'C']

// Answer weights → an estimated "hours per month wasted on NILAM" number.
// Deliberately a believable hook, not a precise measurement.
function computeHours(answers) {
  const q1 = { A: 1, B: 3, C: 6 }[answers.q1] ?? 1
  const mult = { A: 1.5, B: 1.2, C: 1 }[answers.q2] ?? 1
  const q3 = { A: 1, B: 4, C: 7 }[answers.q3] ?? 1
  const hours = Math.round((q1 + q3) * mult)
  return Math.min(Math.max(hours, 2), 20) // clamp 2–20
}

function normalizeRef(raw) {
  if (!raw || typeof raw !== 'string') return null
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32)
  return code || null
}

// ── POST /api/leads  (PUBLIC)
// Body: { name, email, answers:{q1,q2,q3}, consent, ref? }
router.post('/', async (req, res) => {
  // Rate-limit by IP to keep junk/spam rows out (10 submissions/hour/IP).
  const ip = (req.headers['x-forwarded-for'] || req.ip || 'unknown').toString().split(',')[0].trim()
  if (!checkRateLimit(`lead:${ip}`, 10, 3600000)) {
    return res.status(429).json({ error: 'Too many submissions. Please try again later.' })
  }

  const name  = (req.body.name || '').toString().trim().slice(0, 80)
  const email = (req.body.email || '').toString().trim().toLowerCase().slice(0, 120)
  const consent = req.body.consent === true
  const ref = normalizeRef(req.body.ref)
  const raw = req.body.answers || {}

  if (!name) return res.status(400).json({ error: 'Name is required.' })
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required.' })
  if (!consent) return res.status(400).json({ error: 'Please tick the consent box to continue.' })

  // Sanitise answers to just the three known choices.
  const answers = {
    q1: VALID_CHOICES.includes(raw.q1) ? raw.q1 : null,
    q2: VALID_CHOICES.includes(raw.q2) ? raw.q2 : null,
    q3: VALID_CHOICES.includes(raw.q3) ? raw.q3 : null,
  }
  const computed_hours = computeHours(answers)

  const { error } = await supabase
    .from('quiz_leads')
    .insert({ name, email, answers, computed_hours, lang: 'en', ref, consent })

  if (error) {
    console.error('[leads] insert failed:', error.message)
    return res.status(500).json({ error: 'Could not save. Please try again.' })
  }

  res.json({ success: true, hours: computed_hours })
})

// ── GET /api/leads  (ADMIN)  — full list for review/export
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('quiz_leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ leads: data })
})

// ── POST /api/leads/status  (ADMIN)  — mark a lead new/contacted/converted
router.post('/status', requireAuth, requireAdmin, async (req, res) => {
  const { id, status } = req.body
  if (!id || !['new', 'contacted', 'converted'].includes(status)) {
    return res.status(400).json({ error: 'id and a valid status are required.' })
  }
  const { data, error } = await supabase
    .from('quiz_leads')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true, lead: data })
})

module.exports = router
