import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Mascot, MascotMark } from '../components/Mascot'
import LiveDemo from '../components/LiveDemo'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// ── Shared helpers ────────────────────────────────────────────────

function SectionLabel({ num, text }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-cobalt text-xs font-bold">[ {num} ]</span>
      <span className="font-mono text-ink/50 text-xs tracking-[0.3em] uppercase">{text}</span>
      <span className="flex-1 h-[2px] bg-ink/10 max-w-[120px]" />
    </div>
  )
}

function AvatarStack() {
  const colors   = ['#FFD23F', '#2F5DDB', '#FF8FA3', '#0E7D4F', '#FF6B3D']
  const initials = ['AZ', 'SH', 'KP', 'MR', 'AY']
  return (
    <div className="flex">
      {initials.map((init, i) => (
        <div key={i}
          className="w-9 h-9 rounded-full border-[2.5px] border-ink flex items-center justify-center font-display font-black text-[11px] text-ink -ml-2 first:ml-0"
          style={{ background: colors[i], zIndex: 5 - i }}>
          {init}
        </div>
      ))}
    </div>
  )
}

// ── Sections ──────────────────────────────────────────────────────

function Nav({ onSignIn, onGetStarted }) {
  return (
    <nav className="flex items-center justify-between bg-cream px-5 py-4 sm:px-10 sm:py-6">
      <div className="flex items-center gap-2.5">
        <MascotMark size={30} />
        <span className="font-display font-black tracking-tight text-ink text-base sm:text-lg">
          Nilam<span className="text-cobalt">Desk</span>
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <a href="#how"
          className="hidden sm:block font-bold text-sm text-ink/70 hover:text-ink px-4 py-2">
          How it works
        </a>
        <a href="#pricing"
          className="hidden sm:block font-bold text-sm text-ink/70 hover:text-ink px-4 py-2">
          Pricing
        </a>
        <button onClick={onSignIn} className="font-bold text-sm text-ink/70 hover:text-ink px-3 py-2 sm:px-4">
          Sign in
        </button>
        <button onClick={onGetStarted} className="chunky-btn chunky-btn--primary chunky-btn--sm">
          Start free →
        </button>
      </div>
    </nav>
  )
}

