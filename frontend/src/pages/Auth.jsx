import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MascotMark } from '../components/Mascot'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

function AuthSpinner() {
  return <span className="w-4 h-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
}

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()

  // Route decides the initial mode: /signup → signup, anything else → login.
  const [mode, setMode]                   = useState(location.pathname === '/signup' ? 'signup' : 'login')
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [loading, setLoading]             = useState(false)
  const [message, setMessage]             = useState('')
  const [isError, setIsError]             = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [forgotSent, setForgotSent]       = useState(false)

  // Keep the mode in sync if the user navigates between /login and /signup
  // (e.g. clicking the "Sign up"/"Sign in" toggle which pushes a new route).
  useEffect(() => {
    setMode(m => {
      const next = location.pathname === '/signup' ? 'signup' : 'login'
      // Don't clobber the 'forgot' sub-state when the path didn't change.
      return m === 'forgot' ? m : next
    })
  }, [location.pathname])

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      // Capture a referral code (?ref=CODE) so it attaches on signup — even if
      // the visitor landed directly on /signup from the quiz funnel.
      const ref = params.get('ref')
      if (ref) {
        const code = ref.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32)
        if (code) localStorage.setItem('nilam_ref', code)
      }
      // Prefill the email from the quiz funnel (/signup?email=...).
      const e = params.get('email')
      if (e) setEmail(e)
    } catch {}

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
      let referred_by
      try { referred_by = localStorage.getItem('nilam_ref') || undefined } catch {}
      await fetch(`${BACKEND}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: user.id, email: user.email, referred_by }),
      })
    } catch {}
  }

  function switchMode(next) {
    setMessage(''); setIsError(false); setAgreedToTerms(false); setForgotSent(false)
    if (next === 'forgot') { setMode('forgot'); return }
    // Reflect login/signup in the URL so the page is shareable + back-button friendly.
    setMode(next)
    navigate(next === 'signup' ? '/signup' : '/login', { replace: true })
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
          options: { emailRedirectTo: import.meta.env.VITE_SITE_URL || 'https://nilamdesk.com' },
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
        setMessage('Account created! Taking you to your dashboard…')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          const msg = error.message?.toLowerCase() ?? ''
          setMessage(
            msg.includes('invalid login') || msg.includes('invalid credentials')
              ? 'Incorrect email or password. Please try again.'
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
    const siteUrl = import.meta.env.VITE_SITE_URL || 'https://nilamdesk.com'
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    })
    setLoading(false)
    if (error) { setMessage(error.message); setIsError(true) }
    else { setForgotSent(true) }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Minimal top bar — logo links home */}
      <header className="px-5 py-4 sm:px-10 sm:py-6">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <MascotMark size={30} />
          <span className="font-display font-black tracking-tight text-ink text-base sm:text-lg">
            Nilam<span className="text-cobalt">Desk</span>
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {mode === 'forgot' ? (
            <>
              <div className="text-center mb-8">
                <h1 className="font-display font-black text-ink text-3xl sm:text-4xl tracking-tight">Reset password.</h1>
                <p className="text-ink/60 text-sm mt-2 font-medium">
                  Remember it?{' '}
                  <button onClick={() => switchMode('login')} className="text-cobalt font-extrabold hover:underline">Sign in</button>
                </p>
              </div>
              <div className="bg-white border-[3px] border-ink rounded-2xl p-6" style={{ boxShadow: '8px 8px 0 #FFD23F' }}>
                {forgotSent ? (
                  <div className="text-center py-4">
                    <p className="text-3xl mb-3">📬</p>
                    <p className="font-extrabold text-ink text-base">Check your email.</p>
                    <p className="text-sm text-ink/60 mt-1">We sent a password reset link to <span className="font-bold text-ink">{email}</span>.</p>
                    <button onClick={() => switchMode('login')} className="mt-5 text-sm font-extrabold text-cobalt hover:underline">
                      Back to sign in
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-4">
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
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="font-display font-black text-ink text-3xl sm:text-4xl tracking-tight">
                  {mode === 'login' ? 'Welcome back.' : 'Create your account.'}
                </h1>
                <p className="text-ink/60 text-sm mt-2 font-medium">
                  {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                    className="text-cobalt font-extrabold hover:underline">
                    {mode === 'login' ? 'Sign up free' : 'Sign in'}
                  </button>
                </p>
              </div>

              <div className="bg-white border-[3px] border-ink rounded-2xl p-6" style={{ boxShadow: '8px 8px 0 #FFD23F' }}>
                {/* Mode tabs */}
                <div className="flex gap-1 p-1 bg-cream rounded-xl mb-6 border-[2px] border-ink/10">
                  {[{ k: 'login', l: 'Sign In' }, { k: 'signup', l: 'Sign Up' }].map(t => (
                    <button key={t.k} onClick={() => switchMode(t.k)}
                      className={`flex-1 py-2 rounded-lg text-sm font-extrabold transition-all ${
                        mode === t.k ? 'bg-ink text-cream shadow-sm' : 'text-ink/60 hover:text-ink'
                      }`}>
                      {t.l}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
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
                        <button type="button" onClick={() => switchMode('forgot')}
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
              </div>

              <p className="text-center mt-6">
                <Link to="/" className="text-sm font-extrabold text-ink/50 hover:text-ink">← Back to home</Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
