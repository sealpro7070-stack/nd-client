import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const PAGE_SIZE = 15

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function History() {
  const [user, setUser] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    loadUser()
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submission History</h1>
        <p className="text-gray-500 text-sm mt-1">{total} total submission{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['all', 'success', 'pending', 'failed'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filterStatus === s
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-gray-400 text-sm">No submissions found.</div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="sm:hidden space-y-3">
            {filtered.map(s => (
              <div key={s.id} className="card py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{s.books?.title || '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.books?.author}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {s.books?.language && <span className="bg-gray-100 rounded-full px-2 py-0.5">{s.books.language}</span>}
                  {s.month && <span>{MONTHS[s.month - 1]} {s.year}</span>}
                  {s.submitted_at && (
                    <span>{new Date(s.submitted_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}</span>
                  )}
                </div>
                {s.error_message && (
                  <p className="text-xs text-red-400 mt-1 truncate">{s.error_message}</p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Book</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Language</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{s.books?.title || '—'}</p>
                      <p className="text-xs text-gray-400">{s.books?.author}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.books?.language || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                      {s.month ? `${MONTHS[s.month - 1]} ${s.year}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                      {s.error_message && (
                        <p className="text-xs text-red-400 mt-1 max-w-xs truncate">{s.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
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
          <p className="text-sm text-gray-500">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
