import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import BookCard from '../components/BookCard'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const LANGUAGES = ['Melayu', 'Inggeris', 'Cina', 'Tamil']
const BOOK_COUNTS = [1, 2, 3, 4]

export default function Dashboard() {
  const [user, setUser]           = useState(null)
  const [settings, setSettings]   = useState(null)
  const [stats, setStats]         = useState({ total: 0, successful: 0, thisMonth: 0 })
  const [recent, setRecent]       = useState([])
  const [loading, setLoading]     = useState(true)

  // Quick-submit controls (local state, saved when Submit is clicked)
  const [lang, setLang]           = useState('Melayu')
  const [bookCount, setBookCount] = useState(4)

  // Submit state
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState('')
  const [isError, setIsError]       = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      const [settingsRes, statsRes, recentRes] = await Promise.all([
        fetch(`${BACKEND}/api/settings?userId=${user.id}`),
        fetch(`${BACKEND}/api/history/stats?userId=${user.id}`),
        fetch(`${BACKEND}/api/history?userId=${user.id}&limit=5`),
      ])

      if (settingsRes.ok) {
        const s = await settingsRes.json()
        setSettings(s)
        setLang(s.language || 'Melayu')
        setBookCount(s.books_per_month || 4)
      }
      if (statsRes.ok) setStats(await statsRes.json())
      if (recentRes.ok) {
        const d = await recentRes.json()
        setRecent(d.submissions || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit() {
    if (!user) return
    setTriggering(true)
    setTriggerMsg('')
    setIsError(false)

    try {
      // 1. Save the selected settings first
      await fetch(`${BACKEND}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, language: lang, books_per_month: bookCount })
      })

      // 2. Trigger the bot with explicit count so it always submits N books
      const res = await fetch(`${BACKEND}/api/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, count: bookCount })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start')
      setTriggerMsg(data.message || 'Bot started! Check back in a few minutes.')
      setSettings(s => ({ ...s, language: lang, books_per_month: bookCount }))
    } catch (err) {
      setTriggerMsg(err.message)
      setIsError(true)
    } finally {
      setTriggering(false)
    }
  }

  const thisMonthDone = false // always allow adding more books

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Submit your NILAM reading records automatically.</p>
      </div>

      {/* ── Quick Submit Card ── */}
      <div className="card border-2 border-primary-100 bg-primary-50/30">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Submit Records Now
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">

          {/* Language */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Language</label>
            <div className="flex gap-2 flex-wrap">
              {LANGUAGES.map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    lang === l
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Books count */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Number of Books</label>
            <div className="flex gap-2">
              {BOOK_COUNTS.map(n => (
                <button
                  key={n}
                  onClick={() => setBookCount(n)}
                  className={`w-10 h-10 rounded-full text-sm font-bold border transition-all ${
                    bookCount === n
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSubmit}
            disabled={triggering || thisMonthDone}
            className={`btn-primary flex items-center gap-2 ${thisMonthDone ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {triggering ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Starting bot...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>Submit {bookCount} {lang} book{bookCount > 1 ? 's' : ''}</>
            )}
          </button>

          {triggerMsg && (
            <span className={`text-sm font-medium ${isError ? 'text-red-600' : 'text-green-600'}`}>
              {isError ? '✗' : '✓'} {triggerMsg}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Make sure you've saved your session via the Chrome extension before submitting.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="This Month" value={stats.thisMonth} sub={`of ${bookCount} books`} color="purple" />
        <StatCard label="Total Submitted" value={stats.successful} sub="all time" color="green" />
        <StatCard label="Language" value={settings?.language ?? '—'} sub="currently set" color="blue" />
        <StatCard label="Next Auto-Run" value={settings?.auto_schedule ? `Day ${settings.schedule_day}` : 'Off'} sub={settings?.auto_schedule ? 'of each month' : 'manual only'} color="orange" />
      </div>

      {/* Progress bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">This Month's Progress</span>
          <span className="text-sm font-bold text-primary-600">{stats.thisMonth} submitted</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-primary-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (stats.thisMonth / Math.max(stats.thisMonth, bookCount)) * 100)}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {stats.thisMonth === 0
            ? 'No books submitted yet this month.'
            : `${stats.thisMonth} book${stats.thisMonth > 1 ? 's' : ''} recorded in AINS this month.`}
        </p>
      </div>

      {/* Recent submissions */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Submissions</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No submissions yet.</p>
        ) : (
          recent.map(s => <BookCard key={s.id} submission={s} />)
        )}
      </div>

    </div>
  )
}

function StatCard({ label, value, sub, color, isDate }) {
  const colors = {
    purple: 'bg-primary-50 text-primary-600',
    green:  'bg-green-50 text-green-600',
    blue:   'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <div className="card">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={`font-bold ${isDate ? 'text-base' : 'text-2xl'} text-gray-900 truncate`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}
