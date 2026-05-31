import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import BookCard from '../components/BookCard'
import ConnectAINSModal from '../components/ConnectAINSModal'
import UpgradeModal from '../components/UpgradeModal'

const BACKEND      = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const LANGUAGES    = ['Malay', 'English', 'Chinese', 'Tamil']
const LANG_MAP     = { Malay: 'Melayu', English: 'Inggeris', Chinese: 'Cina', Tamil: 'Tamil' }
const LANG_DISPLAY = { Melayu: 'Malay', Inggeris: 'English', Cina: 'Chinese', Tamil: 'Tamil' }
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAIL || '').split(',').map(e => e.trim()).filter(Boolean)

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser]             = useState(null)
  const [settings, setSettings]     = useState(null)
  const [stats, setStats]           = useState({ total: 0, successful: 0, thisMonth: 0, thisWeek: 0 })
  const [recent, setRecent]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [lang, setLang]             = useState('Malay')
  const [bookCount, setBookCount]   = useState(4)
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState('')
  const [isError, setIsError]       = useState(false)
  const [credsStatus, setCredsStatus] = useState(null)
  const [plan, setPlan]             = useState('free')
  const [credits, setCredits]       = useState(0)
  const [showAINSModal, setShowAINSModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Live progress state
  const [liveProgress, setLiveProgress] = useState([])
  const progressPollRef = useRef(null)

  // Family plan state
  const [familySlots, setFamilySlots]   = useState([])
  const [newSlotName, setNewSlotName]   = useState('')
  const [addingSlot, setAddingSlot]     = useState(false)
  const [addSlotErr, setAddSlotErr]     = useState('')
  // Per-slot UI state: { [slotId]: { phase, email, password, showForm, trigMsg, trigErr } }
  const [slotStates, setSlotStates]     = useState({})
  const pollRefs = useRef({})

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        setUser(user)

        const token = await getToken()

        let referredBy
        try { referredBy = localStorage.getItem('nilam_ref') || undefined } catch {}
        fetch(`${BACKEND}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ id: user.id, email: user.email, referred_by: referredBy }),
          signal: AbortSignal.timeout(8000),
        }).catch(() => {})

        const authHeader = { 'Authorization': `Bearer ${token}` }
        const timeout = { signal: AbortSignal.timeout(10000) }
        const [sRes, stRes, rRes] = await Promise.allSettled([
          fetch(`${BACKEND}/api/settings`, { headers: authHeader, ...timeout }),
          fetch(`${BACKEND}/api/history/stats`, { headers: authHeader, ...timeout }),
          fetch(`${BACKEND}/api/history?limit=5`, { headers: authHeader, ...timeout }),
        ])

        if (sRes.status === 'fulfilled' && sRes.value.ok) {
          const s = await sRes.value.json()
          setSettings(s)
          const displayLang = Object.entries(LANG_MAP).find(([, v]) => v === s.language)?.[0] || 'Malay'
          setLang(displayLang)
          setBookCount(s.books_per_month || 4)
        }
        if (stRes.status === 'fulfilled' && stRes.value.ok) setStats(await stRes.value.json())
        if (rRes.status === 'fulfilled' && rRes.value.ok) {
          const d = await rRes.value.json()
          setRecent(d.submissions || [])
        }

        const { data: ud } = await supabase
          .from('users').select('ains_cookie_encrypted, plan, credits').eq('id', user.id).maybeSingle()
        const connected = !!ud?.ains_cookie_encrypted
        setCredsStatus(connected ? 'saved' : 'none')
        const isAdminUser = ADMIN_EMAILS.includes(user.email || '')
        const userPlan = isAdminUser ? 'noob' : (ud?.plan || 'free')
        setPlan(userPlan)
        setCredits(ud?.credits || 0)
        // Clamp bookCount to the daily cap (volume is credit-driven for all users)
        const planMax = userPlan === 'noob' ? 999 : 30
        setBookCount(prev => Math.min(prev, planMax))
        if (!connected) setShowAINSModal(true)

        // Load family slots if on family plan
        if (userPlan === 'family') {
          await loadFamilySlots(user)
        }
      } catch (err) {
        console.error('[dashboard] load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => {
      Object.values(pollRefs.current).forEach(clearInterval)
      if (progressPollRef.current) clearInterval(progressPollRef.current)
    }
  }, [])

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  async function loadFamilySlots(u) {
    const token = await getToken()
    const res = await fetch(`${BACKEND}/api/family/slots`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (res.ok) {
      const d = await res.json()
      setFamilySlots(d.slots || [])
    }
  }

  async function doTrigger(userId, apiLang, count) {
    setTriggering(true)
    setTriggerMsg('')
    setIsError(false)
    setLiveProgress([])

    const triggerTime = new Date().toISOString()

    // Poll Supabase every 2s for live submission status (recursive setTimeout prevents overlap)
    const stopProgressPoll = () => {
      if (progressPollRef.current) { clearTimeout(progressPollRef.current); progressPollRef.current = null }
    }
    const pollProgress = async () => {
      try {
        const { data } = await supabase
          .from('submissions')
          .select('id, status, error_message, books(title)')
          .eq('user_id', userId)
          .is('family_slot_id', null)
          .gte('created_at', triggerTime)
          .order('created_at', { ascending: true })
        if (data) setLiveProgress(data)
      } catch (err) {
        // Silently ignore polling errors
      }
      progressPollRef.current = setTimeout(pollProgress, 2000)
    }
    progressPollRef.current = setTimeout(pollProgress, 2000)

    try {
      const token = await getToken()
      await fetch(`${BACKEND}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ language: apiLang, books_per_month: count }),
      })
      const res  = await fetch(`${BACKEND}/api/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ count }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error || 'Failed to start')
      setTriggerMsg(data.message || 'Done! Check History for details.')
      setSettings(s => ({ ...s, language: apiLang, books_per_month: count }))
    } catch (err) {
      setTriggerMsg(err.message)
      setIsError(true)
      if (/session expired|reconnect/i.test(err.message)) {
        setCredsStatus('none')
        setShowAINSModal(true)
      }
    } finally {
      setTriggering(false)
      stopProgressPoll()
      // Final poll to capture last status updates
      const { data } = await supabase
        .from('submissions')
        .select('id, status, error_message, books(title)')
        .eq('user_id', userId)
        .is('family_slot_id', null)
        .gte('created_at', triggerTime)
        .order('created_at', { ascending: true })
      if (data) setLiveProgress(data)
    }
  }

  async function handleSubmit() {
    if (!user) return
    if (credsStatus !== 'saved') { setShowAINSModal(true); return }
    await doTrigger(user.id, LANG_MAP[lang] || lang, bookCount)
  }

  const handleAINSConnected = async () => {
    const { data: ud } = await supabase
      .from('users').select('ains_cookie_encrypted').eq('id', user.id).single()
    setCredsStatus(ud?.ains_cookie_encrypted ? 'saved' : 'none')
    // Don't auto-trigger after connect — user should initiate submission explicitly
  }

  // ── Family slot helpers ─────────────────────────

  function setSlot(slotId, patch) {
    setSlotStates(prev => ({ ...prev, [slotId]: { ...prev[slotId], ...patch } }))
  }

  async function handleAddSlot() {
    if (!newSlotName.trim()) return
    setAddingSlot(true)
    setAddSlotErr('')
    try {
      const token = await getToken()
      const res = await fetch(`${BACKEND}/api/family/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ slot_name: newSlotName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add slot')
      setNewSlotName('')
      await loadFamilySlots(user)
    } catch (err) {
      setAddSlotErr(err.message)
    } finally {
      setAddingSlot(false)
    }
  }

  async function handleRemoveSlot(slotId) {
    const token = await getToken()
    const res = await fetch(`${BACKEND}/api/family/slots/${slotId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) return
    clearTimeout(pollRefs.current[slotId])
    setFamilySlots(prev => prev.filter(s => s.id !== slotId))
    setSlotStates(prev => { const n = { ...prev }; delete n[slotId]; return n })
  }

  async function handleConnectSlot(slotId) {
    const ss = slotStates[slotId] || {}
    if (!ss.email?.trim() || !ss.password?.trim()) return
    setSlot(slotId, { phase: 'connecting' })

    const token = await getToken()
    const res = await fetch(`${BACKEND}/api/family/slots/${slotId}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ email: ss.email.trim(), password: ss.password }),
    })
    if (!res.ok) {
      const d = await res.json()
      setSlot(slotId, { phase: 'error', connectErr: d.error || 'Failed to start' })
      return
    }

    // Poll connect-status every 2s (max 3 min) — recursive setTimeout prevents overlap
    clearTimeout(pollRefs.current[slotId])
    let attempts = 0
    const poll = async () => {
      attempts++
      if (attempts > 90) { // 90 × 2s = 3 min
        setSlot(slotId, { phase: 'error', connectErr: 'Timed out. Please try again.' })
        return
      }
      try {
        const t = await getToken()
        const r = await fetch(`${BACKEND}/api/family/slots/${slotId}/connect-status`, {
          headers: { 'Authorization': `Bearer ${t}` },
        })
        const d = await r.json()
        if (d.status === 'capturing') {
          setSlot(slotId, { phase: 'capturing' })
        } else if (d.status === 'success') {
          setSlot(slotId, { phase: 'done', showForm: false, email: '', password: '' })
          await loadFamilySlots(user)
          return
        } else if (d.status === 'error') {
          setSlot(slotId, { phase: 'error', connectErr: d.message || 'Connection failed. Please try again.' })
          return
        }
      } catch {}
      pollRefs.current[slotId] = setTimeout(poll, 2000)
    }
    pollRefs.current[slotId] = setTimeout(poll, 2000)
  }

  async function handleTriggerSlot(slotId) {
    setSlot(slotId, { trigMsg: '', trigErr: false, triggering: true })
    try {
      const token = await getToken()
      const res = await fetch(`${BACKEND}/api/family/slots/${slotId}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error || 'Failed to submit')
      setSlot(slotId, { trigMsg: data.message, trigErr: false, triggering: false })
    } catch (err) {
      setSlot(slotId, { trigMsg: err.message, trigErr: true, triggering: false })
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-4">
        <span style={{ width: 32, height: 32, border: '3px solid #0F172A', borderTopColor: '#FFD23F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
        <p className="font-mono text-ink/60 text-sm font-bold">Loading dashboard…</p>
      </div>
    </div>
  )

  const displayName = user?.email?.split('@')[0] || 'there'
  const hour        = new Date().getHours()
  const greeting    = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const nextReminder = settings?.auto_schedule
    ? `Day ${settings.schedule_day} of next month`
    : 'No reminder set'
  const periodCount = stats.thisMonth
  const pct = bookCount > 0 ? Math.min((periodCount / bookCount) * 100, 100) : 0

  return (
    <div className="space-y-5">

      {/* ── Welcome banner ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="bg-ink text-cream rounded-2xl p-5 sm:p-7 border-[3px] border-ink relative overflow-hidden"
        style={{ boxShadow: '6px 6px 0 #2F5DDB' }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, #F4F1EA 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-yellow text-[10px] tracking-[0.3em] uppercase">// {greeting.toLowerCase()}</p>
            <h1 className="font-display font-black tracking-tight leading-none mt-2 text-3xl sm:text-5xl">
              Hi, <span className="text-yellow">{displayName}</span>
            </h1>
            <p className="text-cream/70 font-medium mt-2.5 text-sm sm:text-base">
              {stats.thisMonth > 0
                ? `${stats.thisMonth} book${stats.thisMonth !== 1 ? 's' : ''} submitted this month.`
                : 'No records submitted this month yet.'}
              {' '}{nextReminder !== 'No reminder set' ? `Next run: ${nextReminder}.` : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <button
              onClick={() => setShowAINSModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[2px] border-cream/30 text-[11px] font-extrabold tracking-wider uppercase transition-opacity hover:opacity-80 ${credsStatus === 'saved' ? 'bg-cream/10' : 'bg-[#FF6B3D]/80'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${credsStatus === 'saved' ? 'bg-[#28C840] animate-pulse' : 'bg-white'}`} />
              <span className="text-cream">
                {credsStatus === 'saved' ? 'AINS Connected' : 'AINS Not Set'}
              </span>
            </button>
            {plan === 'free' && !ADMIN_EMAILS.includes(user?.email || '') && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="chunky-btn chunky-btn--small"
                style={{ background: '#FFD23F', color: '#0F172A', borderColor: '#F4F1EA', boxShadow: '3px 3px 0 #F4F1EA' }}
              >
                ⚡ Upgrade
              </button>
            )}
          </div>
        </div>

        <div className="relative mt-5">
          <div className="flex justify-between text-[11px] mb-1.5 font-bold">
            <span className="text-cream/60 uppercase tracking-wider">Monthly progress</span>
            <span className="text-cream tabular-nums">{periodCount} / {bookCount} books</span>
          </div>
          <div className="w-full h-3 bg-cream/15 rounded-full overflow-hidden border-[2px] border-ink/40">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              className="h-full bg-yellow rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {/* ── Stats row ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'This Month', value: stats.thisMonth,  accent: 'bg-yellow' },
          { label: 'All Time',   value: stats.successful, accent: 'bg-cobalt text-cream' },
          { label: 'Language',   value: settings?.language ?? '—', accent: 'bg-[#A8E6A1]' },
          { label: 'Credits', value: credits, accent: 'bg-[#FF8FA3]' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 + i * 0.04 }}
            className={`rounded-xl border-[2.5px] border-ink p-3 ${s.accent}`}
            style={{ boxShadow: '3px 3px 0 #0F172A' }}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider opacity-70">{s.label}</p>
            <p className="font-display font-black text-xl leading-tight mt-1 truncate">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── AINS status card ───────────────────────── */}
      <div className="bg-white border-[3px] border-ink rounded-2xl p-4 flex items-center justify-between gap-3"
        style={{ boxShadow: '4px 4px 0 #0F172A' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl border-[2.5px] border-ink flex items-center justify-center flex-shrink-0 ${credsStatus === 'saved' ? 'bg-[#A8E6A1]' : 'bg-[#FF8FA3]'}`}>
            {credsStatus === 'saved'
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <LockIcon className="w-4 h-4 text-ink" />
            }
          </div>
          <div className="min-w-0">
            <p className="font-display font-black text-sm text-ink">
              {credsStatus === 'saved' ? 'AINS Connected' : 'AINS Not Connected'}
            </p>
            <p className="text-xs text-ink/60 font-medium truncate">
              {credsStatus === 'saved'
                ? 'Session active · bot ready to submit'
                : "Bot can't submit until you connect."}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAINSModal(true)}
          className="chunky-btn chunky-btn--small chunky-btn--ghost flex-shrink-0"
        >
          {credsStatus === 'saved' ? 'Reconnect' : 'Connect →'}
        </button>
      </div>

      {/* ── Submit now ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
        className="bg-cream border-[3px] border-ink rounded-2xl overflow-hidden"
        style={{ boxShadow: '6px 6px 0 #0F172A' }}
      >
        <div className="bg-yellow border-b-[3px] border-ink px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#0F172A"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>
            <span className="font-display font-black uppercase tracking-[0.15em] text-sm text-ink">Submit Now</span>
          </div>
          <span className="font-mono font-bold text-ink/60 text-[10px] uppercase tracking-wider">Manual run</span>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Language */}
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/50 mb-2">Language</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  disabled={triggering}
                  className={`px-4 py-2 text-sm font-extrabold rounded-lg border-[2.5px] border-ink transition-all
                    ${lang === l ? 'bg-ink text-cream' : 'bg-white text-ink hover:bg-yellow'}
                    ${triggering ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ minHeight: 44 }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Count stepper */}
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/50 mb-2">Books</p>
            <div className="flex items-center justify-between bg-white border-[2.5px] border-ink rounded-xl p-1.5">
              <button
                type="button"
                onClick={() => setBookCount(v => Math.max(1, v - 1))}
                disabled={bookCount <= 1 || triggering}
                className="w-11 h-11 rounded-lg bg-cream border-[2px] border-ink font-black text-xl text-ink disabled:opacity-30 disabled:cursor-not-allowed"
              >−</button>
              <div className="text-center px-3">
                <span className="font-display font-black text-4xl text-cobalt tabular-nums">{bookCount}</span>
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink/50 -mt-1">per submit</span>
              </div>
              <button
                type="button"
                onClick={() => setBookCount(v => Math.min(plan === 'free' ? 1 : plan === 'noob' ? 999 : 30, v + 1))}
                disabled={bookCount >= (plan === 'noob' ? 999 : 30) || triggering}
                className="w-11 h-11 rounded-lg bg-cream border-[2px] border-ink font-black text-xl text-ink disabled:opacity-30 disabled:cursor-not-allowed"
              >+</button>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={triggering}
            className="w-full chunky-btn chunky-btn--primary chunky-btn--large justify-center"
            style={{ minHeight: 56, opacity: triggering ? 0.7 : 1 }}
          >
            {triggering ? (
              <><DashSpin />Submitting {bookCount} book{bookCount !== 1 ? 's' : ''}…</>
            ) : credsStatus !== 'saved' ? (
              <><LockIcon className="w-4 h-4" />Connect AINS to submit</>
            ) : (
              <>⚡ Submit {bookCount} {lang} book{bookCount !== 1 ? 's' : ''}</>
            )}
          </button>

          {triggerMsg && (
            <div className={`flex items-center gap-2 text-sm font-bold ${isError ? 'text-[#C9362F]' : 'text-[#0E7D4F]'}`}>
              {isError ? <XCircleIcon className="w-4 h-4 flex-shrink-0" /> : <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />}
              {triggerMsg}
            </div>
          )}

          {/* Live progress feed */}
          {liveProgress.length > 0 && (
            <div className="border-[2.5px] border-ink rounded-xl overflow-hidden">
              <div className="bg-ink text-cream px-4 py-2 flex items-center justify-between">
                <span className="font-display font-black text-[11px] uppercase tracking-[0.2em]">Live</span>
                <span className="text-[11px] font-bold text-cream/70">
                  {liveProgress.filter(s => s.status === 'success').length}/{liveProgress.length} done
                </span>
              </div>
              <div className="bg-white divide-y-[2px] divide-ink/10">
                {liveProgress.map(sub => (
                  <div key={sub.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {sub.status === 'pending' && <span style={{ width: 14, height: 14, border: '2.5px solid #2F5DDB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />}
                      {sub.status === 'success' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#0E7D4F"/><path d="M7.5 12.5l3 3 6-7" stroke="#F4F1EA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      {sub.status === 'failed'  && <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#C9362F"/><path d="M8 8l8 8M16 8l-8 8" stroke="#F4F1EA" strokeWidth="2.5" strokeLinecap="round"/></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-ink truncate block">{sub.books?.title || 'Unknown book'}</span>
                      {sub.status === 'failed' && sub.error_message && (
                        <span className="text-xs text-[#C9362F] truncate block font-mono">{sub.error_message.slice(0, 80)}</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider flex-shrink-0 ${
                      sub.status === 'success' ? 'text-[#0E7D4F]' :
                      sub.status === 'failed'  ? 'text-[#C9362F]' : 'text-cobalt'
                    }`}>
                      {sub.status === 'pending' ? 'Sending' : sub.status === 'success' ? 'Done' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Family Slots Panel ─────────────────────── */}
      {plan === 'family' && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="card-p border-l-4 border-l-ok-500"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-heading flex items-center gap-2">
              <span className="w-8 h-8 bg-ok-50 rounded-lg flex items-center justify-center">
                <UsersIcon className="w-4 h-4 text-ok-600" />
              </span>
              Family Slots
            </h2>
            <span className="text-xs text-muted font-semibold">{familySlots.length} / 3 slots</span>
          </div>

          {/* Slot cards */}
          <div className="space-y-4">
            {familySlots.map(slot => {
              const ss = slotStates[slot.id] || {}
              return (
                <div key={slot.id} className="border border-line rounded-xl p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${slot.ains_connected ? 'bg-ok-500' : 'bg-danger-400 animate-pulse'}`} />
                      <span className="font-bold text-sm text-heading truncate">{slot.slot_name}</span>
                      {slot.ains_email && (
                        <span className="text-xs text-muted truncate hidden sm:block">{slot.ains_email}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveSlot(slot.id)}
                      className="text-xs text-danger-500 hover:text-danger-700 font-bold flex-shrink-0"
                      title="Remove slot"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Settings row */}
                  <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                    <span className="bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                      {LANG_DISPLAY[slot.language] || slot.language || 'Malay'}
                    </span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                      {slot.books_per_month || 4} books/month
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-medium ${slot.ains_connected ? 'bg-ok-50 text-ok-700' : 'bg-danger-50 text-danger-600'}`}>
                      {slot.ains_connected ? 'Connected' : 'Not connected'}
                    </span>
                  </div>

                  {/* Connect form */}
                  {(!slot.ains_connected || ss.showForm) && ss.phase !== 'connecting' && ss.phase !== 'capturing' && ss.phase !== 'done' && (
                    <>
                      {ss.showForm ? (
                        <div className="space-y-2 pt-1">
                          <input
                            type="email"
                            placeholder="AINS email"
                            value={ss.email || ''}
                            onChange={e => setSlot(slot.id, { email: e.target.value })}
                            className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                          />
                          <input
                            type="password"
                            placeholder="Password"
                            value={ss.password || ''}
                            onChange={e => setSlot(slot.id, { password: e.target.value })}
                            className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                          />
                          {ss.connectErr && (
                            <p className="text-xs text-danger-600 font-semibold">{ss.connectErr}</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConnectSlot(slot.id)}
                              disabled={!ss.email || !ss.password}
                              className="flex-1 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                            >
                              Connect
                            </button>
                            <button
                              onClick={() => setSlot(slot.id, { showForm: false, email: '', password: '' })}
                              className="px-3 py-2 border border-line text-muted text-sm font-bold rounded-lg hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSlot(slot.id, { showForm: true, phase: null })}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                        >
                          Connect AINS
                        </button>
                      )}
                    </>
                  )}

                  {/* Connecting state */}
                  {ss.phase === 'connecting' && (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <span className="w-4 h-4 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin flex-shrink-0" />
                      <span>Signing in… approve the MFA notification on your phone.</span>
                    </div>
                  )}

                  {/* Capturing state (MFA approved, capturing session) */}
                  {ss.phase === 'capturing' && (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <span className="w-4 h-4 border-2 border-ok-200 border-t-ok-600 rounded-full animate-spin flex-shrink-0" />
                      <span>Approved! Capturing session, please wait…</span>
                    </div>
                  )}

                  {/* Error state */}
                  {ss.phase === 'error' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-danger-600 font-semibold">{ss.connectErr}</p>
                      <button
                        onClick={() => setSlot(slot.id, { phase: null, showForm: true })}
                        className="text-xs font-bold px-3 py-1 rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100"
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Trigger row (only when connected) */}
                  {slot.ains_connected && (
                    <div className="flex items-center gap-3 flex-wrap pt-1">
                      <button
                        onClick={() => handleTriggerSlot(slot.id)}
                        disabled={ss.triggering}
                        className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                      >
                        {ss.triggering
                          ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting…</>
                          : <><BoltIcon className="w-3 h-3" />Submit Books</>
                        }
                      </button>
                      <button
                        onClick={() => setSlot(slot.id, { showForm: true, phase: 'reconnect' })}
                        className="text-xs font-bold px-3 py-2 rounded-lg bg-gray-100 text-muted hover:bg-gray-200"
                      >
                        Reconnect
                      </button>
                      {ss.trigMsg && (
                        <span className={`text-xs font-bold ${ss.trigErr ? 'text-danger-600' : 'text-ok-600'}`}>
                          {ss.trigMsg}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {familySlots.length === 0 && (
              <p className="text-sm text-muted text-center py-4">No slots yet. Add up to 3 family members below.</p>
            )}
          </div>

          {/* Add slot form */}
          {familySlots.length < 3 && (
            <div className="mt-4 pt-4 border-t border-line">
              <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Add Slot</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Ahmad, Sara, Aini…"
                  value={newSlotName}
                  onChange={e => setNewSlotName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddSlot()}
                  className="flex-1 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button
                  onClick={handleAddSlot}
                  disabled={addingSlot || !newSlotName.trim()}
                  className="px-4 py-2 bg-ok-600 text-white text-sm font-bold rounded-lg hover:bg-ok-700 disabled:opacity-50 transition-colors"
                >
                  {addingSlot ? '…' : 'Add'}
                </button>
              </div>
              {addSlotErr && <p className="text-xs text-danger-600 font-semibold mt-1">{addSlotErr}</p>}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Recent submissions ─────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.16 }}
        className="bg-white border-[3px] border-ink rounded-2xl overflow-hidden"
        style={{ boxShadow: '4px 4px 0 #0F172A' }}
      >
        <div className="px-5 py-3 border-b-[3px] border-ink flex items-center justify-between">
          <span className="font-display font-black text-sm uppercase tracking-[0.15em] text-ink">Recent</span>
          <button onClick={() => navigate('/history')} className="font-mono text-xs font-bold text-cobalt hover:underline">
            view all →
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 px-5">
            <div className="w-12 h-12 bg-cream border-[2.5px] border-ink rounded-2xl flex items-center justify-center"
              style={{ boxShadow: '3px 3px 0 #0F172A' }}>
              <BookIcon className="w-6 h-6 text-ink/40" />
            </div>
            <p className="font-display font-black text-ink/50 text-sm">No submissions yet</p>
            <p className="text-ink/40 text-xs font-medium">Press "Submit Now" to get started.</p>
          </div>
        ) : (
          <div className="divide-y-[2px] divide-ink/10">
            {recent.map(s => <BookCard key={s.id} submission={s} />)}
          </div>
        )}
      </motion.div>

      {/* ── Discord support ────────────────────────── */}
      <motion.a
        href="https://discord.gg/ZmXMFSpZnb"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.18 }}
        className="flex items-center justify-between gap-3 bg-[#5865F2] text-white border-[3px] border-ink rounded-2xl p-4 hover:opacity-90 transition-opacity"
        style={{ boxShadow: '4px 4px 0 #0F172A' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl border-[2.5px] border-ink bg-white/15 flex items-center justify-center flex-shrink-0">
            <DiscordIcon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-black text-sm">Need help? Join our Discord</p>
            <p className="text-xs text-white/70 font-medium truncate">Get support, updates & talk to other students.</p>
          </div>
        </div>
        <span className="font-mono text-xs font-bold flex-shrink-0">Join →</span>
      </motion.a>

      {/* ── AINS Connection Modal ─────────────────── */}
      <ConnectAINSModal
        userId={user?.id}
        isOpen={showAINSModal}
        onClose={() => setShowAINSModal(false)}
        onSuccess={handleAINSConnected}
      />

      {/* ── Upgrade Modal ─────────────────────────── */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={plan}
      />

    </div>
  )
}

function DashSpin() {
  return <span className="inline-block flex-shrink-0" style={{ width: 18, height: 18, border: '2.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
}
function BookIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
}
function GlobeIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
}
function ClockIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function BoltIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
}
function LockIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
}
function CheckCircleIcon({ className }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
}
function XCircleIcon({ className }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
}
function UsersIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87"/><path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function DiscordIcon({ className }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.056c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.029ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419Z"/></svg>
}
