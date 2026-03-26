import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const LANGUAGES = ['Melayu', 'Inggeris', 'Cina', 'Tamil']
const BOOK_TYPES = ['Fizikal', 'E-Buku']

export default function Settings() {
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({
    books_per_month: 4,
    language: 'Melayu',
    book_type: 'Fizikal',
    auto_schedule: true,
    schedule_day: 15,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cookieStatus, setCookieStatus] = useState(null)

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
          language: data.language ?? 'Melayu',
          book_type: data.book_type ?? 'Fizikal',
          auto_schedule: data.auto_schedule ?? true,
          schedule_day: data.schedule_day ?? 15,
        })
      }

      const { data: userData } = await supabase
        .from('users')
        .select('cookie_updated_at')
        .eq('id', user.id)
        .single()

      if (userData?.cookie_updated_at) {
        const age = Date.now() - new Date(userData.cookie_updated_at).getTime()
        setCookieStatus(age < 7 * 24 * 60 * 60 * 1000 ? 'fresh' : 'stale')
      } else {
        setCookieStatus(null)
      }

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
      body: JSON.stringify({ userId: user.id, ...form })
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Configure your NILAM automation preferences.</p>
      </div>

      {/* Cookie status */}
      <div className="card">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">Session Cookie</h2>
        <div className={`flex items-start gap-3.5 p-4 rounded-xl border ${
          cookieStatus === 'fresh'  ? 'bg-green-50 border-green-200' :
          cookieStatus === 'stale' ? 'bg-yellow-50 border-yellow-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${
            cookieStatus === 'fresh'  ? 'bg-green-500' :
            cookieStatus === 'stale' ? 'bg-yellow-500' :
            'bg-gray-400'
          }`} />
          <div>
            {cookieStatus === 'fresh' && (
              <>
                <p className="text-green-800 font-semibold text-sm">Session is active</p>
                <p className="text-green-600 text-xs mt-0.5">Your AINS cookie is saved and fresh. You're good to go.</p>
              </>
            )}
            {cookieStatus === 'stale' && (
              <>
                <p className="text-yellow-800 font-semibold text-sm">Session may be expired</p>
                <p className="text-yellow-700 text-xs mt-0.5">Please re-login to ains.moe.gov.my via the Chrome extension.</p>
              </>
            )}
            {!cookieStatus && (
              <>
                <p className="text-gray-700 font-semibold text-sm">No session saved</p>
                <p className="text-gray-500 text-xs mt-0.5">Install the Chrome extension and visit ains.moe.gov.my while logged in.</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Preferences form */}
      <form onSubmit={handleSave} className="card space-y-7">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Automation Preferences</h2>

        {/* Books per month */}
        <div>
          <label className="label">
            Books per month —{' '}
            <span className="text-primary-600 font-extrabold">{form.books_per_month}</span>
          </label>
          <input
            type="range"
            min={1} max={8} step={1}
            value={form.books_per_month}
            onChange={e => setForm(f => ({ ...f, books_per_month: Number(e.target.value) }))}
            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-600 mt-1"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1.5 px-0.5">
            {[1,2,3,4,5,6,7,8].map(n => <span key={n}>{n}</span>)}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="label">Book Language</label>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => setForm(f => ({ ...f, language: lang }))}
                className={`py-2 px-3 rounded-xl text-sm font-semibold border transition-all ${
                  form.language === lang
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Book type */}
        <div>
          <label className="label">Book Type</label>
          <div className="flex gap-2 mt-1">
            {BOOK_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setForm(f => ({ ...f, book_type: type }))}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all ${
                  form.book_type === type
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Auto schedule toggle */}
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-semibold text-gray-900">Auto-Schedule</p>
            <p className="text-xs text-gray-400 mt-0.5">Submit automatically on a set day each month</p>
          </div>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, auto_schedule: !f.auto_schedule }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.auto_schedule ? 'bg-primary-600' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.auto_schedule ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Schedule day */}
        {form.auto_schedule && (
          <div>
            <label className="label">
              Submit on day{' '}
              <span className="text-primary-600 font-extrabold">{form.schedule_day}</span>{' '}
              of each month
            </label>
            <input
              type="range"
              min={1} max={28} step={1}
              value={form.schedule_day}
              onChange={e => setForm(f => ({ ...f, schedule_day: Number(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-600 mt-1"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1.5 px-0.5">
              <span>1st</span><span>7th</span><span>14th</span><span>21st</span><span>28th</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className={`btn-primary w-full py-3 text-base ${saved ? '!bg-green-600 !hover:bg-green-700' : ''}`}
        >
          {saving ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</>
          ) : saved ? (
            <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Saved!</>
          ) : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
