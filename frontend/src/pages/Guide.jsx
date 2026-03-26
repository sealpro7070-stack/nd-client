import { motion } from 'framer-motion'

const up = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1] },
})

const STEPS = [
  {
    n: '1',
    title: 'Download the Chrome Extension',
    desc: 'Click the button below to download the Nilam Auto extension (.zip file). This only works on desktop PC with Google Chrome.',
    tip: 'Does not work on Firefox, Safari, or mobile browsers.',
    cta: true,
  },
  {
    n: '2',
    title: 'Extract the zip file',
    desc: 'Right-click the downloaded .zip file → "Extract All" (Windows) or double-click (Mac). You will get a folder called nilam-auto-extension.',
  },
  {
    n: '3',
    title: 'Open Chrome Extensions page',
    desc: 'Open Google Chrome. In the address bar type chrome://extensions and press Enter.',
    code: 'chrome://extensions',
  },
  {
    n: '4',
    title: 'Enable Developer Mode',
    desc: 'In the top-right corner of the Extensions page, toggle on "Developer mode". New buttons will appear at the top left.',
  },
  {
    n: '5',
    title: 'Load the extension',
    desc: 'Click "Load unpacked". A file picker will open — select the nilam-auto-extension folder you extracted in Step 2.',
  },
  {
    n: '6',
    title: 'Pin it to your toolbar',
    desc: 'Click the puzzle-piece icon in Chrome\'s toolbar → find Nilam Auto → click the pin icon. The Nilam Auto icon will now always show in your toolbar.',
  },
  {
    n: '7',
    title: 'Log in to AINS',
    desc: 'Open ains.moe.gov.my in Chrome and sign in with your school (DELIMa) credentials as usual.',
  },
  {
    n: '8',
    title: 'Save your session',
    desc: 'While still on ains.moe.gov.my, click the Nilam Auto icon in your Chrome toolbar. Enter your Nilam Auto email, then click "Save Session". You will see a green confirmation.',
    tip: 'The extension never stores your password — it only reads your active session token.',
  },
  {
    n: '9',
    title: 'Submit your records',
    desc: 'Come back to this dashboard, choose your language and number of books, then click "Submit Now". Nilam Auto logs in to AINS and submits your records automatically.',
  },
]

export default function Guide() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <motion.div {...up(0)}>
        <p className="text-brand-600 text-xs font-bold uppercase tracking-widest mb-1">Setup Guide</p>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-heading">
          How to use Nilam Auto
        </h1>
        <p className="text-muted text-sm mt-2">Follow these steps once — then it runs automatically every month.</p>
      </motion.div>

      {/* Download card */}
      <motion.div {...up(0.05)} className="bg-brand-600 rounded-card p-5 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/5 rounded-full pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-brand-200 text-xs font-bold uppercase tracking-widest mb-1">Chrome Extension</p>
            <p className="font-display font-bold text-lg leading-tight">Nilam Auto Extension</p>
            <p className="text-brand-200 text-xs mt-1">Desktop PC only · Google Chrome required · Free</p>
          </div>
          <a
            href="/nilam-auto-extension.zip"
            download
            className="flex-shrink-0 flex items-center gap-2 bg-white text-brand-600 font-bold px-6 py-3 rounded-xl hover:bg-brand-50 transition-colors text-sm whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Download (.zip)
          </a>
        </div>
      </motion.div>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.n}
            {...up(0.05 + i * 0.03)}
            className="bg-white rounded-2xl border border-line p-4 flex gap-4"
          >
            <span className="w-8 h-8 flex-shrink-0 bg-brand-600 text-white rounded-xl flex items-center justify-center text-sm font-extrabold mt-0.5">
              {step.n}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-heading text-sm mb-1">{step.title}</p>
              <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
              {step.code && (
                <code className="inline-block mt-2 bg-gray-100 text-brand-600 text-xs font-mono px-2.5 py-1 rounded-lg">
                  {step.code}
                </code>
              )}
              {step.cta && (
                <a
                  href="/nilam-auto-extension.zip"
                  download
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-brand-600 hover:underline"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  Download nilam-auto-extension.zip
                </a>
              )}
              {step.tip && (
                <div className="flex items-start gap-2 mt-2.5 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2">
                  <span className="text-brand-500 text-xs mt-0.5 flex-shrink-0">💡</span>
                  <p className="text-xs text-brand-700 leading-relaxed">{step.tip}</p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Done banner */}
      <motion.div {...up(0.35)} className="bg-ok-50 border border-ok-200 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-10 h-10 bg-ok-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-ok-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
        </div>
        <div>
          <p className="font-bold text-ok-800 text-sm">You're all set!</p>
          <p className="text-ok-700 text-xs mt-0.5">After saving your session once, Nilam Auto handles the rest every month automatically.</p>
        </div>
      </motion.div>

    </div>
  )
}
