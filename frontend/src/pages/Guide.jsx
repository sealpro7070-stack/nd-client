import { motion } from 'framer-motion'

const up = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.25, 0.1, 0.25, 1] },
})

const STEPS = [
  {
    n: '1',
    title: 'Create your Nilam Auto account',
    body: 'Sign up with your personal email and a password. Check your inbox for a verification link and click it to activate your account.',
    tip: 'Use Gmail, Outlook, or any personal email — avoid school emails which may block automated messages.',
  },
  {
    n: '2',
    title: 'Set your preferences',
    body: 'Go to Settings. Choose your book language (Malay, English, Chinese, or Tamil), number of books per month (1–8), and pick a schedule day for the monthly auto-run.',
  },
  {
    n: '3',
    title: 'Connect your AINS account',
    body: 'On the Dashboard, click "Connect & Submit". A popup will show the AINS login page. Complete your login normally — if you use 2FA (Microsoft/Google), you\'ll verify it yourself. Once logged in, we capture your session and close the popup.',
    tip: 'Your AINS password is used once to log in and immediately discarded. Only your encrypted session is stored — never your password.',
  },
  {
    n: '4',
    title: 'Bot submits automatically',
    body: 'Once your session is captured, the bot automatically logs in using your session and submits your records. This takes 1–2 minutes. Check History to see what was submitted.',
  },
  {
    n: '5',
    title: 'Get reminded — submit in one tap',
    body: 'With monthly reminders enabled, you\'ll get an email on your chosen day each month. Open the app, tap Submit Now, and your records are submitted in under a minute. Works on PC and mobile.',
    tip: 'Because AINS sessions expire after ~30 days, we send a reminder instead of running silently in the background — so you\'re always in control.',
  },
]

export default function Guide() {
  return (
    <motion.div {...up()} className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-heading">Setup Guide</h1>
        <p className="text-muted text-sm mt-1">
          Everything you need to get started. Works on any browser and device — no extension or app required.
        </p>
      </div>

      {/* How it works summary */}
      <motion.div {...up(0.05)} className="bg-brand-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />
        <div className="relative">
          <p className="text-brand-200 text-xs font-bold uppercase tracking-widest mb-2">How it works</p>
          <p className="font-display text-xl font-bold mb-3">You log in. We automate the rest.</p>
          <p className="text-brand-100 text-sm leading-relaxed">
            You log in to AINS yourself (including any 2FA required). We capture your session and use it each month to submit your reading records automatically — so you never miss a deadline.
          </p>
          <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 w-fit">
            <svg className="w-4 h-4 text-brand-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span className="text-white text-xs font-bold">Session-based · No password storage</span>
          </div>
        </div>
      </motion.div>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.n}
            {...up(0.06 + i * 0.04)}
            className="flex gap-5 bg-white rounded-2xl border border-line p-5 hover:border-brand-200 transition-colors"
          >
            <div className="w-9 h-9 bg-brand-600 text-white rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0 mt-0.5 shadow-sm">
              {step.n}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-heading mb-1.5">{step.title}</p>
              <p className="text-sm text-muted leading-relaxed">{step.body}</p>
              {step.tip && (
                <div className="flex items-start gap-2 mt-3 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2">
                  <span className="text-brand-500 text-xs mt-0.5 flex-shrink-0">💡</span>
                  <p className="text-xs text-brand-700 leading-relaxed">{step.tip}</p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* FAQ */}
      <motion.div {...up(0.3)} className="card-p space-y-4">
        <h2 className="font-display text-base font-bold text-heading">Common Questions</h2>
        {[
          {
            q: 'Can I use Google or Microsoft to log in?',
            a: 'Yes — and that\'s the benefit of this approach. You complete the login yourself (including any 2FA), then we capture your session. Unlike the old approach, you\'re in control.',
          },
          {
            q: 'Is my password stored?',
            a: 'No. Your AINS password is used once to log in and capture your session, then immediately discarded — it is never saved to our database. Only your encrypted session cookie is stored.',
          },
          {
            q: 'What if my session expires?',
            a: 'Sessions expire after ~30 days. Go to Settings → AINS Account → Reconnect, log in again, and we\'ll capture a fresh session.',
          },
          {
            q: 'Does it work on mobile?',
            a: 'Yes — open nilam-auto.vercel.app in any mobile browser. Everything works the same way.',
          },
          {
            q: 'How does the monthly reminder work?',
            a: 'On the day you set in Settings, you\'ll receive an email reminder at 9 AM Malaysia time. Open the app and tap Submit Now — the bot submits your records immediately while your session is fresh.',
          },
        ].map((faq, i) => (
          <div key={i} className="border-t border-line pt-4 first:border-0 first:pt-0">
            <p className="text-sm font-bold text-heading mb-1">{faq.q}</p>
            <p className="text-sm text-muted leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}
