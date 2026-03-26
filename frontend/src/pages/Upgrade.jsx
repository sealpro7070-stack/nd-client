import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const FREE_FEATURES = [
  '1 book / month',
  '1 language only',
  '7-day history',
  'Manual submit only',
]

const PRO_FEATURES = [
  'Up to 8 books / month',
  'All 4 languages',
  'Full submission history',
  'Monthly auto-schedule',
  'Status notifications',
  'Priority support',
]

export default function Upgrade() {
  const navigate = useNavigate()

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

      <div className="w-full max-w-[480px]">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          {/* Lock icon */}
          <div className="w-16 h-16 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-600 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            Nilam Auto Pro
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-heading leading-tight">
            Unlock NILAM Auto<br />
            <span className="text-brand-600">Fully.</span>
          </h1>
          <p className="text-muted text-base mt-3 max-w-sm mx-auto">
            Submit up to 8 books per month in all languages — automatically. Less than the price of a coffee.
          </p>

          {/* Price */}
          <div className="mt-7 bg-white border border-line rounded-2xl px-8 py-5 shadow-card inline-block">
            <span className="text-muted text-sm">Only</span>
            <div className="flex items-end justify-center gap-2 mt-1">
              <span className="font-display text-5xl font-extrabold text-brand-600">RM18</span>
              <span className="text-muted text-lg mb-1.5 font-semibold">/ year</span>
            </div>
            <p className="text-subtle text-xs mt-1">≈ RM1.50 / month · less than coffee</p>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap justify-center gap-4 mt-5 text-xs text-muted font-semibold">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-ok-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              1,000+ Malaysian students
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-ok-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Cancel anytime
            </span>
          </div>
        </motion.div>

        {/* Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          {/* Free */}
          <div className="card-p">
            <p className="text-muted font-bold text-sm mb-1">Free</p>
            <p className="font-display text-2xl font-extrabold text-heading mb-4">RM0</p>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted">
                  <svg className="w-4 h-4 text-subtle flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="bg-brand-600 rounded-card p-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/5 rounded-full pointer-events-none" />
            <div className="relative">
              <p className="text-brand-200 font-bold text-sm mb-1">Pro</p>
              <p className="font-display text-2xl font-extrabold text-white mb-4">RM18 / yr</p>
              <ul className="space-y-2.5">
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
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <button className="btn-primary w-full py-4 text-base">
            Unlock Now — RM18 / Year
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
          <p className="text-center text-subtle text-xs mt-3">
            Secure payment via ToyyibPay. Questions? Contact us by email.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
