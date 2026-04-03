import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const PLANS = [
  {
    id: 'plus',
    name: 'Plus',
    price: 'RM18',
    period: '/year',
    books: '50 books/month',
    badge: null,
    features: [
      '50 books per month',
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
    books: '50 books/month × 3 siblings',
    badge: 'Best Value',
    features: [
      '50 books/month per sibling',
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
  const [receiptData, setReceiptData] = useState(null)  // base64 receipt image
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [qrData, setQrData]       = useState(null)

  useEffect(() => {
    if (isOpen) reset()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch(`${BACKEND}/api/payments/qr-settings`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then(d => setQrData(d.qr_data || null))
        .catch(() => {})
    })
  }, [isOpen])

  const reset = () => {
    setStep('plans')
    setSelected(null)
    setReference('')
    setReceiptData(null)
    setError('')
    setSubmitting(false)
  }

  function handleReceiptFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Receipt image must be under 5 MB.'); return }
    const reader = new FileReader()
    reader.onload = ev => setReceiptData(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleClose = () => { reset(); onClose() }

  const handleSelectPlan = (plan) => {
    setSelected(plan)
    setStep('payment')
  }

  const handleSubmitPayment = async () => {
    if (!reference.trim() && !receiptData) {
      setError('Please provide a reference number or payment screenshot so we can verify your payment.')
      return
    }
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
        body: JSON.stringify({ plan: selectedPlan.id, reference: reference.trim(), receipt_data: receiptData || null }),
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
                {qrData ? (
                  <img src={qrData} alt="TNG QR Code" className="w-48 h-48 mx-auto rounded-lg object-contain" />
                ) : (
                  <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300">
                    <span className="text-3xl">📷</span>
                    <p className="text-xs text-muted px-4 text-center">TNG QR code not yet uploaded by admin.</p>
                  </div>
                )}
                <p className="text-xs text-muted">
                  After paying, enter your reference number and upload your payment screenshot below.
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

              {/* Receipt upload */}
              <div>
                <label className="block text-sm font-medium text-heading mb-1">
                  Payment Screenshot <span className="text-muted font-normal">(recommended — speeds up approval)</span>
                </label>
                <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-line rounded-xl p-4 cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors">
                  {receiptData ? (
                    <img src={receiptData} alt="Receipt preview" className="max-h-40 rounded-lg object-contain" />
                  ) : (
                    <>
                      <span className="text-2xl mb-1">📎</span>
                      <span className="text-xs text-muted font-semibold">Click to upload screenshot (max 5 MB)</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleReceiptFile} />
                </label>
                {receiptData && (
                  <button onClick={() => setReceiptData(null)} className="text-xs text-danger-500 mt-1 hover:underline">Remove</button>
                )}
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
