import { motion } from 'framer-motion'

const up = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.25, 0.1, 0.25, 1] },
})

const STEPS = [
  {
    n: '1',
    title: 'Create your NilamDesk account',
    body: 'Sign up with your personal email and a password. Check your inbox for a verification link and click it to activate your account. You get 8 free book credits on sign-up — no payment needed to try it out.',
    tip: 'Use Gmail, Outlook, or any personal email — avoid school emails which may block verification messages.',
  },
  {
    n: '2',
    title: 'Connect your AINS account',
    body: 'On the Dashboard, click "Connect AINS Account". Enter your AINS (DELIMa) email and password. The system will log in on your behalf — if your account uses Microsoft 2FA, you\'ll see a number to tap in your Microsoft Authenticator app. Once approved, your session is captured and active.',
    tip: 'Your password is used once to log in and immediately discarded — it is never saved. If connection fails even with correct credentials, Microsoft may have blocked the automated sign-in. Fix: open ains.moe.gov.my in your browser, log in manually once, then try connecting again here.',
  },
  {
    n: '3',
    title: 'Submit immediately — sessions are short-lived',
    body: 'Your AINS session expires in roughly 30 minutes. Once connected, go straight to the Dashboard and tap "Submit Now" without delay. Choose your language and number of books, then submit. The bot uses your active session to fill in your reading records one by one.',
    tip: 'Do not wait after connecting. Connect → Submit Now is a single sitting. If you wait too long and the session expires, you will need to reconnect before submitting.',
  },
  {
    n: '4',
    title: 'Understand submission results',
    body: 'Each book will show Done, Failed, or Daily limit reached. A "Failed" result usually means AINS rejected that book (e.g. already submitted, or the form was updated). A "Daily limit reached" means AINS\'s hard cap of 30 books/day was full — those credits are not charged and the books can be resubmitted the next day.',
    tip: 'Credits are only deducted when a submission succeeds. Failed and limit-reached books are never charged.',
  },
  {
    n: '5',
    title: 'Next time — reconnect and submit again',
    body: 'Every submission session requires a fresh connection. Each time you want to submit books, click "Connect AINS Account" on the Dashboard, log in, approve MFA, and then tap Submit Now straight away. There is no persistent background automation — every run is triggered by you.',
    tip: 'This keeps you fully in control. NilamDesk never submits without your active involvement each session.',
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
          <p className="font-display text-xl font-bold mb-3">You connect. We handle the form filling.</p>
          <p className="text-brand-100 text-sm leading-relaxed">
            Each session: connect your AINS account (including 2FA), then tap Submit Now. We use your active session to fill in all your reading records automatically — no manual form clicking required.
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
            q: 'Connection failed — but my password is correct. Why?',
            a: 'Microsoft sometimes blocks automated sign-ins from server IPs as a security measure. This is not a wrong password. Fix: open ains.moe.gov.my in your browser, log in manually once, then come back to NilamDesk and try connecting again. The manual login resets Microsoft\'s risk score for your account.',
          },
          {
            q: 'What is the 30 books per day limit?',
            a: 'AINS (the government portal) enforces a maximum of 30 book records per day per account. NilamDesk cannot bypass this — it is a server-side limit on the government system. If you hit it, your remaining books are not charged and will be available to submit the next day.',
          },
          {
            q: 'Why did a submission fail?',
            a: 'A submission can fail for a few reasons: (1) AINS updated their form and our automation couldn\'t complete it — this is the most common cause and is fixed as updates are rolled out; (2) the book was already submitted to that AINS account before; (3) your session expired mid-run. Failed submissions are not charged credits.',
          },
          {
            q: 'Is my password stored?',
            a: 'No. Your AINS password is used once to log in and capture your session, then immediately discarded — it is never saved to our database. Only your encrypted session cookie is stored.',
          },
          {
            q: 'How many free books do I get?',
            a: 'You get 8 free book credits when you sign up — no payment required. Credits are only deducted when a submission succeeds. To submit more, upgrade to the annual plan (RM49.90/year for 150 credits).',
          },
          {
            q: 'How long does a session last?',
            a: 'Your AINS session is active for roughly 30 minutes after connecting. This means you must connect and submit in the same sitting — do not wait after connecting. Each time you want to submit books, start with a fresh Connect.',
          },
          {
            q: 'Does it work on mobile?',
            a: 'Yes — open nilamdesk.com in any mobile browser. The full flow including connecting AINS and submitting books works on phone.',
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
