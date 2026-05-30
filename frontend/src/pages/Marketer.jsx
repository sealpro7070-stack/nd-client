import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export default function Marketer() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) { setError('Missing link token.'); setLoading(false); return }
      try {
        const res = await fetch(`${BACKEND_URL}/api/referrals/stats?token=${encodeURIComponent(token)}`)
        const d = await res.json()
        if (!res.ok) throw new Error(d.error || 'Could not load your stats.')
        if (!cancelled) setData(d)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-page">
        <div className="w-8 h-8 border-2 border-line border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-5">
        <div className="card-p max-w-sm text-center">
          <div className="text-3xl mb-3">🔗</div>
          <h1 className="font-display text-lg font-bold text-heading mb-1">Link not valid</h1>
          <p className="text-sm text-muted">{error}</p>
        </div>
      </div>
    )
  }

  const s = data.stats
  const shareLink = `${window.location.origin}/?ref=${data.code}`

  return (
    <div className="min-h-screen bg-page px-5 py-12">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div>
            <p className="text-muted text-sm">Marketer Dashboard</p>
            <h1 className="font-display text-3xl font-extrabold text-heading">Hi, {data.owner_name} 👋</h1>
            {!data.active && (
              <p className="mt-2 text-sm font-semibold text-danger-600">Your code is currently disabled. Contact NilamDesk to reactivate.</p>
            )}
          </div>

          {/* Share card */}
          <div className="card-p">
            <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Your referral link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-brand-700 bg-brand-50 rounded-lg px-3 py-2 truncate">{shareLink}</code>
              <button
                onClick={() => { navigator.clipboard?.writeText(shareLink) }}
                className="text-xs font-bold px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition flex-shrink-0"
              >Copy</button>
            </div>
            <p className="text-xs text-muted mt-2">You earn <strong className="text-heading">{Math.round(data.rate * 100)}%</strong> on each new user's first paid order.</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Signups" value={s.signups} />
            <Stat label="Paid Orders" value={s.orders} />
            <Stat label="Pending Earnings" value={`RM${s.pending_total.toFixed(2)}`} cls="bg-amber-50 text-amber-700 border-amber-200" />
            <Stat label="Paid Out" value={`RM${s.paid_total.toFixed(2)}`} cls="bg-ok-50 text-ok-700 border-ok-100" />
          </div>

          {/* Commission list */}
          <div>
            <h2 className="font-display text-base font-bold text-heading mb-3">Your Earnings</h2>
            {data.commissions.length === 0 ? (
              <div className="card-p text-center py-8 text-muted text-sm">No earnings yet. Share your link to get started!</div>
            ) : (
              <div className="space-y-2">
                {data.commissions.map((c, i) => (
                  <div key={i} className="card-p flex items-center justify-between">
                    <div>
                      <div className="font-bold text-heading text-sm">RM{Number(c.commission_amount).toFixed(2)}</div>
                      <div className="text-xs text-muted">{new Date(c.created_at).toLocaleDateString('en-MY')} · order RM{Number(c.order_amount).toFixed(2)}</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                      c.status === 'paid' ? 'bg-ok-100 text-ok-700' : 'bg-amber-100 text-amber-700'
                    }`}>{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function Stat({ label, value, cls = 'bg-brand-50 text-brand-700 border-brand-100' }) {
  return (
    <div className={`rounded-card p-4 border ${cls}`}>
      <div className="font-display text-2xl font-extrabold">{value}</div>
      <div className="text-sm mt-1 font-semibold opacity-80">{label}</div>
    </div>
  )
}
