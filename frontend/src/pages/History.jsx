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

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getToken().then(token => {
      fetch(`${BACKEND}/api/history?userId=${user.id}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => { setSubmissions(data.submissions || []); setTotal(data.total || 0); setLoading(false) })
        .catch(() => setLoading(false))
    })
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
        <p className="font-mono text-cobalt text-xs tracking-[0.3em] uppercase font-bold">// history</p>
        <h1 className="font-display font-black tracking-tight leading-none mt-2 text-ink text-3xl sm:text-5xl">
          Everything submitted.
        </h1>
        <p className="text-ink/60 mt-2 font-medium text-sm sm:text-base">
          {total} record{total !== 1 ? 's' : ''} total.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border-[3px] border-ink rounded-2xl p-3 flex items-center gap-2 flex-wrap"
        style={{ boxShadow: '4px 4px 0 #0F172A' }}>
        <div className="flex gap-1 bg-cream border-[2.5px] border-ink rounded-xl p-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => { setFilterStatus(f.key); setPage(0) }}
              className={`px-3 text-xs font-extrabold rounded-lg transition-colors ${filterStatus === f.key ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink'}`}
              style={{ minHeight: 36 }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span style={{ width: 32, height: 32, border: '3px solid #0F172A', borderTopColor: '#FFD23F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white border-[3px] border-ink rounded-2xl overflow-hidden"
          style={{ boxShadow: '4px 4px 0 #0F172A' }}>
          <div className="px-5 py-3 bg-ink text-cream flex items-center justify-between">
            <span className="font-display font-black text-sm uppercase tracking-[0.15em]">Records</span>
            <span className="font-mono text-cream/70 text-[11px] font-bold">{filtered.length} shown</span>
          </div>
          <div className="divide-y-[2px] divide-ink/10">
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-5 py-3 flex-wrap sm:flex-nowrap"
              >
                {/* Status dot */}
                <div className={`w-7 h-7 rounded-lg border-[2px] border-ink flex items-center justify-center flex-shrink-0 ${s.status === 'success' ? 'bg-[#A8E6A1]' : s.status === 'failed' ? 'bg-[#FF8FA3]' : 'bg-yellow'}`}>
                  {s.status === 'success'
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : s.status === 'failed'
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="3" strokeLinecap="round"><circle cx="12" cy="12" r="3"/></svg>
                  }
                </div>
                {/* Title + author */}
                <div className="min-w-0 flex-1">
                  <p className="font-display font-extrabold text-ink text-sm truncate">{s.books?.title || '—'}</p>
                  <p className="text-[11px] text-ink/55 font-medium truncate">{s.books?.author}</p>
                  {s.error_message && <p className="text-[11px] text-[#C9362F] truncate font-mono mt-0.5">{s.error_message.slice(0, 60)}</p>}
                </div>
                {/* Meta */}
                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end pl-9 sm:pl-0">
                  {s.books?.language && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border-[2px] border-ink bg-cream text-ink">
                      {s.books.language}
                    </span>
                  )}
                  {s.month && (
                    <span className="font-mono text-[10px] text-ink/50 font-bold tabular-nums">
                      {MONTHS[s.month - 1]} {s.year}
                    </span>
                  )}
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md border-[2px] border-ink ${
                    s.status === 'success' ? 'bg-[#A8E6A1] text-ink' :
                    s.status === 'failed'  ? 'bg-[#FF8FA3] text-ink' :
                                             'bg-yellow text-ink'
                  }`}>
                    {s.status === 'success' ? 'Submitted' : s.status === 'failed' ? 'Failed' : s.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-ink/50 font-bold">
            Page {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="chunky-btn chunky-btn--ghost chunky-btn--small disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="chunky-btn chunky-btn--ghost chunky-btn--small disabled:opacity-30"
            >
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
    <div className="bg-white border-[3px] border-ink rounded-2xl p-10 text-center"
      style={{ boxShadow: '4px 4px 0 #0F172A' }}>
      <div className="w-14 h-14 bg-cream border-[2.5px] border-ink rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ boxShadow: '3px 3px 0 #0F172A' }}>
        <svg className="w-7 h-7 text-ink/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="font-display font-black text-ink text-lg">No records found.</p>
      <p className="text-ink/55 text-sm mt-1 font-medium">Try a different filter or submit some books first.</p>
    </div>
  )
}
