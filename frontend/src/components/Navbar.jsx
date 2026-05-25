import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MascotMark } from './Mascot'

// Use env var to avoid exposing PII in the public JS bundle
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAIL || '').split(',').map(e => e.trim()).filter(Boolean)

export default function Navbar() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin]         = useState(false)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [userEmail, setUserEmail]     = useState('')
  const [userInitials, setUserInitials] = useState('?')
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [ainsConnected, setAinsConnected] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const email = session?.user?.email || ''
      const admin = ADMIN_EMAILS.includes(email)
      setIsAdmin(admin)
      setUserEmail(email)

      // Derive initials from email prefix
      const prefix = email.split('@')[0] || ''
      const parts = prefix.split(/[._-]/).filter(Boolean)
      setUserInitials(parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : prefix.slice(0, 2).toUpperCase() || '?'
      )

      if (!session?.user || admin) {
        setShowUpgrade(false)
        return
      }

      const { data } = await supabase
        .from('users').select('plan, plan_expires_at, ains_session').eq('id', session.user.id).maybeSingle()
      const plan = data?.plan || 'free'
      const expired = data?.plan_expires_at && new Date(data.plan_expires_at) < new Date()
      const needsUpgrade = plan === 'free' || (plan !== 'noob' && expired)
      setShowUpgrade(!!needsUpgrade)
      setAinsConnected(!!data?.ains_session)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const NAV_TABS = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/history',   label: 'History'   },
    { to: '/settings',  label: 'Settings'  },
    ...(showUpgrade ? [{ to: '/upgrade', label: 'Upgrade' }] : []),
    { to: '/guide',     label: 'Guide'     },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <header className="bg-cream border-b-[3px] border-ink sticky top-0 z-50">

      {/* Top row: logo + user actions */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-8 py-3 max-w-[1180px] mx-auto">
        <NavLink to="/dashboard" className="flex items-center gap-2">
          <MascotMark size={28} />
          <span className="font-display font-black tracking-tight text-ink text-sm">
            NILAM<span className="text-cobalt">.desk</span>
          </span>
        </NavLink>

        <div className="flex items-center gap-2">
          {/* AINS connection pill — desktop only */}
          <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-[2px] border-ink bg-white text-[10px] font-extrabold tracking-wider uppercase ${ainsConnected ? '' : 'opacity-60'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${ainsConnected ? 'bg-[#28C840]' : 'bg-[#FF6B3D]'}`} />
            {ainsConnected ? 'AINS Connected' : 'Not Connected'}
          </span>

          {/* Avatar + logout */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-9 h-9 rounded-full bg-yellow border-[2.5px] border-ink flex items-center justify-center font-display font-black text-ink text-[11px] hover:opacity-80 transition-opacity"
              title={userEmail}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="User menu"
            >
              {userInitials}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border-[2.5px] border-ink rounded-2xl shadow-lg overflow-hidden z-50"
                style={{ boxShadow: '4px 4px 0 #0F172A' }}>
                <div className="px-4 py-3 border-b-[2px] border-ink bg-cream">
                  <p className="text-[11px] font-mono text-ink/60 truncate">{userEmail}</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); handleLogout() }}
                  className="w-full flex items-center gap-2 text-sm font-extrabold text-ink px-4 py-3 hover:bg-yellow transition-colors"
                >
                  <LogoutIcon className="w-4 h-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab row */}
      <nav className="border-t-[2px] border-ink/10 flex gap-0 overflow-x-auto px-2 sm:px-6 max-w-[1180px] mx-auto">
        {NAV_TABS.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `relative px-4 py-3 font-display font-extrabold text-sm whitespace-nowrap transition-colors ${
                isActive ? 'text-ink' : 'text-ink/50 hover:text-ink'
              }`
            }
            style={{ minHeight: 48 }}
          >
            {({ isActive }) => (
              <>
                {t.label}
                {isActive && (
                  <span className="absolute left-3 right-3 -bottom-[3px] h-[3px] bg-cobalt rounded-t" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Close dropdown on outside click */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
      )}
    </header>
  )
}

function LogoutIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
}
