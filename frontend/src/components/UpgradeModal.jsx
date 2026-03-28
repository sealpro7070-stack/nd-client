import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// ── TNG QR placeholder ────────────────────────────────────────────────────────
// Replace TNG_QR_URL with your actual TNG QR image URL once you upload it.
// You can upload the image to Supabase Storage or any image host.
const TNG_QR_URL = import.meta.env.VITE_TNG_QR_URL || null

const PLANS = [
  {
    id: 'plus',
    name: 'Plus',
    price: 'RM18',
    period: '/year',
    books: '15 books/month',
    badge: null,
    features: [
      '15 books per month',
      'All 4 languages',
      'Auto-schedule',
      'Full submission history',
      '1 AINS account',
    ],
    color: 'brand',
  },
  {
    id: 'family',
    name: 'Family',
    price: 'RM48',
    period: '/year',
    books: '15 books/month × 3 siblings',
    badge: 'Best Value',
    features: [
      '15 books/month per sibling',
      'Up to 3 AINS accounts',
      'All 4 languages per slot',
      'Manage all from one dashboard',
      'Full history for each sibling',
    ],
    color: 'ok',
  },
]

export default function UpgradeModal({ isOpen, onClose, currentPlan }) {
  const [step, setStep]           = useState('plans')  // 'plans' | 'payment' | 'done'
  const [selectedPlan, setSelected] = useState(null)
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  const reset = () => {
    setStep('plans')
    setSelected(null)
    setReference('')
    setError('')
    setSubmitting(false)
  }

  const handleClose = () => { reset(); onClose() }

  const handleSelectPlan = (plan) => {
    setSelected(plan)
    setStep('payment')
  }

  const handleSubmitPayment = async () => {
    setSubmitting(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('You must be logged in to upgrade.')
      const res = await fetch(`${BACKEND}/api/payments/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: selectedPlan.id, reference: reference.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit request')
      setStep('done')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white sm:rounded-2xl w-full sm:max-w-lg shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '95dvh' }}
      >
        {/* Header */}
        <div className="bg-brand-600 text-white p-4 flex items-center justify-between flex-shrink-0">
          <h3 className="font-bold text-sm sm:text-base">
            {step === 'plans'   && 'Upgrade your plan'}
            {step === 'payment' && `Pay for ${selectedPlan?.name} — ${selectedPlan?.price}/year`}
            {step === 'done'    && 'Payment submitted!'}
          </h3>
          <button onClick={handleClose} className="text-white/60 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-4">

          {/* ── Step 1: Plan picker ── */}
          {step === 'plans' && (
            <>
              {currentPlan && currentPlan !== 'free' && (
                <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 text-sm text-brand-800">
                  You are currently on the <strong className="capitalize">{currentPlan}</strong> plan. Upgrading will extend your subscription by 1 year from today.
                </div>
              )}
              <div className="grid gap-4">
                {PLANS.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan)}
                    className={`relative text-left border-2 rounded-2xl p-4 transition-all hover:scale-[1.01] active:scale-[0.99] ${
                      plan.color === 'ok'
                        ? 'border-ok-400 bg-ok-50 hover:border-ok-500'
                        : 'border-brand-400 bg-brand-50 hover:border-brand-500'
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute top-3 right-3 bg-ok-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {plan.badge}
                      </span>
                    )}
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="font-display text-2xl font-extrabold text-heading">{plan.price}</span>
                      <span className="text-sm text-muted">{plan.period}</span>
                    </div>
                    <p className="font-bold text-heading text-sm mb-1">{plan.name}</p>
                    <p className="text-xs text-muted mb-3">{plan.books}</p>
                    <ul className="space-y-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-body">
                          <span className="text-ok-500 font-bold">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              <button onClick={handleClose} className="w-full py-2.5 rounded-xl border border-line text-muted font-bold text-sm hover:bg-gray-50">
                Maybe later
              </button>
            </>
          )}

          {/* ── Step 2: Payment ── */}
          {step === 'payment' && selectedPlan && (
            <>
              <div className="bg-gray-50 border border-line rounded-xl p-4 text-center space-y-1">
                <p className="text-sm text-muted">Amount to pay</p>
                <p className="font-display text-3xl font-extrabold text-heading">{selectedPlan.price}</p>
                <p className="text-xs text-muted">{selectedPlan.name} Plan · 1 year</p>
              </div>

              {/* TNG QR Code */}
              <div className="bg-white border border-line rounded-xl p-4 text-center space-y-3">
                <p className="text-sm font-semibold text-heading">Scan to pay with TNG eWallet</p>
                {TNG_QR_URL ? (
                  <img src={TNG_QR_URL} alt="TNG QR Code" className="w-48 h-48 mx-auto rounded-lg object-contain" />
                ) : (
                  <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300">
                    <span className="text-3xl">📷</span>
                    <p className="text-xs text-muted px-4 text-center">TNG QR code not yet uploaded.<br/>Set VITE_TNG_QR_URL in Vercel env.</p>
                  </div>
                )}
                <p className="text-xs text-muted">
                  After paying, enter your TNG reference number below so we can verify your payment.
                </p>
              </div>

              {/* Reference input */}
              <div>
                <label className="block text-sm font-medium text-heading mb-1">
                  TNG Reference Number <span className="text-muted font-normal">(optional but speeds up approval)</span>
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="e.g. TNG2025XXXXXXXX"
                  className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              {error && (
                <div className="bg-danger-50 border border-danger-200 rounded-lg p-3 text-sm text-danger-700">
                  {error}
                </div>
              )}

              <p className="text-xs text-muted bg-amber-50 border border-amber-200 rounded-lg p-3">
                After submitting, your request will be reviewed manually within 24 hours. You will be activated as soon as payment is confirmed.
              </p>

              <button
                onClick={handleSubmitPayment}
                disabled={submitting}
                className="w-full py-2.5 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Submitting...' : "I've paid — Submit request"}
              </button>
              <button onClick={() => setStep('plans')} className="w-full py-2.5 rounded-xl border border-line text-muted font-bold text-sm hover:bg-gray-50">
                ← Back
              </button>
            </>
          )}

          {/* ── Step 3: Done ── */}
          {step === 'done' && (
            <div className="py-8 text-center space-y-4">
              <div className="text-5xl">🎉</div>
              <div>
                <p className="font-bold text-heading text-lg">Request submitted!</p>
                <p className="text-sm text-muted mt-2 max-w-xs mx-auto">
                  Your payment request has been sent to the admin for approval. You will be upgraded within 24 hours once payment is confirmed.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full py-2.5 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
