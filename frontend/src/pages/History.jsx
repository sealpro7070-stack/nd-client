import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const PAGE_SIZE = 15

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const FILTERS = [
  { key: 'all',     label: 'All' },
  { key: 'success', label: 'Success' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed',  label: 'Failed' },
]

export default function History() {
  const [user, setUser] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetch(`${BACKEND}/api/history?userId=${user.id}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`)
      .then(r => r.json())
      .then(data => {
        setSubmissions(data.submissions || [])
        setTotal(data.total || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user, page])

  const filtered = filterStatus === 'all'
    ? submissions
    : submissions.filter(s => s.status === filterStatus)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Submission History</h1>
        <p className="text-gray-400 text-sm mt-1">
          {total} total submission{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filterStatus === f.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-400">No submissions found</p>
          <p className="text-xs text-gray-300 mt-1">Try a different filter or submit some books first.</p>
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="sm:hidden space-y-3">
            {filtered.map(s => (
              <div key={s.id} className="card py-4 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate text-sm">{s.books?.title || '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.books?.author}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex items-center gap-2.5 mt-2.5 text-xs text-gray-500 flex-wrap">
                  {s.books?.language && (
                    <span className="bg-primary-50 text-primary-600 font-semibold rounded-lg px-2 py-0.5">{s.books.language}</span>
                  )}
                  {s.month && <span>{MONTHS[s.month - 1]} {s.year}</span>}
                  {s.submitted_at && (
                    <span>{new Date(s.submitted_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}</span>
                  )}
                </div>
                {s.error_message && (
                  <p className="text-xs text-red-400 mt-1.5 truncate">{s.error_message}</p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-left px-6 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wide">Book</th>
                  <th className="text-left px-4 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wide">Language</th>
                  <th className="text-left px-4 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">Period</th>
                  <th className="text-left px-4 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${i === filtered.length - 1 ? 'border-0' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{s.books?.title || '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.books?.author}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="bg-primary-50 text-primary-600 font-semibold text-xs rounded-lg px-2.5 py-1">
                        {s.books?.language || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell text-gray-500">
                      {s.month ? `${MONTHS[s.month - 1]} ${s.year}` : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={s.status} />
                      {s.error_message && (
                        <p className="text-xs text-red-400 mt-1 max-w-xs truncate">{s.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell text-gray-400 text-xs">
                      {s.submitted_at
                        ? new Date(s.submitted_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400 font-medium">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="btn-secondary text-sm py-2 px-4 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="btn-secondary text-sm py-2 px-4 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
