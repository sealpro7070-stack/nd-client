import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Landing() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup'
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
        // Mirror user to public.users via backend
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
        // Ensure public.users row exists (idempotent upsert)
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
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-500 to-purple-700">
      {/* Navbar */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="text-white font-bold text-lg">Nilam Auto</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-16 items-center">
        {/* Hero */}
        <div>
          <div className="inline-flex items-center gap-2 bg-white/15 text-white text-sm font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Auto-submit your NILAM records monthly
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
            Never miss a<br />NILAM submission<br />again.
          </h1>
          <p className="text-primary-100 text-lg mb-8 leading-relaxed">
            Nilam Auto automatically fills and submits your students' reading records
            on <strong className="text-white">ains.moe.gov.my</strong> every month —
            saving hours of manual data entry.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Books/month', value: 'Up to 8' },
              { label: 'Languages', value: '4' },
              { label: 'Setup time', value: '< 2 min' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-4 text-center">
                <div className="text-white font-bold text-xl">{stat.value}</div>
                <div className="text-primary-200 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 text-primary-100 text-sm">
            {[
              'One-click Chrome extension to capture your session',
              'Choose Melayu, Inggeris, Cina, or Tamil books',
              'Auto-schedules on your chosen day every month',
              'Full submission history and status tracking',
            ].map(f => (
              <div key={f} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Auth card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {mode === 'login' ? 'Welcome back' : 'Get started free'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {mode === 'login' ? 'Sign in to your Nilam Auto account' : 'Create your account in seconds'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="label">Email</label>
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
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className={`text-sm rounded-lg px-3 py-2 ${error.includes('Check your email') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-primary-600 font-medium hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
