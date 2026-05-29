import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import ConnectAINSModal from '../components/ConnectAINSModal'
import UpgradeModal from '../components/UpgradeModal'

const BACKEND    = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const LANGUAGES  = ['Malay', 'English', 'Chinese', 'Tamil']
const LANG_MAP   = { Malay: 'Melayu', English: 'Inggeris', Chinese: 'Cina', Tamil: 'Tamil' }
const BOOK_TYPES = ['Physical', 'E-Book']
const TYPE_MAP   = { Physical: 'Fizikal', 'E-Book': 'E-Buku' }

function SetSection({ num, title, subtitle, children, comingSoon }) {
  return (
    <div className={`bg-white border-[3px] border-ink rounded-2xl overflow-hidden relative`}
      style={{ boxShadow: '4px 4px 0 #0F172A' }}>
      <div className="px-5 py-3 bg-cream border-b-[3px] border-ink flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="font-mono font-black text-cobalt text-sm">[{num}]</span>
          <div className="min-w-0">
            <p className="font-display font-black text-ink text-sm uppercase tracking-[0.15em]">{title}</p>
            {subtitle && <p className="text-[11px] text-ink/55 font-medium mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {comingSoon && (
          <span className="inline-flex items-center gap-1 bg-yellow border-[2px] border-ink text-ink text-[10px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-md flex-shrink-0"
            style={{ boxShadow: '2px 2px 0 #0F172A' }}>
            ✨ Coming soon
          </span>
        )}
      </div>
      <div className={`p-5 space-y-4 ${comingSoon ? 'pointer-events-none select-none opacity-40' : ''}`}>
        {children}
      </div>
    </div>
  )
}

