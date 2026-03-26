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

  const [lang, setLang]           = useState('Melayu')
  const [bookCount, setBookCount] = useState(4)

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
      await fetch(`${BACKEND}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, language: lang, books_per_month: bookCount })
      })

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

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const displayName = user?.email?.split('@')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">

      {/* Greeting header */}
      <div className="bg-gradient-to-r from-primary-600 to-violet-600 rounded-2xl p-6 text-white">
        <p className="text-primary-100 text-sm font-medium mb-1">{greeting},</p>
        <h1 className="text-2xl font-extrabold truncate">{displayName}</h1>
        <p className="text-primary-200 text-sm mt-2">
          {stats.thisMonth > 0
            ? `You've submitted ${stats.thisMonth} book${stats.thisMonth > 1 ? 's' : ''} this month. Keep it up!`
            : "You haven't submitted any books this month yet."}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<CalendarIcon />} label="This Month" value={stats.thisMonth} sub={`of ${bookCount} books`} color="purple" />
        <StatCard icon={<CheckIcon />} label="All Time" value={stats.successful} sub="books submitted" color="green" />
        <StatCard icon={<LanguageIcon />} label="Language" value={settings?.language ?? '—'} sub="currently set" color="blue" />
        <StatCard icon={<ClockIcon />} label="Next Auto-Run" value={settings?.auto_schedule ? `Day ${settings.schedule_day}` : 'Off'} sub={settings?.auto_schedule ? 'of each month' : 'manual only'} color="orange" />
      </div>

      {/* Progress bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">This Month's Progress</span>
          <span className="text-sm font-bold text-primary-600">{stats.thisMonth} / {bookCount}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary-500 to-violet-500 h-2.5 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, (stats.thisMonth / Math.max(stats.thisMonth, bookCount)) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {stats.thisMonth === 0
            ? 'No books submitted yet this month.'
            : `${stats.thisMonth} book${stats.thisMonth > 1 ? 's' : ''} recorded in AINS this month.`}
        </p>
      </div>

      {/* Quick Submit */}
      <div className="card border-2 border-primary-100 bg-primary-50/20">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          Submit Records Now
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          {/* Language */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2.5 uppercase tracking-widest">Language</label>
            <div className="flex gap-2 flex-wrap">
              {LANGUAGES.map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                    lang === l
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Book count */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2.5 uppercase tracking-widest">Number of Books</label>
            <div className="flex gap-2">
              {BOOK_COUNTS.map(n => (
                <button
                  key={n}
                  onClick={() => setBookCount(n)}
                  className={`w-11 h-11 rounded-full text-sm font-bold border transition-all ${
                    bookCount === n
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handleSubmit}
            disabled={triggering}
            className="btn-primary"
          >
            {triggering ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Starting bot...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Submit {bookCount} {lang} book{bookCount > 1 ? 's' : ''}</>
            )}
          </button>

          {triggerMsg && (
            <span className={`text-sm font-semibold flex items-center gap-1.5 ${isError ? 'text-red-600' : 'text-green-600'}`}>
              {isError
                ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              }
              {triggerMsg}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Make sure you've saved your session via the Chrome extension before submitting.
        </p>
      </div>

      {/* Recent submissions */}
      <div className="card">
        <h2 className="text-base font-bold text-gray-900 mb-4">Recent Submissions</h2>
        {recent.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 font-medium">No submissions yet</p>
            <p className="text-xs text-gray-300 mt-1">Submit some books above to get started.</p>
          </div>
        ) : (
          recent.map(s => <BookCard key={s.id} submission={s} />)
        )}
      </div>

    </div>
  )
}

function StatCard({ icon, label, value, sub, color }) {
  const colors = {
    purple: { bg: 'bg-primary-50', icon: 'text-primary-600', value: 'text-primary-700' },
    green:  { bg: 'bg-green-50',   icon: 'text-green-600',   value: 'text-green-700' },
    blue:   { bg: 'bg-blue-50',    icon: 'text-blue-600',    value: 'text-blue-700' },
    orange: { bg: 'bg-orange-50',  icon: 'text-orange-600',  value: 'text-orange-700' },
  }
  const c = colors[color] || colors.purple

  return (
    <div className="card">
      <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center ${c.icon} mb-3`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`font-extrabold text-xl text-gray-900 truncate`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}

function CalendarIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
}
function CheckIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
}
function LanguageIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
}
function ClockIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
