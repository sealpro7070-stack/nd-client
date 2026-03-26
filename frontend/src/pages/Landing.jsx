import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Landing() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data?.user) {
          await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: data.user.id, email: data.user.email })
          })
        }
        setError('Check your email to confirm your account.')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data?.user) {
          await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: data.user.id, email: data.user.email })
          })
        }
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-sm">
              <BookIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">Nilam Auto</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMode('login'); document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden flex-1">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/60 via-white to-violet-50/40 -z-10" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-100/50 rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-violet-100/40 rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto px-5 py-14 lg:py-20 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: hero copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Built for Malaysian students &amp; teachers
            </div>

            <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-[1.15] mb-5">
              Stop wasting time on<br />
              <span className="text-primary-600">NILAM submissions</span>
            </h1>

            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              Nilam Auto fills and submits your reading records on{' '}
              <span className="font-semibold text-gray-700">ains.moe.gov.my</span> automatically
              every month — so you never miss a deadline.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 mb-10 pb-10 border-b border-gray-100">
              {[
                { value: 'Up to 8', label: 'books / month' },
                { value: '4', label: 'languages supported' },
                { value: '< 2 min', label: 'setup time' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Features */}
            <div className="space-y-3">
              {[
                { text: 'One-click Chrome extension captures your AINS session', color: 'bg-primary-100 text-primary-600' },
                { text: 'Choose Melayu, Inggeris, Cina, or Tamil books', color: 'bg-violet-100 text-violet-600' },
                { text: 'Auto-schedules submissions on your chosen day each month', color: 'bg-blue-100 text-blue-600' },
                { text: 'Full submission history and live status tracking', color: 'bg-green-100 text-green-600' },
              ].map(f => (
                <div key={f.text} className="flex items-center gap-3 text-gray-600 text-sm">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${f.color}`}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  {f.text}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Auth card */}
          <div id="auth-card">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 max-w-md mx-auto">
              {/* Mode toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                {['login', 'signup'].map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError('') }}
                    className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${
                      mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {m === 'login' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {mode === 'login' ? 'Welcome back!' : 'Create your account'}
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                {mode === 'login'
                  ? 'Sign in to manage your NILAM automation.'
                  : 'Start automating your NILAM submissions for free.'}
              </p>

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="you@school.edu.my"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className={`flex items-start gap-2.5 text-sm rounded-xl px-4 py-3 border ${
                    error.includes('Check your email')
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      {error.includes('Check your email')
                        ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        : <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      }
                    </svg>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Please wait...</>
                    : mode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-xs text-gray-400 mt-5 leading-relaxed">
                Your AINS credentials are always encrypted and never stored in plain text.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-50 border-t border-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How it works</h2>
            <p className="text-gray-400 text-sm">Set up in under 2 minutes. Runs automatically every month.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                step: '01',
                title: 'Install the Extension',
                desc: 'Add the Nilam Auto Chrome extension and visit ains.moe.gov.my while logged in. The extension captures your session securely.',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'Set Your Preferences',
                desc: 'Choose your book language, how many books per month (1–8), and the day of each month you want them submitted.',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Relax & Let It Run',
                desc: 'Every month on your chosen day, Nilam Auto submits your reading records automatically. No more manual data entry.',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map(step => (
              <div key={step.step} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 mb-4">
                  {step.icon}
                </div>
                <div className="text-xs font-bold text-primary-500 mb-1 tracking-widest uppercase">{step.step}</div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <BookIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-700 text-sm">Nilam Auto</span>
          </div>
          <p className="text-gray-400 text-xs text-center">
            For Malaysian students &amp; teachers. Not affiliated with KPM or the Ministry of Education.
          </p>
        </div>
      </footer>
    </div>
  )
}

function BookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}
