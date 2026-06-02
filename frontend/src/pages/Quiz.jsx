import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MascotMark } from '../components/Mascot'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// 3-question lead-capture funnel aimed at students. Answers feed a "hours
// wasted per month" estimate (computed server-side), then we ask for name +
// email to show the result and push them into signup.
const QUESTIONS = [
  {
    key: 'q1',
    q: 'How many books do you need to log for NILAM?',
    options: [
      { v: 'A', label: 'Under 20' },
      { v: 'B', label: '20–50' },
      { v: 'C', label: "50+ / I've lost count 💀" },
    ],
  },
  {
    key: 'q2',
    q: "Real talk — how's your NILAM going?",
    options: [
      { v: 'A', label: 'I type them in one by one (pain)' },
      { v: 'B', label: 'I keep forgetting / falling behind' },
      { v: 'C', label: "Haven't even started 😅" },
    ],
  },
  {
    key: 'q3',
    q: 'How much do you dread doing it?',
    options: [
      { v: 'A', label: "It's just annoying" },
      { v: 'B', label: 'I procrastinate every time' },
      { v: 'C', label: 'I’d pay to never touch it again' },
    ],
  },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Quiz() {
  const navigate = useNavigate()
  // step: 0,1,2 = questions · 3 = capture form · 4 = result
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hours, setHours] = useState(null)

  // Capture ?ref= so a marketer sharing the quiz still gets attribution.
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref')
      if (ref) {
        const code = ref.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32)
        if (code) localStorage.setItem('nilam_ref', code)
      }
    } catch {}
  }, [])

  function pick(key, v) {
    setAnswers(a => ({ ...a, [key]: v }))
    setStep(s => s + 1)
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Please enter your name.'); return }
    if (!EMAIL_RE.test(email.trim())) { setError('Please enter a valid email.'); return }
    if (!consent) { setError('Please tick the box to continue.'); return }
    setLoading(true)
    try {
      let ref
      try { ref = localStorage.getItem('nilam_ref') || undefined } catch {}
      const res = await fetch(`${BACKEND}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), answers, consent, ref }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error || 'Something went wrong.')
      setHours(data.hours)
      setStep(4)
    } catch (err) {
      const net = err.name === 'TypeError' || /failed to fetch|networkerror/i.test(err.message)
      setError(net ? 'Connection error — please try again.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  function goSignup() {
    navigate(`/?signup=1&email=${encodeURIComponent(email.trim())}#auth`)
  }

  const progress = Math.min(step, 3) / 3

  return (
    <div className="min-h-screen bg-cream overflow-x-hidden flex flex-col">
      <nav className="flex items-center gap-2.5 px-5 py-4 sm:px-10 sm:py-6">
        <MascotMark size={30} />
        <span className="font-display font-black tracking-tight text-ink text-base sm:text-lg">
          Nilam<span className="text-cobalt">Desk</span>
        </span>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-lg">
          {/* Progress bar (hidden on result) */}
          {step < 4 && (
            <div className="mb-8">
              <div className="h-2 bg-ink/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cobalt transition-all duration-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="font-mono text-ink/40 text-xs mt-2 tracking-widest uppercase">
                {step < 3 ? `Question ${step + 1} of 3` : 'Almost there'}
              </p>
            </div>
          )}

          {/* Question steps */}
          {step < 3 && (
            <div>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-ink leading-tight mb-6">
                {QUESTIONS[step].q}
              </h1>
              <div className="space-y-3">
                {QUESTIONS[step].options.map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => pick(QUESTIONS[step].key, opt.v)}
                    className="w-full text-left px-5 py-4 rounded-2xl bg-white border-[2.5px] border-ink font-bold text-ink hover:bg-cobalt hover:text-cream hover:-translate-y-0.5 transition-all duration-150 shadow-[3px_3px_0_0_rgba(15,23,42,1)]"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="mt-6 font-bold text-sm text-ink/50 hover:text-ink"
                >
                  ← Back
                </button>
              )}
            </div>
          )}

          {/* Capture form */}
          {step === 3 && (
            <form onSubmit={submit}>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-ink leading-tight mb-2">
                Where should we send your result?
              </h1>
              <p className="text-ink/60 text-sm mb-6">
                See how much time you’re losing — plus a free setup guide to finish NILAM fast.
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-5 py-4 rounded-2xl bg-white border-[2.5px] border-ink font-bold text-ink placeholder:text-ink/30 focus:outline-none focus:border-cobalt"
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full px-5 py-4 rounded-2xl bg-white border-[2.5px] border-ink font-bold text-ink placeholder:text-ink/30 focus:outline-none focus:border-cobalt"
                />
                <p className="text-ink/40 text-xs px-1">
                  Tip: use your personal email (Gmail/Outlook), not a school email.
                </p>
                <label className="flex items-start gap-2.5 px-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={e => setConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-cobalt flex-shrink-0"
                  />
                  <span className="text-ink/60 text-xs leading-relaxed">
                    Send me a free setup guide + tips to finish NILAM fast. I can unsubscribe anytime.
                  </span>
                </label>
              </div>

              {error && <p className="text-red-600 text-sm font-bold mt-4">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full chunky-btn chunky-btn--primary justify-center disabled:opacity-60"
              >
                {loading ? 'Calculating…' : 'See my result →'}
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-4 block mx-auto font-bold text-sm text-ink/50 hover:text-ink"
              >
                ← Back
              </button>
            </form>
          )}

          {/* Result */}
          {step === 4 && (
            <div className="text-center">
              <p className="font-mono text-cobalt text-xs font-bold tracking-[0.3em] uppercase mb-3">
                Your result
              </p>
              <h1 className="font-display font-black text-3xl sm:text-4xl text-ink leading-tight">
                You’re losing about <span className="text-cobalt">{hours} hours a month</span> to NILAM. 💀
              </h1>
              <p className="text-ink/60 mt-4 text-base">
                And it comes back every. single. month.
              </p>
              <div className="mt-8 bg-white border-[2.5px] border-ink rounded-3xl p-6 shadow-[5px_5px_0_0_rgba(15,23,42,1)] text-left">
                <p className="font-display font-black text-xl text-ink mb-3">
                  NilamDesk does it for you in minutes.
                </p>
                <p className="text-ink/70 text-sm leading-relaxed mb-4">
                  Connect your AINS once — we fill in all your reading records automatically. You just chill.
                </p>
                <ul className="space-y-2 text-sm font-bold text-ink mb-5">
                  <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> 8 free books to start — no payment</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Works on your phone, no app to download</li>
                </ul>
                <button onClick={goSignup} className="w-full chunky-btn chunky-btn--primary justify-center">
                  Get my 8 free books →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