function SetField({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55">{label}</span>
        {hint && <span className="text-[10px] font-bold text-ink/40">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function ChunkyToggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative w-14 h-8 rounded-full border-[2.5px] border-ink flex-shrink-0 transition-colors ${value ? 'bg-cobalt' : 'bg-cream'} ${disabled ? 'cursor-not-allowed' : ''}`}
      style={{ minHeight: 40, minWidth: 56 }}
      role="switch"
      aria-checked={value}
      aria-pressed={value}
    >
      <span
        className="absolute top-[2px] w-5 h-5 rounded-full bg-yellow border-[2px] border-ink transition-all"
        style={{ left: value ? 28 : 2 }}
      />
    </button>
  )
}

export default function Settings() {
  const [user, setUser]         = useState(null)
  const [form, setForm]         = useState({
    books_per_month: 4,
    language:    'Melayu',
    book_type:   'Fizikal',
    auto_schedule: true,
    schedule_day:  15,
  })
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading]   = useState(true)
  const [credsStatus, setCredsStatus] = useState(null) // null | 'saved' | 'none'
  const [showAINSModal, setShowAINSModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [planInfo, setPlanInfo] = useState({ plan: 'free', plan_expires_at: null })

  const [displayLang, setDisplayLang] = useState('Malay')
  const [displayType, setDisplayType] = useState('Physical')

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUser(user)

        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token || ''

        let res = null
        try {
          const controller = new AbortController()
          const t = setTimeout(() => controller.abort(), 10000)
          res = await fetch(`${BACKEND}/api/settings`, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: controller.signal,
          })
          clearTimeout(t)
        } catch { res = null }
        if (res?.ok) {
          const data = await res.json()
          setForm({
            books_per_month: data.books_per_month ?? 4,
            language:        data.language ?? 'Melayu',
            book_type:       data.book_type ?? 'Fizikal',
            auto_schedule:   data.auto_schedule ?? true,
            schedule_day:    data.schedule_day ?? 15,
          })
          const dLang = Object.entries(LANG_MAP).find(([, v]) => v === data.language)?.[0] || 'Malay'
          const dType = Object.entries(TYPE_MAP).find(([, v]) => v === data.book_type)?.[0] || 'Physical'
          setDisplayLang(dLang)
          setDisplayType(dType)
        }

        const { data: ud } = await supabase
          .from('users').select('ains_cookie_encrypted, plan, plan_expires_at').eq('id', user.id).maybeSingle()
        setCredsStatus(ud?.ains_cookie_encrypted ? 'saved' : 'none')
        if (ud) setPlanInfo({ plan: ud.plan || 'free', plan_expires_at: ud.plan_expires_at })
      } catch (err) {
        console.error('[settings] load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave(e) {
    if (e?.preventDefault) e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaved(false)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token || ''
    const res = await fetch(`${BACKEND}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else { setSaveError('Failed to save settings. Please try again.'); setTimeout(() => setSaveError(''), 4000) }
  }

  const handleAINSConnected = async () => {
    // Refresh session status after connection
    const { data: ud } = await supabase
      .from('users').select('ains_cookie_encrypted').eq('id', user.id).single()
    setCredsStatus(ud?.ains_cookie_encrypted ? 'saved' : 'none')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <span style={{ width: 32, height: 32, border: '3px solid #0F172A', borderTopColor: '#FFD23F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="max-w-2xl space-y-5 pb-24"
    >
      {/* Header */}
      <div>
        <p className="font-mono text-cobalt text-xs tracking-[0.3em] uppercase font-bold">// settings</p>
        <h1 className="font-display font-black tracking-tight leading-none mt-2 text-ink text-3xl sm:text-5xl">
          Tune Nila.
        </h1>
        <p className="text-ink/60 mt-2 font-medium text-sm sm:text-base">Set defaults once. Change anytime.</p>
      </div>

      {/* ── [01] Account / Plan ──────────────────────── */}
      <SetSection num="01" title="Account" subtitle="Your current plan and billing.">
        <div className={`rounded-xl border-[2.5px] border-ink p-4 flex items-center justify-between gap-3 ${
          planInfo.plan === 'plus' || planInfo.plan === 'noob' ? 'bg-yellow/30' : 'bg-cream'
        }`}>
          <div className="min-w-0">
            <p className="font-display font-black text-ink text-base capitalize">
              {planInfo.plan === 'free' ? 'Free' : planInfo.plan === 'plus' ? 'Pro' : planInfo.plan === 'noob' ? 'Tester' : 'Family'}
            </p>
            <p className="text-xs text-ink/55 font-medium mt-0.5">
              {planInfo.plan === 'free'   && '1 book/week · Upgrade to submit more'}
              {planInfo.plan === 'plus'   && `150 credits/year${planInfo.plan_expires_at ? ` · expires ${new Date(planInfo.plan_expires_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`}
              {planInfo.plan === 'family' && '150 credits/year · Up to 3 AINS accounts'}
              {planInfo.plan === 'noob'   && 'Tester account · Unlimited'}
            </p>
          </div>
          {planInfo.plan !== 'family' && planInfo.plan !== 'noob' && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="chunky-btn chunky-btn--primary chunky-btn--small flex-shrink-0"
            >
              Upgrade →
            </button>
          )}
        </div>
      </SetSection>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={planInfo.plan}
      />

      {/* ── [02] AINS connection ─────────────────────── */}
      <SetSection num="02" title="AINS connection" subtitle="The session Nila uses to submit records.">
        <div className={`rounded-xl border-[2.5px] border-ink p-4 flex items-center gap-3 ${credsStatus === 'saved' ? 'bg-[#A8E6A1]/30' : 'bg-[#FF8FA3]/30'}`}>
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${credsStatus === 'saved' ? 'bg-[#0E7D4F] animate-pulse' : 'bg-[#C9362F]'}`} />
          <div className="flex-1 min-w-0">
            <p className="font-display font-black text-sm text-ink">
              {credsStatus === 'saved' ? 'Connected — session valid' : 'Not connected — bot is idle'}
            </p>
            <p className="text-[11px] font-medium text-ink/60 mt-0.5">
              {credsStatus === 'saved'
                ? 'Session active. The bot will use it for monthly submissions.'
                : 'Log in to your AINS account to enable automated monthly submissions.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAINSModal(true)}
          className="chunky-btn chunky-btn--primary mt-3"
          style={{ minHeight: 44 }}
        >
          {credsStatus === 'saved' ? '↻ Refresh session' : 'Connect →'}
        </button>
      </SetSection>

      <ConnectAINSModal
        targetUserId={user?.id}
        isOpen={showAINSModal}
        onClose={() => setShowAINSModal(false)}
        onSuccess={handleAINSConnected}
      />

      <form onSubmit={handleSave} className="space-y-5">

        {/* ── [03] Reading preferences ─────────────────── */}
        <SetSection num="03" title="Submission preferences" subtitle="Defaults Nila uses when auto-running.">

          {/* Language */}
          <SetField label="Default language">
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => { setDisplayLang(lang); setForm(f => ({ ...f, language: LANG_MAP[lang] })) }}
                  className={`px-3 py-2 text-xs font-extrabold rounded-lg border-[2px] border-ink transition-colors
                    ${displayLang === lang ? 'bg-ink text-cream' : 'bg-white text-ink hover:bg-yellow'}`}
                  style={{ minHeight: 40 }}
                >
                  {lang}
                </button>
              ))}
            </div>
          </SetField>

          {/* Book type */}
          <SetField label="Book type">
            <div className="flex gap-1.5">
              {BOOK_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setDisplayType(type); setForm(f => ({ ...f, book_type: TYPE_MAP[type] })) }}
                  className={`px-4 py-2 text-xs font-extrabold rounded-lg border-[2px] border-ink transition-colors flex-1
                    ${displayType === type ? 'bg-ink text-cream' : 'bg-white text-ink hover:bg-yellow'}`}
                  style={{ minHeight: 40 }}
                >
                  {type}
                </button>
              ))}
            </div>
          </SetField>

          {/* Books per month */}
          {(() => {
            const planMax = planInfo.plan === 'free' ? 1 : planInfo.plan === 'noob' ? 999 : 30
            return (
              <SetField label="Books per month" hint={`${form.books_per_month} / ${planMax} max`}>
                <div className="flex items-center justify-between bg-white border-[2.5px] border-ink rounded-xl p-1.5">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, books_per_month: Math.max(1, f.books_per_month - 1) }))}
                    disabled={form.books_per_month <= 1}
                    className="w-11 h-11 rounded-lg bg-cream border-[2px] border-ink font-black text-xl text-ink disabled:opacity-30 disabled:cursor-not-allowed"
                  >−</button>
                  <div className="text-center px-3">
                    <span className="font-display font-black text-4xl text-cobalt tabular-nums">{form.books_per_month}</span>
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink/50 -mt-1">per month</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, books_per_month: Math.min(planMax, f.books_per_month + 1) }))}
                    disabled={form.books_per_month >= planMax}
                    className="w-11 h-11 rounded-lg bg-cream border-[2px] border-ink font-black text-xl text-ink disabled:opacity-30 disabled:cursor-not-allowed"
                  >+</button>
                </div>
                {planInfo.plan === 'free' && (
                  <p className="text-[11px] text-ink/50 font-medium mt-2">Free plan: 1 book/week. Upgrade for up to 30.</p>
                )}
              </SetField>
            )
          })()}
        </SetSection>

        {/* ── [04] Monthly reminder — coming soon ──────── */}
        <SetSection num="04" title="Monthly reminder" subtitle="Get an email on a set day each month." comingSoon>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-display font-extrabold text-ink text-sm">Email reminder</p>
              <p className="text-[11px] text-ink/55 font-medium mt-0.5">Get a reminder to submit on a set day each month.</p>
            </div>
            <ChunkyToggle value={form.auto_schedule} onChange={() => {}} disabled />
          </div>
        </SetSection>

        {saveError && (
          <p className="text-sm font-bold text-[#C9362F] text-center">{saveError}</p>
        )}
      </form>

      {/* ── Sticky save bar ───────────────────────────── */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-xl
        flex items-center justify-between gap-3 bg-ink text-cream rounded-2xl p-3 border-[3px] border-ink"
        style={{ boxShadow: '4px 4px 0 #FFD23F' }}>
        <span className="font-display font-black text-sm pl-2">
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Unsaved changes'}
        </span>
        <button
          form="settings-form"
          onClick={handleSave}
          disabled={saving}
          className="chunky-btn chunky-btn--small flex-shrink-0"
          style={{ background: '#FFD23F', color: '#0F172A', borderColor: '#F4F1EA', boxShadow: '3px 3px 0 #F4F1EA', minHeight: 40 }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save changes'}
        </button>
      </div>
    </motion.div>
  )
}
