import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MascotMark } from '../components/Mascot'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [loading, setLoading]         = useState(false)
  const [message, setMessage]         = useState('')
  const [isError, setIsError]         = useState(false)
  const [ready, setReady]             = useState(false)

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when user lands on this page via reset link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Fallback: if event never fires (expired link), still allow manual reset after 3s
    const fallback = setTimeout(() => setReady(true), 3000)
    return () => { subscription.unsubscribe(); clearTimeout(fallback) }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setMessage('Passwords do not match.'); setIsError(true); return
    }
    setLoading(true); setMessage(''); setIsError(false)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setMessage(error.message); setIsError(true)
    } else {
      setMessage('Password updated! Redirecting…')
      setTimeout(() => navigate('/dashboard'), 1500)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-5">
      <div className="flex items-center gap-2.5 mb-8">
        <MascotMark size={30} />
        <span className="font-display font-black tracking-tight text-ink text-base sm:text-lg">
          Nilam<span className="text-cobalt">Desk</span>
        </span>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="font-display font-black text-ink text-3xl sm:text-4xl tracking-tight">New password.</h1>
          <p className="text-ink/60 text-sm mt-2 font-medium">Choose a strong password for your account.</p>
        </div>

        <div className="bg-white border-[3px] border-ink rounded-2xl p-6" style={{ boxShadow: '8px 8px 0 #FFD23F' }}>
          {!ready ? (
            <div className="text-center py-6">
              <p className="text-sm font-bold text-ink/60">Verifying reset link…</p>
              <p className="text-xs text-ink/40 mt-2">If nothing happens, your link may have expired. <button onClick={() => navigate('/')} className="text-cobalt font-extrabold hover:underline">Request a new one.</button></p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-ink/60 mb-1">New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  className="w-full px-3 py-2.5 rounded-lg border-[2px] border-ink bg-white font-bold text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-yellow" />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-ink/60 mb-1">Confirm password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  className="w-full px-3 py-2.5 rounded-lg border-[2px] border-ink bg-white font-bold text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-yellow" />
              </div>

              {message && (
                <p className={`text-sm font-bold ${isError ? 'text-red-600' : 'text-[#0E7D4F]'}`}>{message}</p>
              )}

              <button type="submit" disabled={loading}
                className="w-full chunky-btn chunky-btn--primary chunky-btn--lg justify-center">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />Updating…</>
                  : 'Set new password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
