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
  const [filter, setFilter]     = useState('all') // all | active | pending
  const [toasting, setToasting] = useState(null)

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  async function checkAdminAndLoad() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/'); return }
    if (session.user.email !== ADMIN_EMAIL) { navigate('/dashboard'); return }
    await fetchUsers(session.access_token)
  }

  async function fetchUsers(token) {
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
    const matchFilter = filter === 'all'
      ? true
      : filter === 'active' ? u.is_active : !u.is_active
    return matchSearch && matchFilter
  })

  const stats = {
    total:   users.length,
    active:  users.filter(u => u.is_active).length,
    pending: users.filter(u => !u.is_active).length,
    withCookie: users.filter(u => u.has_cookie).length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6C5CE7] to-[#a29bfe] text-white px-6 py-5 shadow">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Nilam Auto — Admin</h1>
            <p className="text-purple-100 text-sm mt-0.5">User management & approvals</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
          >
            ← Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users',    value: stats.total,      color: 'bg-purple-50 text-purple-700' },
            { label: 'Active',         value: stats.active,     color: 'bg-green-50 text-green-700' },
            { label: 'Pending Approval', value: stats.pending,  color: 'bg-yellow-50 text-yellow-700' },
            { label: 'Cookie Saved',   value: stats.withCookie, color: 'bg-blue-50 text-blue-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-sm mt-1 font-medium opacity-80">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text"
            placeholder="Search by email or Delima ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#6C5CE7]"
          />
          <div className="flex gap-2">
            {['all', 'pending', 'active'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                  filter === f
                    ? 'bg-[#6C5CE7] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-[#6C5CE7]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-[#6C5CE7] transition"
          >
            Refresh
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading users...</div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No users found.</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-5 py-3 font-semibold text-gray-600">User</th>
                  <th className="px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Delima ID</th>
                  <th className="px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Cookie</th>
                  <th className="px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Records</th>
                  <th className="px-5 py-3 font-semibold text-gray-600">Joined</th>
                  <th className="px-5 py-3 font-semibold text-gray-600 text-center">Status</th>
                  <th className="px-5 py-3 font-semibold text-gray-600 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, i) => (
                  <tr
                    key={user.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                      i === filtered.length - 1 ? 'border-0' : ''
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {(user.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 max-w-[180px] truncate">{user.email}</div>
                          <div className="text-xs text-gray-400 md:hidden">{user.delima_id || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600 hidden md:table-cell">
                      {user.delima_id || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      {user.has_cookie ? (
                        <span className="text-green-600 font-medium">✓ Saved</span>
                      ) : (
                        <span className="text-gray-400">Not saved</span>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-gray-600">
                      {user.submissions_success} / {user.submissions_total}
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      <div>{user.created_at ? new Date(user.created_at).toLocaleDateString('en-MY') : '—'}</div>
                      {user.last_sign_in && (
                        <div className="text-gray-400 mt-0.5">
                          Last in: {new Date(user.last_sign_in).toLocaleDateString('en-MY')}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {user.email === ADMIN_EMAIL && (
                          <span className="text-xs text-purple-500 font-semibold">Admin</span>
                        )}
                        <button
                          onClick={() => toggleActivate(user.id, user.is_active)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                            user.is_active
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-[#6C5CE7] text-white hover:bg-[#5a47d4]'
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
        <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition ${
          toasting.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toasting.msg}
        </div>
      )}
    </div>
  )
}
