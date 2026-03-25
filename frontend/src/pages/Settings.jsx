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
  const [cookieStatus, setCookieStatus] = useState(null) // 'fresh' | 'stale' | null

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

      // Check cookie status
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

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure your NILAM automation preferences.</p>
      </div>

      {/* Cookie status */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Session Cookie</h2>
        <div className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
          cookieStatus === 'fresh' ? 'bg-green-50' :
          cookieStatus === 'stale' ? 'bg-yellow-50' :
          'bg-gray-50'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            cookieStatus === 'fresh' ? 'bg-green-400' :
            cookieStatus === 'stale' ? 'bg-yellow-400' :
            'bg-gray-300'
          }`}></div>
          <div>
            {cookieStatus === 'fresh' && <span className="text-green-700 font-medium">Cookie is saved and fresh.</span>}
            {cookieStatus === 'stale' && <span className="text-yellow-700 font-medium">Cookie may be expired. Please re-login via the Chrome extension.</span>}
            {!cookieStatus && <span className="text-gray-600">No cookie saved yet. Install the Chrome extension and visit ains.moe.gov.my.</span>}
          </div>
        </div>
      </div>

      {/* Preferences form */}
      <form onSubmit={handleSave} className="card space-y-6">
        <h2 className="text-base font-semibold text-gray-900">Automation Preferences</h2>

        {/* Books per month */}
        <div>
          <label className="label">
            Books per month — <span className="text-primary-600 font-bold">{form.books_per_month}</span>
          </label>
          <input
            type="range"
            min={1} max={8} step={1}
            value={form.books_per_month}
            onChange={e => setForm(f => ({ ...f, books_per_month: Number(e.target.value) }))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="label">Book Language</label>
          <div className="grid grid-cols-4 gap-2">
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => setForm(f => ({ ...f, language: lang }))}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  form.language === lang
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
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
          <div className="flex gap-2">
            {BOOK_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setForm(f => ({ ...f, book_type: type }))}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${
                  form.book_type === type
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Auto schedule */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Auto-Schedule</p>
            <p className="text-xs text-gray-500">Automatically submit on a set day each month</p>
          </div>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, auto_schedule: !f.auto_schedule }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.auto_schedule ? 'bg-primary-500' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.auto_schedule ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Schedule day */}
        {form.auto_schedule && (
          <div>
            <label className="label">Submit on day — <span className="text-primary-600 font-bold">{form.schedule_day}</span> of each month</label>
            <input
              type="range"
              min={1} max={28} step={1}
              value={form.schedule_day}
              onChange={e => setForm(f => ({ ...f, schedule_day: Number(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1st</span><span>7th</span><span>14th</span><span>21st</span><span>28th</span>
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
