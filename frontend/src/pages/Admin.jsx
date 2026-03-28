import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ConnectAINSModal from '../components/ConnectAINSModal'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'm-10603978@moe-dl.edu.my'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export default function Admin() {
  const navigate = useNavigate()
  const [tab, setTab]           = useState('users')   // 'users' | 'payments'
  const [users, setUsers]       = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [payFilter, setPayFilter] = useState('pending')
  const [toasting, setToasting] = useState(null)
  const [token, setToken]       = useState('')
  const [connectTarget, setConnectTarget] = useState(null) // { id, email } of user to connect AINS for
  const [roleTarget, setRoleTarget]       = useState(null) // userId being role-changed

  useEffect(() => { checkAdminAndLoad() }, [])

  async function checkAdminAndLoad() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/'); return }
    if (session.user.email !== ADMIN_EMAIL) { navigate('/dashboard'); return }
    setToken(session.access_token)
    await Promise.all([fetchUsers(session.access_token), fetchPayments(session.access_token)])
  }

  async function fetchUsers(tok) {
    setLoading(true); setError(null)
    try {
      const freshToken = tok || (await supabase.auth.getSession()).data.session?.access_token || token
      const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${freshToken}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(data.users)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function fetchPayments(tok) {
    try {
      const freshToken = tok || (await supabase.auth.getSession()).data.session?.access_token || token
      const res = await fetch(`${BACKEND_URL}/api/payments/admin/list`, {
        headers: { Authorization: `Bearer ${freshToken}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPayments(data.requests || [])
    } catch (err) { setError(err.message) }
  }

  async function toggleActivate(userId, currentlyActive) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, activate: !currentlyActive })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentlyActive } : u))
      showToast(!currentlyActive ? 'User activated!' : 'User deactivated.')
    } catch (err) { showToast(err.message, 'error') }
  }

  async function setRole(userId, role) {
    setRoleTarget(userId)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/set-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, role })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: role } : u))
      showToast(`Role set to "${role}" for user`)
    } catch (err) { showToast(err.message, 'error') }
    finally { setRoleTarget(null) }
  }

  async function reviewPayment(requestId, action) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/payments/admin/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId, action })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPayments(prev => prev.map(p =>
        p.id === requestId ? { ...p, status: action === 'approve' ? 'approved' : 'rejected' } : p
      ))
      showToast(action === 'approve' ? 'Plan activated!' : 'Request rejected.')
      // Also refresh users so plan column updates
      fetchUsers()
    } catch (err) { showToast(err.message, 'error') }
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

  const filteredPayments = payments.filter(p =>
    payFilter === 'all' ? true : p.status === payFilter
  )

  const pendingPayCount = payments.filter(p => p.status === 'pending').length

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
            <button onClick={() => { fetchUsers(); fetchPayments() }} className="btn-ghost text-sm py-2 px-4">Refresh</button>
            <button onClick={() => navigate('/dashboard')} className="btn-ghost text-sm py-2 px-4">← Dashboard</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Users',      value: stats.total,      cls: 'bg-brand-50 text-brand-700 border-brand-100' },
            { label: 'Active',           value: stats.active,     cls: 'bg-ok-50 text-ok-700 border-ok-100' },
            { label: 'Pending Approval', value: stats.pending,    cls: 'bg-warn-50 text-warn-600 border-warn-100' },
            { label: 'Pending Payments', value: pendingPayCount,  cls: pendingPayCount > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-card p-4 border ${s.cls}`}>
              <div className="font-display text-3xl font-extrabold">{s.value}</div>
              <div className="text-sm mt-1 font-semibold opacity-80">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 border-b border-line">
          {[
            { id: 'users',    label: 'Users' },
            { id: 'payments', label: `Payments${pendingPayCount > 0 ? ` (${pendingPayCount})` : ''}` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-muted hover:text-heading'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Users tab ── */}
        {tab === 'users' && (
          <>
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
                  >{f}</button>
                ))}
              </div>
            </div>

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
                      <th className="px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide hidden md:table-cell">Plan</th>
                      <th className="px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide hidden md:table-cell">Cookie</th>
                      <th className="px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide hidden md:table-cell">Records</th>
                      <th className="px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide">Joined</th>
                      <th className="px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide text-center">Status</th>
                      <th className="px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user, i) => (
                      <tr key={user.id} className={`border-b border-line/50 hover:bg-brand-50/30 transition-colors ${i === filtered.length - 1 ? 'border-0' : ''}`}>
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
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                            user.plan === 'family' ? 'bg-ok-100 text-ok-700' :
                            user.plan === 'plus'   ? 'bg-brand-100 text-brand-700' :
                            user.plan === 'noob'   ? 'bg-purple-100 text-purple-700' :
                                                     'bg-gray-100 text-gray-600'
                          }`}>{user.plan || 'free'}{user.plan === 'noob' ? ' 🧪' : ''}</span>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          {user.has_cookie
                            ? <span className="text-ok-600 font-semibold text-xs">✓ Saved</span>
                            : <span className="text-subtle text-xs">Not saved</span>}
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell text-muted text-xs">
                          {user.submissions_success} / {user.submissions_total}
                        </td>
                        <td className="px-5 py-4 text-subtle text-xs">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('en-MY') : '—'}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {user.is_active ? (
                            <span className="inline-flex items-center gap-1 bg-ok-100 text-ok-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 bg-ok-500 rounded-full" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-warn-100 text-warn-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 bg-warn-500 rounded-full" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {user.email === ADMIN_EMAIL ? (
                              <span className="text-xs text-brand-500 font-bold">👑 Admin</span>
                            ) : (
                              <>
                                {/* Role selector */}
                                <select
                                  value={user.plan || 'free'}
                                  disabled={roleTarget === user.id}
                                  onChange={e => setRole(user.id, e.target.value)}
                                  className="text-xs font-semibold px-2 py-1 rounded-lg border border-line bg-white text-heading w-full max-w-[110px] cursor-pointer disabled:opacity-50"
                                >
                                  <option value="free">Free</option>
                                  <option value="plus">Plus</option>
                                  <option value="family">Family</option>
                                  <option value="noob">Noob 🧪</option>
                                </select>
                                <button
                                  onClick={() => toggleActivate(user.id, user.is_active)}
                                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition w-full max-w-[110px] ${
                                    user.is_active
                                      ? 'bg-danger-50 text-danger-600 hover:bg-danger-100'
                                      : 'bg-brand-600 text-white hover:bg-brand-700'
                                  }`}
                                >
                                  {user.is_active ? 'Deactivate' : 'Approve'}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setConnectTarget({ id: user.id, email: user.email })}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition w-full max-w-[110px]"
                            >
                              {user.has_cookie ? 'Reconnect AINS' : 'Connect AINS'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Payments tab ── */}
        {tab === 'payments' && (
          <>
            <div className="flex gap-2 mb-5">
              {['pending', 'approved', 'rejected', 'all'].map(f => (
                <button
                  key={f}
                  onClick={() => setPayFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all capitalize ${
                    payFilter === f
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white border-line text-muted hover:border-brand-300 hover:text-brand-600'
                  }`}
                >{f}</button>
              ))}
            </div>

            {filteredPayments.length === 0 ? (
              <div className="card-p text-center py-12 text-muted">No payment requests found.</div>
            ) : (
              <div className="space-y-3">
                {filteredPayments.map(pr => (
                  <div key={pr.id} className="card-p flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-heading text-sm truncate">
                          {pr.users?.email || pr.user_id.slice(0, 8) + '…'}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                          pr.plan === 'family' ? 'bg-ok-100 text-ok-700' : 'bg-brand-100 text-brand-700'
                        }`}>{pr.plan}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          pr.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                          pr.status === 'approved' ? 'bg-ok-100 text-ok-700' :
                                                     'bg-danger-100 text-danger-700'
                        }`}>{pr.status}</span>
                      </div>
                      <div className="text-xs text-muted mt-1 flex flex-wrap gap-3">
                        <span>RM{pr.amount}/year</span>
                        <span>{new Date(pr.created_at).toLocaleString('en-MY')}</span>
                        {pr.reference && <span>Ref: <strong className="text-heading">{pr.reference}</strong></span>}
                        {pr.reviewed_by && <span>Reviewed by: {pr.reviewed_by}</span>}
                      </div>
                    </div>
                    {pr.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => reviewPayment(pr.id, 'approve')}
                          className="text-xs font-bold px-4 py-2 bg-ok-500 text-white rounded-lg hover:bg-ok-600 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reviewPayment(pr.id, 'reject')}
                          className="text-xs font-bold px-4 py-2 bg-danger-50 text-danger-600 rounded-lg hover:bg-danger-100 transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toasting && (
        <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-card-md text-sm font-semibold text-white transition z-50 ${
          toasting.type === 'error' ? 'bg-danger-500' : 'bg-ok-500'
        }`}>
          {toasting.msg}
        </div>
      )}

      {/* Admin AINS connect modal — can connect for any user */}
      {connectTarget && (
        <ConnectAINSModal
          targetUserId={connectTarget.id}
          isOpen={true}
          onClose={() => setConnectTarget(null)}
          onSuccess={() => {
            showToast(`AINS connected for ${connectTarget.email}`)
            setConnectTarget(null)
            fetchUsers()
          }}
        />
      )}
    </div>
  )
}
