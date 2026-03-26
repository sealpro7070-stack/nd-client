import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

const BACKEND   = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const PAGE_SIZE = 15
const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const FILTERS   = [
  { key: 'all',     label: 'All' },
  { key: 'success', label: 'Success' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed',  label: 'Failed' },
]
const LANG_COLORS = {
  Melayu:   'bg-brand-50 text-brand-600',
  Inggeris: 'bg-ok-50 text-ok-600',
  Cina:     'bg-danger-50 text-danger-600',
  Tamil:    'bg-warn-50 text-warn-600',
}

export default function History() {
  const [user, setUser]               = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(0)
  const [loading, setLoading]         = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetch(`${BACKEND}/api/history?userId=${user.id}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`)
      .then(r => r.json())
      .then(data => { setSubmissions(data.submissions || []); setTotal(data.total || 0); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user, page])

  const filtered   = filterStatus === 'all' ? submissions : submissions.filter(s => s.status === filterStatus)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="space-y-5"
    >
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-extrabold text-heading">Submission History</h1>
        <p className="text-muted text-sm mt-1">{total} total record{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-150 ${
              filterStatus === f.key
                ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                : 'bg-white text-muted border-line hover:border-brand-300 hover:text-brand-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-line border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="sm:hidden space-y-3">
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card-p"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-heading text-sm truncate">{s.books?.title || '—'}</p>
                    <p className="text-xs text-muted mt-0.5">{s.books?.author}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  {s.books?.language && (
                    <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${LANG_COLORS[s.books.language] || 'bg-gray-100 text-muted'}`}>
                      {s.books.language}
                    </span>
                  )}
                  {s.month && <span className="font-mono text-xs text-muted">{MONTHS[s.month - 1]} {s.year}</span>}
                  {s.submitted_at && (
                    <span className="font-mono text-xs text-subtle">
                      {new Date(s.submitted_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
                {s.error_message && <p className="text-xs text-danger-600 mt-1.5 truncate font-mono">{s.error_message}</p>}
              </motion.div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-gray-50/80">
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-widest">Book</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-muted uppercase tracking-widest">Language</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-muted uppercase tracking-widest hidden md:table-cell">Period</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-muted uppercase tracking-widest">Status</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-muted uppercase tracking-widest hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={`border-b border-line/50 hover:bg-brand-50/30 transition-colors ${i === filtered.length - 1 ? 'border-0' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-heading">{s.books?.title || '—'}</p>
                      <p className="text-xs text-muted mt-0.5">{s.books?.author}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${LANG_COLORS[s.books?.language] || 'bg-gray-100 text-muted'}`}>
                        {s.books?.language || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell font-mono text-xs text-muted">
                      {s.month ? `${MONTHS[s.month - 1]} ${s.year}` : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={s.status} />
                      {s.error_message && (
                        <p className="text-xs text-danger-600 mt-1 max-w-xs truncate font-mono">{s.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell font-mono text-xs text-subtle">
                      {s.submitted_at
                        ? new Date(s.submitted_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            Page {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-ghost text-sm py-2 px-4 disabled:opacity-30">
              ← Previous
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="btn-ghost text-sm py-2 px-4 disabled:opacity-30">
              Next →
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

function EmptyState() {
  return (
    <div className="card-p flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-16 h-16 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center">
        <svg className="w-8 h-8 text-brand-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-display font-bold text-muted text-lg">No records found</p>
        <p className="text-subtle text-sm mt-1">Try a different filter or submit some books first.</p>
      </div>
    </div>
  )
}
