const supabase = require('./supabase')

// Support comma-separated ADMIN_EMAIL for multiple admins
// e.g. ADMIN_EMAIL=admin@example.com,second-admin@example.com
const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim()).filter(Boolean)
function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email)
}

// In-memory rate limit: max 5 trigger runs per user per hour
// NOTE: TTL eviction prevents unbounded memory growth.
// For multi-instance deployments, replace with Redis.
const rateLimitMap = new Map()

// Evict expired entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (entry.resetAt < now) rateLimitMap.delete(key)
  }
}, 10 * 60 * 1000)

function checkRateLimit(userId, max = 5, windowMs = 3600000) {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

// Token cache: { token: { user, expiresAt } }
// Caches validated tokens for 60 seconds to reduce Supabase Auth round-trips
const tokenCache = new Map()
const TOKEN_CACHE_TTL = 60 * 1000

// Evict expired cache entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of tokenCache) {
    if (entry.expiresAt < now) tokenCache.delete(key)
  }
}, 5 * 60 * 1000)

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  // Check cache first
  const cached = tokenCache.get(token)
  if (cached && cached.expiresAt > Date.now()) {
    req.authUser = cached.user
    return next()
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' })
    }

    tokenCache.set(token, { user, expiresAt: Date.now() + TOKEN_CACHE_TTL })
    req.authUser = user
    next()
  } catch (err) {
    console.error('[auth] Token validation failed:', err.message)
    return res.status(401).json({ error: 'Authentication failed' })
  }
}

module.exports = { requireAuth, checkRateLimit, isAdminEmail, ADMIN_EMAILS }
