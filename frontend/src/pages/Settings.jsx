import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

const BACKEND    = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const LANGUAGES  = ['Malay', 'English', 'Chinese', 'Tamil']
const LANG_MAP   = { Malay: 'Melayu', English: 'Inggeris', Chinese: 'Cina', Tamil: 'Tamil' }
const BOOK_TYPES = ['Physical', 'E-Book']
const TYPE_MAP   = { Physical: 'Fizikal', 'E-Book': 'E-Buku' }

function Stepper({ value, min, max, onChange }) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-11 h-11 rounded-xl bg-white border border-line text-heading text-xl font-bold hover:border-brand-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
      >
        −
      </button>
      <div className="flex-1 text-center">
        <span className="font-display text-4xl font-extrabold text-brand-600">{value}</span>
        <p className="text-xs text-muted mt-1">books / month</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-11 h-11 rounded-xl bg-white border border-line text-heading text-xl font-bold hover:border-brand-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
      >
        +
      </button>
    </div>
  )
}

export default function Settings() {
  const [user, setUser]         = useState(null)
  const [form, setForm]         = useState({
    books_per_month: 4,
    language:    'Melayu',
    book_type:   'Fizikal',
    auto_schedule: true,
    schedule_day:  15,
  })
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [loading, setLoading]   = useState(true)
  const [credsStatus, setCredsStatus] = useState(null) // null | 'saved' | 'none'
  const [showCredsForm, setShowCredsForm] = useState(false)
  const [aimsUsername, setAimsUsername]   = useState('')
  const [aimsPassword, setAimsPassword]   = useState('')
  const [savingCreds, setSavingCreds]     = useState(false)
  const [credsSaved, setCredsSaved]       = useState(false)
  const [credsError, setCredsError]       = useState('')

  const [displayLang, setDisplayLang] = useState('Malay')
  const [displayType, setDisplayType] = useState('Physical')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      const res = await fetch(`${BACKEND}/api/settings?userId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setForm({
          books_per_month: data.books_per_month ?? 4,
          language:        data.language ?? 'Melayu',
          book_type:       data.book_type ?? 'Fizikal',
          auto_schedule:   data.auto_schedule ?? true,
          schedule_day:    data.schedule_day ?? 15,
        })
        const dLang = Object.entries(LANG_MAP).find(([, v]) => v === data.language)?.[0] || 'Malay'
        const dType = Object.entries(TYPE_MAP).find(([, v]) => v === data.book_type)?.[0] || 'Physical'
        setDisplayLang(dLang)
        setDisplayType(dType)
      }

      const { data: ud } = await supabase
        .from('users').select('ains_creds_updated_at').eq('id', user.id).single()
      setCredsStatus(ud?.ains_creds_updated_at ? 'saved' : 'none')

      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaved(false)
    const res = await fetch(`${BACKEND}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, ...form }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  async function handleSaveCreds(e) {
    e.preventDefault()
    if (!user || !aimsUsername || !aimsPassword) return
    setSavingCreds(true)
    setCredsError('')
    setCredsSaved(false)
    try {
      const res = await fetch(`${BACKEND}/api/auth/save-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, username: aimsUsername, password: aimsPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setCredsStatus('saved')
      setCredsSaved(true)
      setAimsUsername('')
      setAimsPassword('')
      setTimeout(() => { setShowCredsForm(false); setCredsSaved(false) }, 1500)
    } catch (err) {
      setCredsError(err.message)
    } finally {
      setSavingCreds(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-line border-t-brand-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="max-w-2xl space-y-6"
    >
      <div>
        <h1 className="font-display text-2xl font-extrabold text-heading">Settings</h1>
        <p className="text-muted text-sm mt-1">Configure your NILAM automation preferences.</p>
      </div>

      {/* ── AINS Account ─────────────────────────────── */}
      <div>
        <h2 className="font-display text-base font-bold text-heading mb-3">AINS Account</h2>
        <div className={`card-p border-l-4 ${credsStatus === 'saved' ? 'border-l-ok-500' : 'border-l-danger-400'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${credsStatus === 'saved' ? 'bg-ok-500' : 'bg-danger-400 animate-pulse'}`} />
              <div>
                <p className="text-sm font-bold text-heading">
                  {credsStatus === 'saved' ? 'Credentials Saved' : 'Not Connected'}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {credsStatus === 'saved'
                    ? 'Your AINS/DELIMa credentials are stored encrypted. The bot will log in automatically.'
                    : 'Enter your AINS/DELIMa username and password so the bot can log in on your behalf.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setShowCredsForm(v => !v); setCredsError('') }}
              className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
            >
              {credsStatus === 'saved' ? 'Update' : 'Set Up'}
            </button>
          </div>

          {showCredsForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleSaveCreds}
              className="mt-4 pt-4 border-t border-line space-y-3"
            >
              <div className="flex items-start gap-2 bg-warn-50 border border-warn-200 rounded-xl px-3 py-2.5">
                <svg className="w-4 h-4 text-warn-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                <p className="text-xs text-warn-800 leading-relaxed">
                  <span className="font-bold">Use your IC number + DELIMa password only.</span> Do not use Google or Microsoft — those require phone verification the bot cannot complete.
                </p>
              </div>
              <div>
                <label className="label">DELIMa Username (IC Number)</label>
                <input
                  type="text"
                  value={aimsUsername}
                  onChange={e => setAimsUsername(e.target.value)}
                  placeholder="e.g. 040101010101"
                  className="input"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="label">DELIMa Password</label>
                <input
                  type="password"
                  value={aimsPassword}
                  onChange={e => setAimsPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                  autoComplete="current-password"
                />
              </div>
              {credsError && <p className="text-xs text-danger-600 font-semibold">{credsError}</p>}
              <button
                type="submit"
                disabled={savingCreds || !aimsUsername || !aimsPassword}
                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                  credsSaved ? 'bg-ok-50 text-ok-600 border border-ok-200' : 'btn-primary'
                } disabled:opacity-50`}
              >
                {savingCreds ? 'Saving…' : credsSaved ? '✓ Saved!' : 'Save Credentials'}
              </button>
              <p className="text-xs text-subtle text-center">🔒 AES-256 encrypted · Never stored in plain text</p>
            </motion.form>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Group 1: Reading Preferences */}
        <div>
          <h2 className="font-display text-base font-bold text-heading mb-3">Reading Preferences</h2>
          <div className="space-y-4">

            {/* Books per month */}
            <div className="card-p">
              <label className="label">Books Per Month</label>
              <div className="mt-4 mb-2">
                <Stepper
                  value={form.books_per_month}
                  min={1} max={8}
                  onChange={v => setForm(f => ({ ...f, books_per_month: v }))}
                />
              </div>
              <p className="text-xs text-subtle text-center mt-2">Maximum 8 books per month (Pro)</p>
            </div>

            {/* Language */}
            <div className="card-p">
              <label className="label">Book Language</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setDisplayLang(lang)
                      setForm(f => ({ ...f, language: LANG_MAP[lang] }))
                    }}
                    className={`py-3 px-3 rounded-xl text-sm font-bold border transition-all duration-150 ${
                      displayLang === lang
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm scale-[1.02]'
                        : 'bg-white text-muted border-line hover:border-brand-300 hover:text-brand-600'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Book type */}
            <div className="card-p">
              <label className="label">Book Type</label>
              <div className="flex gap-2 mt-1 p-1 bg-gray-100 rounded-xl">
                {BOOK_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setDisplayType(type)
                      setForm(f => ({ ...f, book_type: TYPE_MAP[type] }))
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-150 ${
                      displayType === type
                        ? 'bg-white text-heading shadow-sm'
                        : 'text-muted hover:text-heading'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Group 2: Schedule */}
        <div>
          <h2 className="font-display text-base font-bold text-heading mb-3">Schedule</h2>
          <div className="card-p space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-heading">Auto-Schedule</p>
                <p className="text-xs text-muted mt-0.5">Automatically submit on a set day each month</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, auto_schedule: !f.auto_schedule }))}
                className={`relative inline-flex h-7 items-center rounded-full transition-colors duration-200 ${form.auto_schedule ? 'bg-brand-600' : 'bg-gray-200'}`}
                style={{ width: 52 }}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${form.auto_schedule ? 'translate-x-7' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {form.auto_schedule && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="label">Schedule Day</label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="number"
                    min={1} max={28}
                    value={form.schedule_day}
                    onChange={e => setForm(f => ({ ...f, schedule_day: Number(e.target.value) }))}
                    className="input w-24"
                  />
                  <p className="text-sm text-muted">of every month</p>
                </div>
                <p className="text-xs text-brand-600 font-semibold mt-2">
                  Will submit on day {form.schedule_day} of each month
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={saving}
          className={`w-full py-3.5 text-base font-bold rounded-xl transition-all duration-200 ${
            saved
              ? 'bg-ok-50 text-ok-600 border border-ok-200'
              : 'btn-primary'
          }`}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </span>
          ) : saved ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Saved!
            </span>
          ) : 'Save Settings'}
        </button>
      </form>
    </motion.div>
  )
}