function Hero({ onGetStarted }) {
  return (
    <section className="relative overflow-hidden px-5 pt-6 pb-16 sm:px-10 sm:pt-8 sm:pb-24">
      <div className="absolute right-0 top-12 w-72 h-72 rounded-full bg-yellow/40 blur-3xl pointer-events-none" />
      <div className="absolute left-0 bottom-0 w-56 h-56 rounded-full bg-cobalt/15 blur-3xl pointer-events-none" />

      <div className="relative max-w-[1180px] mx-auto lg:grid lg:grid-cols-12 lg:gap-8 lg:items-center">
        {/* Copy */}
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-[2px] border-ink bg-white mb-5"
            style={{ boxShadow: '3px 3px 0 #0F172A' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#28C840] animate-pulse" />
            <span className="font-extrabold text-[11px] tracking-widest uppercase text-ink">For Malaysian students</span>
          </div>

          <h1 className="font-display font-black tracking-tight leading-[0.92] text-[48px] sm:text-[64px] lg:text-[80px] text-ink">
            Submit your{' '}
            <span className="relative inline-block">
              <span className="relative z-10 px-1">NILAM</span>
              <span className="absolute inset-x-0 bottom-1.5 h-4 bg-yellow z-0 rounded-sm" />
            </span>
            <br />in 30 seconds.
          </h1>

          <p className="text-ink/70 font-medium mt-5 max-w-[460px] text-base sm:text-lg leading-relaxed">
            Stop logging books at 11pm on the last day of the month. Connect once,
            pick how many, and Nila handles the rest — automatically, every month.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-7">
            <button onClick={onGetStarted} className="chunky-btn chunky-btn--primary chunky-btn--lg justify-center">
              Start free — no card →
            </button>
            <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
              className="chunky-btn chunky-btn--ghost chunky-btn--lg justify-center">
              See it work ↓
            </button>
          </div>

          <div className="flex items-center gap-3 mt-8 flex-wrap border-t-[2px] border-ink/10 pt-6">
            <AvatarStack />
            <div>
              <div className="flex items-center gap-0.5 text-yellow text-base">
                {'★★★★★'.split('').map((_, i) => <span key={i}>★</span>)}
                <span className="ml-2 font-black text-ink text-sm">4.9</span>
              </div>
              <p className="text-xs font-bold text-ink/60">
                Used by <span className="text-ink">2,400+ students</span> across Malaysia
              </p>
            </div>
          </div>
        </div>

        {/* Mascot */}
        <div className="lg:col-span-5 flex justify-center mt-10 lg:mt-0">
          <div className="relative">
            <div className="absolute -top-2 -right-2 sm:-right-8 z-10">
              <div className="relative bg-white border-[3px] border-ink rounded-2xl px-3.5 py-2 max-w-[200px]"
                style={{ boxShadow: '4px 4px 0 #FFD23F' }}>
                <p className="font-display font-extrabold text-ink text-xs leading-tight">hi, I'm Nila. I'll do your NILAM ✌</p>
                <svg className="absolute -bottom-3 left-6" width="22" height="14" viewBox="0 0 22 14">
                  <path d="M2 2 L18 2 L10 12 Z" fill="#fff" stroke="#0F172A" strokeWidth="3" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <Mascot size={220} mood="waving" floating />
          </div>
        </div>
      </div>
    </section>
  )
}

function MarqueeBar() {
  const items = ['AUTO-SUBMIT', '★', '4 LANGUAGES', '★', 'NO PASSWORD STORED', '★', 'RM18/MONTH', '★', '2,400+ STUDENTS', '★', '99.2% SUCCESS', '★', 'CANCEL ANYTIME']
  const row = [...items, ...items]
  return (
    <div className="bg-ink py-3 overflow-hidden border-y-[3px] border-ink">
      <div className="flex gap-6 whitespace-nowrap" style={{ animation: 'marqueeScroll 30s linear infinite' }}>
        {row.map((t, i) => (
          <span key={i} className="font-display font-black text-cream text-sm tracking-wider">{t}</span>
        ))}
      </div>
    </div>
  )
}

function Problem() {
  const pains = [
    { text: 'Open ains.moe.gov.my', rot: -2 },
    { text: 'Search for books you never read', rot: 1.5 },
    { text: 'Fill the same form 4 times', rot: -1 },
    { text: 'Forget. Get nagged. Repeat.', rot: 2 },
  ]
  return (
    <section className="bg-ink text-cream px-5 py-16 sm:px-10 sm:py-24">
      <div className="max-w-[1180px] mx-auto">
        <p className="font-mono text-yellow text-xs tracking-[0.3em] uppercase mb-3">// the old way</p>
        <h2 className="font-display font-black tracking-tight leading-[0.95] text-[36px] sm:text-[60px] lg:text-[72px]">
          NILAM submissions<br />
          are <span className="line-through decoration-[#FF6B3D] decoration-[5px]">a chore</span>{' '}
          <span className="text-yellow">a waste of time.</span>
        </h2>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pains.map((p, i) => (
            <div key={i}
              className="bg-cream/5 border-[2px] border-cream/15 rounded-xl px-4 py-3.5 flex items-center gap-3"
              style={{ transform: `rotate(${p.rot}deg)` }}>
              <span className="font-mono font-black text-yellow text-base">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-display font-extrabold text-cream/90 text-sm line-through decoration-[#FF6B3D] decoration-[3px]">{p.text}</span>
            </div>
          ))}
        </div>
        <p className="mt-10 font-display font-black text-2xl sm:text-4xl">
          What if you just… <span className="underline decoration-yellow decoration-[5px] underline-offset-[6px]">didn't</span>?
        </p>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Connect once.', body: 'Log in with your AINS account. We capture your session, encrypt it, and never see your password again.', tag: 'one-time, ~20s', tagBg: 'bg-yellow' },
    { n: '02', title: 'Pick how many.', body: '1 to 50 books per month. Choose Malay, English, Chinese, or Tamil. Change anytime in settings.', tag: 'fully configurable', tagBg: 'bg-[#FF8FA3]' },
    { n: '03', title: 'Sit back.', body: 'On day 1 of every month, Nila opens AINS, fills your records, and emails you when it\'s done.', tag: '99.2% success rate', tagBg: 'bg-[#A8E6A1]' },
  ]
  return (
    <section id="how" className="bg-cream px-5 py-16 sm:px-10 sm:py-24">
      <div className="max-w-[1180px] mx-auto">
        <SectionLabel num="01" text="how it works" />
        <h2 className="font-display font-black tracking-tight leading-[0.95] text-[36px] sm:text-[56px] lg:text-[64px] mt-3">
          Three steps.<br /><span className="text-cobalt">Then never again.</span>
        </h2>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="bg-white border-[3px] border-ink rounded-2xl p-6 relative"
              style={{ boxShadow: '6px 6px 0 #0F172A' }}>
              <div className="flex items-center justify-between">
                <span className="font-display font-black text-cobalt text-5xl tracking-tighter">{s.n}</span>
                <span className={`${s.tagBg} text-ink text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border-[2px] border-ink`}>{s.tag}</span>
              </div>
              <h3 className="font-display font-black text-ink text-2xl mt-4 leading-tight">{s.title}</h3>
              <p className="text-ink/65 text-sm mt-2 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function DemoSection() {
  return (
    <section className="bg-cobalt text-cream relative overflow-hidden px-5 py-16 sm:px-10 sm:py-24">
      <div className="absolute inset-0 opacity-[0.12]" style={{
        backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />
      <div className="relative max-w-[1180px] mx-auto lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start">
        <div className="lg:col-span-5 mb-8 lg:mb-0 lg:sticky lg:top-10">
          <p className="font-mono text-yellow text-xs tracking-[0.3em] uppercase mb-3">// try it</p>
          <h2 className="font-display font-black tracking-tight leading-[0.95] text-[36px] sm:text-[52px] lg:text-[60px]">
            See it<br />
            <span className="relative inline-block">
              <span className="relative z-10">actually work.</span>
              <span className="absolute inset-x-0 bottom-2 h-3 bg-yellow z-0" />
            </span>
          </h2>
          <p className="text-cream/80 font-medium mt-4 max-w-[440px] text-base sm:text-lg leading-relaxed">
            Real flow — connect, configure, submit. No sign-up needed. Credentials are mocked but bot behaviour is exactly what you'd see in your dashboard.
          </p>
          <div className="mt-6 hidden lg:flex items-center gap-3 text-cream/70 text-sm">
            <span className="w-8 h-8 rounded-full border-2 border-cream/30 flex items-center justify-center font-mono font-bold">↓</span>
            <span className="font-bold">Click <span className="text-yellow">Connect AINS</span> to start.</span>
          </div>
        </div>
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border-[3px] border-ink overflow-hidden" style={{ boxShadow: '10px 10px 0 #0F172A' }}>
            <LiveDemo />
          </div>
        </div>
      </div>
    </section>
  )
}

function Pricing({ onGetStarted, onNavigateUpgrade }) {
  return (
    <section id="pricing" className="bg-cream px-5 py-16 sm:px-10 sm:py-24">
      <div className="max-w-[1180px] mx-auto">
        <SectionLabel num="03" text="pricing" />
        <h2 className="font-display font-black tracking-tight leading-[0.95] text-[36px] sm:text-[56px] lg:text-[64px] mt-3">
          Free is plenty.<br /><span className="text-cobalt">Pro is for the busy.</span>
        </h2>
        <p className="text-ink/60 mt-3 font-medium text-base sm:text-lg">
          RM 18/month — about one nasi lemak set. Zero monthly NILAM panic, ever.
        </p>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
          {/* Free */}
          <div className="bg-white border-[3px] border-ink rounded-2xl p-6 relative" style={{ boxShadow: '6px 6px 0 #0F172A' }}>
            <p className="font-display font-black text-ink text-xs uppercase tracking-[0.25em]">Free</p>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="font-display font-black text-ink text-6xl tracking-tighter">RM 0</span>
              <span className="font-bold text-ink/60 text-sm">forever</span>
            </div>
            <ul className="mt-5 space-y-2.5">
              {['1 book per week', '1 language at a time', 'Manual trigger', 'Email reminders'].map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm font-semibold text-ink">
                  <span className="w-5 h-5 rounded-md border-[2px] border-ink flex items-center justify-center flex-shrink-0 mt-[1px]" style={{ background: '#2F5DDB' }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6.5l2.5 2.5L10 3" stroke="#F4F1EA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={onGetStarted} className="mt-6 w-full chunky-btn chunky-btn--ghost justify-center">Start free</button>
          </div>
          {/* Pro */}
          <div className="bg-yellow border-[3px] border-ink rounded-2xl p-6 relative" style={{ boxShadow: '8px 8px 0 #0F172A' }}>
            <div className="absolute -top-3 right-5 bg-ink text-cream text-[10px] font-black px-3 py-1 rounded-md tracking-widest border-[2px] border-ink">
              MOST POPULAR
            </div>
            <p className="font-display font-black text-ink text-xs uppercase tracking-[0.25em]">Pro</p>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="font-display font-black text-ink text-6xl tracking-tighter">RM 18</span>
              <span className="font-bold text-ink/60 text-sm">per month</span>
            </div>
            <ul className="mt-5 space-y-2.5">
              {['Up to 50 books / month', 'All 4 languages, mixed', 'Auto-submit every 1st of month', 'Priority support (we reply lah)', 'Cancel anytime'].map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm font-semibold text-ink">
                  <span className="w-5 h-5 rounded-md border-[2px] border-ink flex items-center justify-center flex-shrink-0 mt-[1px]" style={{ background: '#0F172A' }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6.5l2.5 2.5L10 3" stroke="#F4F1EA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={onNavigateUpgrade} className="mt-6 w-full chunky-btn chunky-btn--ink justify-center">
              Go Pro — RM 18/mo →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function AuthSection({ mode, setMode, email, setEmail, password, setPassword, loading, message, isError, agreedToTerms, setAgreedToTerms, onSubmit, resending, resent, onResend, onForgot, forgotSent }) {
  if (mode === 'forgot') {
    return (
      <section id="auth" className="bg-cream border-t-[3px] border-ink py-16 sm:py-24 px-5">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display font-black text-ink text-3xl sm:text-4xl tracking-tight">Reset password.</h2>
            <p className="text-ink/60 text-sm mt-2 font-medium">
              Remember it?{' '}
              <button onClick={() => setMode('login')} className="text-cobalt font-extrabold hover:underline">Sign in</button>
            </p>
          </div>
          <div className="bg-white border-[3px] border-ink rounded-2xl p-6" style={{ boxShadow: '8px 8px 0 #FFD23F' }}>
            {forgotSent ? (
              <div className="text-center py-4">
                <p className="text-3xl mb-3">📬</p>
                <p className="font-extrabold text-ink text-base">Check your email.</p>
                <p className="text-sm text-ink/60 mt-1">We sent a password reset link to <span className="font-bold text-ink">{email}</span>.</p>
                <button onClick={() => setMode('login')} className="mt-5 text-sm font-extrabold text-cobalt hover:underline">
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={onForgot} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-ink/60 mb-1">Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="student@school.edu.my" required
                    className="w-full px-3 py-2.5 rounded-lg border-[2px] border-ink bg-white font-bold text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-yellow" />
                </div>
                {message && (
                  <p className={`text-sm font-bold ${isError ? 'text-red-600' : 'text-[#0E7D4F]'}`}>{message}</p>
                )}
                <button type="submit" disabled={loading}
                  className="w-full chunky-btn chunky-btn--primary chunky-btn--lg justify-center">
                  {loading ? <><AuthSpinner />Sending…</> : 'Send reset link'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="auth" className="bg-cream border-t-[3px] border-ink py-16 sm:py-24 px-5">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-display font-black text-ink text-3xl sm:text-4xl tracking-tight">
            {mode === 'login' ? 'Welcome back.' : 'Create your account.'}
          </h2>
          <p className="text-ink/60 text-sm mt-2 font-medium">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); }}
              className="text-cobalt font-extrabold hover:underline">
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>

        <div className="bg-white border-[3px] border-ink rounded-2xl p-6" style={{ boxShadow: '8px 8px 0 #FFD23F' }}>
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-cream rounded-xl mb-6 border-[2px] border-ink/10">
            {[{ k: 'login', l: 'Sign In' }, { k: 'signup', l: 'Sign Up' }].map(t => (
              <button key={t.k} onClick={() => { setMode(t.k); }}
                className={`flex-1 py-2 rounded-lg text-sm font-extrabold transition-all ${
                  mode === t.k ? 'bg-ink text-cream shadow-sm' : 'text-ink/60 hover:text-ink'
                }`}>
                {t.l}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-ink/60 mb-1">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="student@school.edu.my" required
                className="w-full px-3 py-2.5 rounded-lg border-[2px] border-ink bg-white font-bold text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-yellow" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-ink/60">Password</label>
                {mode === 'login' && (
                  <button type="button" onClick={() => setMode('forgot')}
                    className="text-[11px] font-extrabold text-cobalt hover:underline">
                    Forgot password?
                  </button>
                )}
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6}
                className="w-full px-3 py-2.5 rounded-lg border-[2px] border-ink bg-white font-bold text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-yellow" />
            </div>

            {message && (
              <p className={`text-sm font-bold ${isError ? 'text-red-600' : 'text-[#0E7D4F]'}`}>{message}</p>
            )}

            {mode === 'signup' && (
              <div className="flex items-start gap-2.5">
                <input id="agree-terms" type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-ink accent-cobalt cursor-pointer flex-shrink-0" />
                <label htmlFor="agree-terms" className="text-xs text-ink/60 leading-relaxed cursor-pointer">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" className="text-cobalt font-extrabold hover:underline">Terms of Use</Link>
                  {' '}and{' '}
                  <Link to="/privacy" target="_blank" className="text-cobalt font-extrabold hover:underline">Privacy Policy</Link>.
                  I understand my AINS session will be used to automate my reading record submissions.
                </label>
              </div>
            )}

            <button type="submit" disabled={loading || (mode === 'signup' && !agreedToTerms)}
              className="w-full chunky-btn chunky-btn--primary chunky-btn--lg justify-center">
              {loading
                ? <><AuthSpinner />Processing…</>
                : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <p className="text-center text-xs text-ink/40 leading-relaxed">
              By {mode === 'login' ? 'signing in' : 'creating an account'}, you agree to our{' '}
              <Link to="/terms" target="_blank" className="underline hover:text-ink/60">Terms of Use</Link>
              {' '}and{' '}
              <Link to="/privacy" target="_blank" className="underline hover:text-ink/60">Privacy Policy</Link>.
            </p>
          </form>

          <div className="mt-4 pt-4 border-t-[2px] border-ink/10 text-center">
            <p className="text-xs text-ink/50 mb-2">Didn't receive your verification email?</p>
            <button type="button" onClick={onResend} disabled={resending || resent}
              className="text-sm font-extrabold text-cobalt hover:underline disabled:opacity-50 disabled:no-underline">
              {resending ? 'Sending…' : resent ? 'Email sent ✓' : 'Resend verification email'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-ink text-cream px-5 py-10 sm:px-10 sm:py-14 border-t-[3px] border-ink">
      <div className="max-w-[1180px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <MascotMark size={28} />
            <span className="font-display font-black text-sm tracking-tight">Nilam<span className="text-yellow">Desk</span></span>
          </div>
          <p className="text-cream/40 text-xs mt-2 max-w-[220px] leading-relaxed">
            Built for Malaysian students. Not affiliated with the Ministry of Education.
          </p>
        </div>
        <p className="font-mono text-cream/30 text-xs">© 2026 NilamDesk — submit gracefully.</p>
        <div className="flex items-center gap-4">
          <Link to="/terms" className="text-cream/40 text-xs hover:text-cream/70 font-bold transition-colors">Terms of Use</Link>
          <Link to="/privacy" className="text-cream/40 text-xs hover:text-cream/70 font-bold transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  )
}

// ── Main Landing ──────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate()
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [mode, setMode]                 = useState('login')
  const [loading, setLoading]           = useState(false)
  const [message, setMessage]           = useState('')
  const [isError, setIsError]           = useState(false)
  const [resending, setResending]       = useState(false)
  const [resent, setResent]             = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [forgotSent, setForgotSent]     = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (session.user.app_metadata?.provider) syncUserToBackend(session.user)
        navigate('/dashboard')
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  async function syncUserToBackend(user) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return
      await fetch(`${BACKEND}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: user.id, email: user.email }),
      })
    } catch {}
  }

  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true); setMessage(''); setIsError(false)
    if (mode === 'signup' && !agreedToTerms) {
      setMessage('Please agree to the Terms of Use and Privacy Policy to continue.')
      setIsError(true); setLoading(false); return
    }
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: import.meta.env.VITE_SITE_URL || 'https://nilamdesk.vercel.app' },
        })
        if (error) {
          const msg = error.message?.toLowerCase() ?? ''
          setMessage(
            msg.includes('already registered') || msg.includes('email address is already taken')
              ? 'An account with this email already exists. Please sign in instead.'
              : error.message
          )
          setIsError(true); return
        }
        if (data?.user?.identities?.length === 0) {
          setMessage('An account with this email already exists. Please sign in instead.')
          setIsError(true); return
        }
        if (data?.user) syncUserToBackend(data.user)
        setMessage('Check your email to confirm your account.')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          const msg = error.message?.toLowerCase() ?? ''
          setMessage(
            msg.includes('invalid login') || msg.includes('invalid credentials')
              ? 'Incorrect email or password. Please try again.'
              : msg.includes('email not confirmed')
              ? 'Please verify your email first. Check your inbox or resend below.'
              : error.message
          )
          setIsError(true); return
        }
        if (data?.user) syncUserToBackend(data.user)
        navigate('/dashboard')
      }
    } catch (err) {
      const raw = err.message?.toLowerCase() ?? ''
      setMessage(raw.includes('failed to fetch') || raw.includes('networkerror')
        ? 'Connection error. Check your internet and try again.'
        : err.message)
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true); setMessage(''); setIsError(false)
    const siteUrl = import.meta.env.VITE_SITE_URL || 'https://nilamdesk.vercel.app'
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    })
    setLoading(false)
    if (error) { setMessage(error.message); setIsError(true) }
    else { setForgotSent(true) }
  }

  async function handleResend() {
    if (!email) { setMessage('Enter your email address first.'); setIsError(true); return }
    setResending(true); setMessage(''); setIsError(false)
    const { error } = await supabase.auth.resend({
      type: 'signup', email,
      options: { emailRedirectTo: import.meta.env.VITE_SITE_URL || 'https://nilamdesk.vercel.app' },
    })
    setResending(false)
    if (error) { setMessage(error.message); setIsError(true) }
    else { setResent(true); setMessage('Verification email sent — check your inbox.') }
  }

  function scrollToAuth(m = 'signup') {
    setMode(m); setMessage(''); setAgreedToTerms(false)
    document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-cream overflow-x-hidden">
      <Nav onSignIn={() => scrollToAuth('login')} onGetStarted={() => scrollToAuth('signup')} />
      <Hero onGetStarted={() => scrollToAuth('signup')} />
      <MarqueeBar />
      <Problem />
      <HowItWorks />
      <DemoSection />
      <Pricing onGetStarted={() => scrollToAuth('signup')} onNavigateUpgrade={() => navigate('/upgrade')} />
      <AuthSection
        mode={mode} setMode={m => { setMode(m); setMessage(''); setAgreedToTerms(false); setForgotSent(false) }}
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        loading={loading} message={message} isError={isError}
        agreedToTerms={agreedToTerms} setAgreedToTerms={setAgreedToTerms}
        onSubmit={handleAuth}
        resending={resending} resent={resent} onResend={handleResend}
        onForgot={handleForgot} forgotSent={forgotSent}
      />
      <Footer />
    </div>
  )
}

function AuthSpinner() {
  return (
    <span className="w-4 h-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
  )
}
