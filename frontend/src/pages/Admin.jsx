import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 'm-10603978@moe-dl.edu.my'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export default function Admin() {
  const navigate = useNavigate()
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [toasting, setToasting] = useState(null)

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  async function checkAdminAndLoad() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/'); return }
    if (session.user.email !== ADMIN_EMAIL) { navigate('/dashboard'); return }
    await fetchUsers()
  }

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(data.users)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleActivate(userId, currentlyActive) {
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId, activate: !currentlyActive })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_active: !currentlyActive } : u
      ))
      showToast(!currentlyActive ? 'User activated!' : 'User deactivated.')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  function showToast(msg, type = 'success') {
    setToasting({ msg, type })
    setTimeout(() => setToasting(null), 3000)
  }

  const filtered = users.filter(u => {
    const matchSearch = u.email?.toLowerCase().includes(search.toLowerCase()) ||
                        u.delima_id?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' ? true : filter === 'active' ? u.is_active : !u.is_active
    return matchSearch && matchFilter
  })

  const stats = {
    total:      users.length,
    active:     users.filter(u => u.is_active).length,
    pending:    users.filter(u => !u.is_active).length,
    withCookie: users.filter(u => u.has_cookie).length,
  }

  return (
    <div className="min-h-screen bg-page">

      {/* Header */}
      <div className="bg-white border-b border-line px-6 py-5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-extrabold text-heading">Admin Panel</h1>
            <p className="text-muted text-sm mt-0.5">User management &amp; approvals</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchUsers}
              className="btn-ghost text-sm py-2 px-4"
            >
              Refresh
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-ghost text-sm py-2 px-4"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users',      value: stats.total,      cls: 'bg-brand-50 text-brand-700 border-brand-100' },
            { label: 'Active',           value: stats.active,     cls: 'bg-ok-50 text-ok-700 border-ok-100' },
            { label: 'Pending Approval', value: stats.pending,    cls: 'bg-warn-50 text-warn-600 border-warn-100' },
            { label: 'Cookie Saved',     value: stats.withCookie, cls: 'bg-brand-50 text-brand-600 border-brand-100' },
          ].map(s => (
            <div key={s.label} className={`rounded-card p-4 border ${s.cls}`}>
              <div className="font-display text-3xl font-extrabold">{s.value}</div>
              <div className="text-sm mt-1 font-semibold opacity-80">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text"
            placeholder="Search by email or Delima ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input flex-1"
          />
          <div className="flex gap-2">
            {['all', 'pending', 'active'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all capitalize ${
                  filter === f
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white border-line text-muted hover:border-brand-300 hover:text-brand-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-line border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="card-p text-center py-12 text-danger-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="card-p text-center py-12 text-muted">No users found.</div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-line text-left">
                  <th className="px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide">User</th>
                  <th className="px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide hidden md:table-cell">Delima ID</th>
                  <th className="px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide hidden md:table-cell">Cookie</th>
                  <th className="px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide hidden md:table-cell">Records</th>
                  <th className="px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide">Joined</th>
                  <th className="px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide text-center">Status</th>
                  <th className="px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, i) => (
                  <tr
                    key={user.id}
                    className={`border-b border-line/50 hover:bg-brand-50/30 transition-colors ${i === filtered.length - 1 ? 'border-0' : ''}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {(user.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-heading max-w-[180px] truncate">{user.email}</div>
                          <div className="text-xs text-muted md:hidden">{user.delima_id || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted hidden md:table-cell">
                      {user.delima_id || <span className="text-subtle">—</span>}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      {user.has_cookie ? (
                        <span className="text-ok-600 font-semibold text-xs">✓ Saved</span>
                      ) : (
                        <span className="text-subtle text-xs">Not saved</span>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-muted text-xs">
                      {user.submissions_success} / {user.submissions_total}
                    </td>
                    <td className="px-5 py-4 text-subtle text-xs">
                      <div>{user.created_at ? new Date(user.created_at).toLocaleDateString('en-MY') : '—'}</div>
                      {user.last_sign_in && (
                        <div className="text-subtle mt-0.5">
                          Last: {new Date(user.last_sign_in).toLocaleDateString('en-MY')}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 bg-ok-100 text-ok-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-ok-500 rounded-full" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-warn-100 text-warn-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-warn-500 rounded-full" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {user.email === ADMIN_EMAIL && (
                          <span className="text-xs text-brand-500 font-semibold">Admin</span>
                        )}
                        <button
                          onClick={() => toggleActivate(user.id, user.is_active)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                            user.is_active
                              ? 'bg-danger-50 text-danger-600 hover:bg-danger-100'
                              : 'bg-brand-600 text-white hover:bg-brand-700'
                          }`}
                        >
                          {user.is_active ? 'Deactivate' : 'Approve'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast */}
      {toasting && (
        <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-card-md text-sm font-semibold text-white transition ${
          toasting.type === 'error' ? 'bg-danger-500' : 'bg-ok-500'
        }`}>
          {toasting.msg}
        </div>
      )}
    </div>
  )
}
