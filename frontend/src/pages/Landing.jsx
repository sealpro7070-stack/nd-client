import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const up = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] },
})

const inView = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] },
})

const DEMO_BOOKS = [
  { title: 'Hujan', author: 'Nur Maisarah', lang: 'BM' },
  { title: 'Totto-Chan', author: 'Tetsuko K.', lang: 'BM' },
  { title: 'Harry Potter 1', author: 'J.K. Rowling', lang: 'EN' },
  { title: 'The Alchemist', author: 'Paulo Coelho', lang: 'EN' },
]

function PhoneMockup() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setPhase(p => (p + 1) % 5), 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <motion.div {...up(0.3)} className="relative flex justify-center">
      {/* Subtle glow behind phone */}
      <div className="absolute inset-4 bg-brand-100/60 rounded-3xl blur-2xl pointer-events-none" />

      {/* Phone frame */}
      <div className="relative w-64 bg-white rounded-[2rem] border-2 border-gray-200 shadow-card-lg overflow-hidden">
        {/* Status bar */}
        <div className="bg-heading px-5 pt-3 pb-2 flex items-center justify-between">
          <span className="text-white text-xs font-mono">9:41</span>
          <div className="w-16 h-4 bg-heading rounded-full border border-white/20" />
          <span className="text-white text-xs font-mono">100%</span>
        </div>

        {/* App header */}
        <div className="bg-brand-600 px-4 py-3 flex items-center gap-2">
          <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <span className="text-white text-sm font-bold font-display">Nilam Auto</span>
        </div>

        {/* Book list */}
        <div className="px-3 py-3 space-y-2 bg-page">
          {DEMO_BOOKS.map((b, i) => {
            const submitted = phase > i
            const active    = phase === i
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-card"
              >
                <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center font-mono text-xs font-bold text-brand-600 flex-shrink-0">
                  {b.lang}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-heading truncate">{b.title}</p>
                  <p className="text-xs text-subtle">{b.author}</p>
                </div>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full transition-all duration-500 ${
                  submitted
                    ? 'bg-ok-100 text-ok-600'
                    : active
                    ? 'bg-warn-100 text-warn-600 animate-pulse'
                    : 'bg-gray-100 text-subtle'
                }`}>
                  {submitted ? '✓' : active ? '…' : '—'}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* Status bar */}
        <div className="bg-white border-t border-line px-3 py-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-ok-500 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-xs text-muted">
            {phase >= 4 ? 'All records submitted ✓' : `Submitting record ${Math.min(phase + 1, 4)}…`}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState('login')
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState('')
  const [isError, setIsError]   = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent]       = useState(false)

  // When the user clicks the verification link, Supabase redirects back here
  // with a session in the URL hash. Detect it and send them to the dashboard.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') navigate('/dashboard')
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setIsError(false)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        if (data?.user) {
          await fetch(`${BACKEND}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: data.user.id, email: data.user.email }),
          })
        }
        setMessage('Check your email to confirm your account.')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data?.user) {
          await fetch(`${BACKEND}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: data.user.id, email: data.user.email }),
          })
        }
        navigate('/dashboard')
      }
    } catch (err) {
      setMessage(err.message)
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!email) { setMessage('Enter your email address first.'); setIsError(true); return }
    setResending(true)
    setMessage('')
    setIsError(false)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setResending(false)
    if (error) { setMessage(error.message); setIsError(true) }
    else { setResent(true); setMessage('Verification email sent — check your inbox.') }
  }

  return (
    <div className="min-h-screen bg-page overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-line">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <span className="font-display font-bold text-heading tracking-tight">Nilam Auto</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMode('login'); document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="text-sm font-semibold text-muted hover:text-heading px-4 py-2 rounded-xl hover:bg-gray-100 transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="btn-primary !px-4 !py-2 text-sm"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-brand-50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-5 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left */}
          <div>
            <motion.div {...up(0)} className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-600 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
              For Malaysian Students
            </motion.div>

            <motion.h1 {...up(0.05)} className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-heading leading-[1.1] mb-5">
              Automate Your{' '}
              <span className="text-brand-600">NILAM</span>
              <br />Submissions.
            </motion.h1>

            <motion.p {...up(0.1)} className="text-body text-lg leading-relaxed mb-8 max-w-md">
              Nilam Auto submits your reading records on{' '}
              <span className="text-heading font-semibold">ains.moe.gov.my</span>{' '}
              automatically every month — so you never miss a deadline.
            </motion.p>

            <motion.div {...up(0.15)} className="flex flex-col sm:flex-row gap-3 mb-10">
              <button
                onClick={() => { setMode('signup'); document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' }) }}
                className="btn-primary text-base px-8 py-3.5"
              >
                Get Started Free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </button>
              <button
                onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-ghost text-base"
              >
                How it works
              </button>
            </motion.div>

            <motion.div {...up(0.2)} className="flex gap-8 flex-wrap border-t border-line pt-6">
              {[
                { v: '1,000+', l: 'Malaysian students' },
                { v: 'Up to 8', l: 'books / month' },
                { v: '< 2 min', l: 'setup time' },
              ].map(s => (
                <div key={s.l}>
                  <p className="font-display font-bold text-xl text-heading">{s.v}</p>
                  <p className="text-xs text-muted mt-0.5">{s.l}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Phone mockup */}
          <div className="lg:pl-4">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section id="how" className="py-20 border-t border-line bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <motion.div {...inView()} className="text-center mb-14">
            <p className="text-brand-600 text-xs font-bold uppercase tracking-widest mb-3">How it works</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-heading">
              3 steps. Automatically forever.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                n: '1',
                title: 'Install Extension',
                desc: 'Add the Nilam Auto Chrome extension and visit ains.moe.gov.my to save your session securely.',
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" /></svg>
              },
              {
                n: '2',
                title: 'Set Preferences',
                desc: 'Choose your language, number of books, and schedule day. We do the rest every month.',
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              },
              {
                n: '3',
                title: 'Relax',
                desc: 'Nilam Auto submits your records automatically each month. Check history anytime.',
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              },
            ].map((step, i) => (
              <motion.div key={step.n} {...inView(i * 0.08)} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-brand-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-card">
                  {step.icon}
                </div>
                <div className="w-7 h-7 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold mb-3">
                  {step.n}
                </div>
                <h3 className="font-display text-lg font-bold text-heading mb-2">{step.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────── */}
      <section className="py-20 border-t border-line bg-page">
        <div className="max-w-6xl mx-auto px-5">
          <motion.div {...inView()} className="text-center mb-12">
            <p className="text-brand-600 text-xs font-bold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-heading">Simple, honest pricing.</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <motion.div {...inView(0)} className="card-p">
              <p className="text-muted font-bold text-sm mb-1">Free</p>
              <p className="font-display text-4xl font-extrabold text-heading mb-1">RM0</p>
              <p className="text-subtle text-xs mb-5">Forever free</p>
              <ul className="space-y-2.5 mb-6">
                {['1 book / month', '1 language', '7-day history', 'Manual submit only'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted">
                    <svg className="w-4 h-4 text-subtle flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setMode('signup'); document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' }) }}
                className="btn-ghost w-full"
              >
                Get started
              </button>
            </motion.div>

            {/* Pro */}
            <motion.div {...inView(0.08)} className="bg-brand-600 rounded-card p-6 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full mb-3">
                  Most Popular
                </div>
                <p className="text-brand-200 font-bold text-sm mb-1">Pro</p>
                <p className="font-display text-4xl font-extrabold text-white mb-1">RM18</p>
                <p className="text-brand-200 text-xs mb-5">/ year · ≈ RM1.50/month</p>
                <ul className="space-y-2.5 mb-6">
                  {['Up to 8 books / month', 'All 4 languages', 'Full history', 'Monthly auto-schedule', 'Priority support'].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white">
                      <svg className="w-4 h-4 text-brand-200 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/upgrade')}
                  className="w-full py-3 bg-white text-brand-600 font-bold rounded-xl hover:bg-brand-50 transition-colors"
                >
                  Unlock Pro — RM18 / Year
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Android App ──────────────────────────────── */}
      <section id="android" className="py-20 border-t border-line bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <motion.div {...inView()} className="max-w-xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-ok-50 border border-ok-200 text-ok-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zm-2.5-1c.83 0 1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5S2 7.67 2 8.5v7c0 .83.67 1.5 1.5 1.5zm17 0c.83 0 1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5S19 7.67 19 8.5v7c0 .83.67 1.5 1.5 1.5zM15.53 2.16l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48A5.934 5.934 0 0012 1c-.94 0-1.82.22-2.61.63L7.89.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C7.01 3.07 6 4.96 6 7h12c0-2.04-1.01-3.93-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/>
              </svg>
              Android App Available
            </div>

            <h2 className="font-display text-3xl sm:text-4xl font-bold text-heading mb-4">
              Take it on your phone.
            </h2>
            <p className="text-body text-base leading-relaxed mb-8">
              Download the Nilam Auto Android app and log in directly — no Chrome extension needed. Install in seconds, no app store required.
            </p>

            <a
              href="/nilam-auto.apk"
              download
              className="inline-flex items-center gap-2.5 btn-primary text-base px-8 py-3.5 mb-8"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download APK
            </a>

            <div className="text-left bg-page border border-line rounded-2xl p-5">
              <p className="text-xs font-bold text-heading uppercase tracking-widest mb-3">How to install</p>
              <ol className="space-y-2.5">
                {[
                  'Tap "Download APK" above.',
                  'Open your Downloads folder and tap the file.',
                  'If prompted, go to Settings → Apps → Special app access → Install unknown apps and allow your browser.',
                  'Tap Install — done!',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted">
                    <span className="w-5 h-5 flex-shrink-0 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Auth ─────────────────────────────────────── */}
      <section id="auth" className="py-20 border-t border-line bg-white">
        <div className="max-w-md mx-auto px-5">
          <motion.div {...inView()} className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-heading">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-muted text-sm mt-2">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}
                className="text-brand-600 font-semibold hover:underline"
              >
                {mode === 'login' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          </motion.div>

          <motion.div {...inView(0.05)} className="card-p">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
              {[{ k: 'login', l: 'Sign In' }, { k: 'signup', l: 'Sign Up' }].map(t => (
                <button
                  key={t.k}
                  onClick={() => { setMode(t.k); setMessage('') }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    mode === t.k ? 'bg-white text-heading shadow-sm' : 'text-muted hover:text-heading'
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="student@school.edu.my"
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="input"
                />
              </div>

              {message && (
                <p className={`text-sm font-semibold ${isError ? 'text-danger-600' : 'text-ok-600'}`}>
                  {message}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</>
                ) : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-line text-center">
              <p className="text-xs text-muted mb-2">Didn't receive your verification email?</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resent}
                className="text-sm font-semibold text-brand-600 hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resending ? 'Sending…' : resent ? 'Email sent ✓' : 'Resend verification email'}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="bg-heading text-white py-10 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <span className="font-display font-bold text-sm">Nilam Auto</span>
          </div>
          <p className="text-white/40 text-xs">© 2025 Nilam Auto. Built for Malaysian students.</p>
          <p className="text-white/40 text-xs">Data encrypted with AES-256</p>
        </div>
      </footer>
    </div>
  )
}
