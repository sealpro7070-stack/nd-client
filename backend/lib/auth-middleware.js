const supabase = require('./supabase')

// In-memory rate limit: max 5 trigger runs per user per hour
const rateLimitMap = new Map()

function checkRateLimit(userId) {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 3600000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' })
    }

    // Ensure the userId in the request matches the authenticated user
    const requestUserId = req.body?.userId || req.query?.userId
    if (requestUserId && requestUserId !== user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    req.authUser = user
    next()
  } catch {
    return res.status(401).json({ error: 'Authentication failed' })
  }
}

module.exports = { requireAuth, checkRateLimit }
