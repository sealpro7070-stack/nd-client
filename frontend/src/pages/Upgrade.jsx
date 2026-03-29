import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

const FREE_FEATURES = [
  '1 book / month',
  '1 language only',
  '7-day history',
  'Manual submit only',
]

const PRO_FEATURES = [
  'Up to 50 books / month',
  'All 4 languages',
  'Full submission history',
  'Monthly auto-schedule',
  'Status notifications',
  'Priority support',
]

const FAMILY_FEATURES = [
  'Up to 3 AINS accounts',
  '50 books/month per account',
  'All PRO features included',
  'Perfect for siblings'
]

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export default function Upgrade() {
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState(null) // 'plus' or 'family'
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [receiptData, setReceiptData] = useState(null)

  const handleSelectPlan = async (plan) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert("Please create an account or sign in first to upgrade.")
      navigate('/')
      return
    }
    setSelectedPlan(plan)
    setShowModal(true)
    setErrorMsg('')
    setSuccessMsg('')
    setReceiptData(null)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('File too large. Max 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => setReceiptData(event.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmitPayment = async () => {
    if (!receiptData) {
      setErrorMsg('Please upload your receipt.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      const res = await fetch(`${BACKEND}/api/payments/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: selectedPlan,
          receipt_data: receiptData
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit request')

      setSuccessMsg('Receipt uploaded! Admin will approve it shortly.')
      setTimeout(() => navigate('/dashboard'), 3000)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-5 py-16">

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => navigate('/dashboard')}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm font-semibold text-muted hover:text-heading transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back
      </motion.button>

      <div className="w-full max-w-4xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="w-16 h-16 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-600 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            Nilam Auto Pro & Family
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-heading leading-tight">
            Unlock NILAM Auto<br />
            <span className="text-brand-600">Fully.</span>
          </h1>
          <p className="text-muted text-base mt-3 max-w-lg mx-auto">
            Submit up to 50 books per language automatically. Get the Family plan for up to 3 separate AINS accounts.
          </p>
        </motion.div>

        {/* Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
        >
          {/* Free */}
          <div className="card-p flex flex-col">
            <p className="text-muted font-bold text-sm mb-1">Free</p>
            <p className="font-display text-2xl font-extrabold text-heading mb-4">RM0</p>
            <ul className="space-y-2.5 mb-8 flex-1">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted">
                  <svg className="w-4 h-4 text-subtle flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button disabled className="btn-ghost w-full py-3 opacity-50 cursor-not-allowed">Current Plan</button>
          </div>

          {/* Pro */}
          <div className="bg-brand-600 rounded-card p-6 relative overflow-hidden flex flex-col">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/5 rounded-full pointer-events-none" />
            <div className="relative flex-1">
              <p className="text-brand-200 font-bold text-sm mb-1">Pro</p>
              <p className="font-display text-2xl font-extrabold text-white mb-4">RM18 <span className="text-sm font-medium">/ yr</span></p>
              <ul className="space-y-2.5 mb-8">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white">
                    <svg className="w-4 h-4 text-brand-200 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => handleSelectPlan('plus')} className="bg-white text-brand-700 font-bold w-full py-3 rounded-xl hover:bg-gray-50 transition-colors mt-auto relative z-10">
              Unlock Pro
            </button>
          </div>

          {/* Family */}
          <div className="bg-brand-800 rounded-card p-6 relative overflow-hidden flex flex-col">
            <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
            <div className="relative flex-1">
              <p className="text-brand-300 font-bold text-sm mb-1">Family</p>
              <p className="font-display text-2xl font-extrabold text-white mb-4">RM48 <span className="text-sm font-medium">/ yr</span></p>
              <ul className="space-y-2.5 mb-8">
                {FAMILY_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white">
                    <svg className="w-4 h-4 text-brand-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => handleSelectPlan('family')} className="bg-brand-500 text-white font-bold w-full py-3 rounded-xl hover:bg-brand-400 transition-colors mt-auto relative z-10">
              Unlock Family
            </button>
          </div>
        </motion.div>
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-muted hover:text-heading">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>

            <h3 className="font-display text-2xl font-bold mb-4">Complete Payment</h3>
            <p className="text-sm text-muted mb-4">
              You selected the <strong>{selectedPlan === 'plus' ? 'Pro (RM18/yr)' : 'Family (RM48/yr)'}</strong> plan.
              Please scan the QR code to pay, then upload your receipt below.
            </p>

            <div className="bg-gray-50 p-4 rounded-xl border border-line flex justify-center mb-6">
              <img src="/qr.png" alt="Touch n Go QR Code" className="max-w-[180px] rounded-lg shadow-sm" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Upload Receipt</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="w-full border border-line rounded-lg p-2 text-sm focus:outline-none"
                />
              </div>

              {receiptData && (
                <div className="h-24 w-full bg-cover bg-center rounded-lg border border-line" style={{ backgroundImage: `url(${receiptData})` }} />
              )}

              {errorMsg && <p className="text-xs font-semibold text-danger-600">{errorMsg}</p>}
              {successMsg && <p className="text-sm font-bold text-ok-600">{successMsg}</p>}

              <button 
                onClick={handleSubmitPayment} 
                disabled={submitting || !receiptData || successMsg} 
                className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
