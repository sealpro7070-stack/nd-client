import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const FREE_FEATURES = [
  { label: '1 book per week',           ok: true  },
  { label: '1 language at a time',      ok: true  },
  { label: 'Manual submit only',        ok: true  },
  { label: 'Email reminders',           ok: true  },
  { label: 'Auto-submit every month',   ok: false },
  { label: '150 book credits / year',   ok: false },
  { label: 'All 4 languages',           ok: false },
  { label: 'Priority support',          ok: false },
]

const PRO_FEATURES = [
  { label: '150 book credits / year',         ok: true },
  { label: 'Credits deducted on success only', ok: true },
  { label: 'All 4 languages, mixed',          ok: true },
  { label: 'Auto-submit on day 1',            ok: true },
  { label: 'Email + SMS notifications',       ok: true },
  { label: 'Priority support (we reply lah)', ok: true },
]

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export default function Upgrade() {
  const navigate = useNavigate()
  const [selected, setSelected]     = useState('pro')
  const [stage, setStage]           = useState('idle')   // idle | done
  const [receiptData, setReceiptData] = useState(null)
  const [receiptFile, setReceiptFile] = useState(null)
  const [qrData, setQrData]         = useState(null)
  const [errorMsg, setErrorMsg]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef                = useRef(null)

  // Credit top-up state
  const [creditAmount, setCreditAmount]         = useState(10)
  const [creditReceiptData, setCreditReceiptData] = useState(null)
  const [creditReceiptFile, setCreditReceiptFile] = useState(null)
  const [creditStage, setCreditStage]           = useState('idle')  // idle | done
  const [creditError, setCreditError]           = useState('')
  const [creditSubmitting, setCreditSubmitting] = useState(false)
  const creditFileInputRef                      = useRef(null)

  const price = 49.90
  const sub   = 'per year'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch(`${BACKEND}/api/payments/qr-settings`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then(d => setQrData(d.qr_data || null))
        .catch(() => {})
    })
  }, [])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setErrorMsg('Please upload an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setErrorMsg('File too large. Max 5 MB.'); return }
    setErrorMsg('')
    setReceiptFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setReceiptData(ev.target.result)
    reader.readAsDataURL(file)
  }

  function removeReceipt() {
    setReceiptData(null)
    setReceiptFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleCreditFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setCreditError('File too large. Max 5 MB.'); return }
    setCreditError('')
    setCreditReceiptFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setCreditReceiptData(ev.target.result)
    reader.readAsDataURL(file)
  }

  function removeCreditReceipt() {
    setCreditReceiptData(null)
    setCreditReceiptFile(null)
    if (creditFileInputRef.current) creditFileInputRef.current.value = ''
  }

  async function handleSubmitCredits() {
    if (!creditReceiptData) { setCreditError('Please upload your receipt.'); return }
    setCreditSubmitting(true)
    setCreditError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/'); return }
      const res = await fetch(`${BACKEND}/api/payments/credits/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ credits: creditAmount, receipt_data: creditReceiptData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit request')
      setCreditStage('done')
    } catch (err) {
      setCreditError(err.message)
    } finally {
      setCreditSubmitting(false)
    }
  }

  async function handleSubmitPayment() {
    if (!receiptData) { setErrorMsg('Please upload your receipt.'); return }
    setSubmitting(true)
    setErrorMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/'); return }
      const res = await fetch(`${BACKEND}/api/payments/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan: 'plus', receipt_data: receiptData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit request')
      setStage('done')
      setTimeout(() => navigate('/dashboard'), 4000)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ── Hero ──────────────────────────────────────── */}
      <div className="bg-cobalt text-cream rounded-2xl border-[3px] border-ink p-5 sm:p-8 relative overflow-hidden"
        style={{ boxShadow: '6px 6px 0 #0F172A' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, #FFF 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }} />
        <div className="relative">
          <p className="font-mono text-yellow text-xs tracking-[0.3em] uppercase font-bold">// upgrade</p>
          <h1 className="font-display font-black tracking-tight leading-[0.95] mt-3 text-4xl sm:text-5xl">
            Stop logging.<br />
            Go{' '}
            <span className="relative inline-block">
              <span className="relative z-10 px-1">Pro</span>
              <span className="absolute inset-x-0 bottom-1 h-3 bg-yellow z-0" />
            </span>.
          </h1>
          <p className="text-cream/80 font-medium mt-3 text-sm sm:text-base max-w-md">
            150 book credits/year, all four languages, auto-submit, priority support. Less than 4 nasi lemak a year.
          </p>
        </div>
      </div>

      {/* ── Plan cards ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <PlanCard
          title="Free"
          price="RM 0"
          sub="forever"
          features={FREE_FEATURES}
          selected={selected === 'free'}
          onSelect={() => setSelected('free')}
        />
        <PlanCard
          title="Pro"
          price={`RM ${price}`}
          sub={sub}
          badge="MOST POPULAR"
          highlight
          features={PRO_FEATURES}
          selected={selected === 'pro'}
          onSelect={() => setSelected('pro')}
        />
      </div>

      {/* ── Family — Coming Soon ───────────────────────── */}
      <div className="bg-white border-[3px] border-ink/30 rounded-2xl p-5 relative overflow-hidden"
        style={{ boxShadow: '4px 4px 0 #0F172A33', opacity: 0.65 }}>
        <div className="absolute top-3 right-3 bg-ink text-cream text-[10px] font-black px-3 py-1 rounded-md tracking-widest border-[2px] border-ink z-10">
          COMING SOON
        </div>
        <p className="font-display font-black text-ink text-xs uppercase tracking-[0.25em]">Family</p>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="font-display font-black text-ink text-4xl tabular-nums">RM 48</span>
          <span className="font-bold text-ink/60 text-xs">per month</span>
        </div>
        <p className="text-ink/50 text-sm font-medium mt-2">
          Up to 3 AINS accounts, all Pro features for the whole family.
        </p>
      </div>

      {/* ── Credit Top-Up ─────────────────────────────── */}
      <div className="bg-white border-[3px] border-ink rounded-2xl overflow-hidden"
        style={{ boxShadow: '6px 6px 0 #0F172A' }}>
        <div className="px-5 py-3 bg-cobalt border-b-[3px] border-ink flex items-center justify-between">
          <span className="font-display font-black uppercase tracking-[0.15em] text-sm text-cream">Top Up Credits</span>
          <span className="font-mono text-[10px] font-bold text-cream/60 uppercase tracking-wider">RM 1 per credit</span>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-sm font-medium text-ink/70">
            1 credit = 1 successful book submission. Credits never expire and work for all users — no plan required.
          </p>

          {/* Amount picker */}
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55 mb-2">How many credits?</p>
            <div className="flex items-center justify-between bg-cream border-[2.5px] border-ink rounded-xl p-1.5">
              <button
                type="button"
                onClick={() => setCreditAmount(v => Math.max(1, v - 1))}
                disabled={creditAmount <= 1 || creditSubmitting}
                className="w-11 h-11 rounded-lg bg-white border-[2px] border-ink font-black text-xl text-ink disabled:opacity-30"
              >−</button>
              <div className="text-center px-3">
                <span className="font-display font-black text-4xl text-cobalt tabular-nums">{creditAmount}</span>
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink/50 -mt-1">
                  RM {creditAmount}.00
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCreditAmount(v => Math.min(1000, v + 1))}
                disabled={creditAmount >= 1000 || creditSubmitting}
                className="w-11 h-11 rounded-lg bg-white border-[2px] border-ink font-black text-xl text-ink disabled:opacity-30"
              >+</button>
            </div>
          </div>

          {/* QR reminder */}
          <div className="bg-yellow/40 border-[2px] border-ink rounded-xl px-4 py-3 flex items-start gap-2">
            <span className="text-base leading-none flex-shrink-0">💡</span>
            <div className="text-[11px] font-bold text-ink leading-snug space-y-0.5">
              <p>Scan the same DuitNow QR on the Pro section above.</p>
              <p>Pay exactly <span className="text-cobalt">RM {creditAmount}.00</span>, upload your receipt below.</p>
            </div>
          </div>

          {/* Receipt upload */}
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55 mb-2">Payment receipt</p>
            {!creditReceiptData ? (
              <label
                htmlFor="credit-receipt-upload"
                className="block bg-cream border-[3px] border-dashed border-ink rounded-xl p-6 text-center cursor-pointer hover:bg-yellow/30 transition-colors"
                style={{ minHeight: 100 }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-cobalt border-[2.5px] border-ink flex items-center justify-center"
                    style={{ boxShadow: '3px 3px 0 #0F172A' }}>
                    <UploadIcon white />
                  </div>
                  <p className="font-display font-black text-ink text-sm">Tap to upload receipt</p>
                  <p className="text-[11px] text-ink/55 font-medium">PNG, JPG — max 5 MB</p>
                </div>
                <input
                  id="credit-receipt-upload"
                  ref={creditFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/*"
                  onChange={handleCreditFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="bg-white border-[2.5px] border-ink rounded-xl p-3 flex items-center gap-3">
                <img src={creditReceiptData} alt="receipt preview"
                  className="w-14 h-14 rounded-lg border-[2px] border-ink object-cover flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-display font-extrabold text-ink text-sm truncate">{creditReceiptFile?.name || 'receipt'}</p>
                  <p className="text-[11px] text-ink/55 font-medium">ready to submit</p>
                </div>
                <button onClick={removeCreditReceipt} className="font-mono text-xs font-bold text-[#C9362F] hover:underline flex-shrink-0">
                  remove
                </button>
              </div>
            )}
          </div>

          {creditError && <p className="text-sm font-bold text-[#C9362F]">{creditError}</p>}

          {creditStage !== 'done' && (
            <button
              onClick={handleSubmitCredits}
              disabled={creditSubmitting || !creditReceiptData}
              className="w-full chunky-btn chunky-btn--primary chunky-btn--large justify-center"
              style={{ minHeight: 52, opacity: (creditSubmitting || !creditReceiptData) ? 0.55 : 1, background: '#2F5DDB', borderColor: '#0F172A', boxShadow: '4px 4px 0 #0F172A' }}
            >
              {creditSubmitting
                ? <><PaySpin />Submitting…</>
                : !creditReceiptData
                  ? <>Upload receipt to continue</>
                  : <>Top up {creditAmount} credit{creditAmount !== 1 ? 's' : ''} →</>
              }
            </button>
          )}

          {creditStage === 'done' && (
            <div className="bg-[#A8E6A1] border-[3px] border-ink rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-display font-black text-ink text-sm">Receipt received!</p>
                <p className="text-[11px] text-ink/70 font-medium">
                  Credits will be added within 5 minutes after admin approval.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Payment summary ───────────────────────────── */}
      {selected === 'pro' && (
        <div className="bg-white border-[3px] border-ink rounded-2xl overflow-hidden"
          style={{ boxShadow: '6px 6px 0 #0F172A' }}>
          <div className="px-5 py-3 bg-yellow border-b-[3px] border-ink flex items-center justify-between">
            <span className="font-display font-black uppercase tracking-[0.15em] text-sm text-ink">Payment summary</span>
            <span className="font-mono text-[10px] font-bold text-ink/60 uppercase tracking-wider">Scan · pay · upload</span>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <SummaryRow label="NilamDesk Pro — monthly" value={`RM ${price}.00`} />
            <SummaryRow label="Tax (SST 8%)" value={`RM ${(price * 0.08).toFixed(2)}`} muted />
            <div className="border-t-[2px] border-ink/15 pt-3 flex items-baseline justify-between">
              <span className="font-display font-black text-ink text-base">Total today</span>
              <span className="font-display font-black text-ink text-3xl tabular-nums">
                RM {(price * 1.08).toFixed(2)}
              </span>
            </div>

            {/* QR + Instructions */}
            <div className="bg-cream border-[2.5px] border-ink rounded-xl overflow-hidden sm:flex">
              <div className="bg-white p-4 flex flex-col items-center justify-center border-b-[2.5px] sm:border-b-0 sm:border-r-[2.5px] border-ink">
                {qrData ? (
                  <img src={qrData} alt="DuitNow QR" className="w-44 h-44 object-contain rounded-lg border-[2px] border-ink" />
                ) : (
                  <QrCodeSVG size={170} />
                )}
                <p className="font-mono text-[10px] font-bold text-ink/50 mt-3 uppercase tracking-wider">
                  Scan with any e-wallet
                </p>
              </div>
              <div className="p-4 sm:p-5 flex-1 space-y-3">
                <div>
                  <p className="font-mono text-cobalt text-[10px] font-bold tracking-[0.3em] uppercase">// step 1</p>
                  <p className="font-display font-black text-ink text-sm mt-1">
                    Scan the QR to pay <span className="text-cobalt">RM {(price * 1.08).toFixed(2)}</span>
                  </p>
                  <p className="text-[11px] text-ink/55 font-medium mt-1">
                    Works with TNG eWallet, Maybank2u, GrabPay, Boost, MAE — anything that supports DuitNow QR.
                  </p>
                </div>
                <div className="border-t-[2px] border-ink/10 pt-3">
                  <p className="font-mono text-cobalt text-[10px] font-bold tracking-[0.3em] uppercase">// step 2</p>
                  <p className="font-display font-black text-ink text-sm mt-1">Upload your receipt below</p>
                  <p className="text-[11px] text-ink/55 font-medium mt-1">
                    Screenshot from your banking app works. We verify and activate Pro within 5 minutes.
                  </p>
                </div>
                <div className="bg-yellow/40 border-[2px] border-ink rounded-lg px-3 py-2 flex items-start gap-2">
                  <span className="text-base leading-none">💡</span>
                  <span className="text-[11px] font-bold text-ink leading-snug">
                    Add your name in the payment reference so we can match it faster.
                  </span>
                </div>
              </div>
            </div>

            {/* Receipt upload */}
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55 mb-2">Payment receipt</p>
              {!receiptData ? (
                <label
                  htmlFor="receipt-upload"
                  className="block bg-cream border-[3px] border-dashed border-ink rounded-xl p-6 text-center cursor-pointer hover:bg-yellow/30 transition-colors"
                  style={{ minHeight: 120 }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-11 h-11 rounded-xl bg-yellow border-[2.5px] border-ink flex items-center justify-center"
                      style={{ boxShadow: '3px 3px 0 #0F172A' }}>
                      <UploadIcon />
                    </div>
                    <p className="font-display font-black text-ink text-sm">Tap to upload receipt</p>
                    <p className="text-[11px] text-ink/55 font-medium">PNG, JPG, PDF — max 5 MB</p>
                  </div>
                  <input
                    id="receipt-upload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="bg-white border-[2.5px] border-ink rounded-xl p-3 flex items-center gap-3">
                  {receiptData.startsWith('data:image') ? (
                    <img src={receiptData} alt="receipt preview"
                      className="w-14 h-14 rounded-lg border-[2px] border-ink object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg border-[2px] border-ink bg-cream flex items-center justify-center flex-shrink-0 font-mono font-bold text-ink text-[10px]">
                      PDF
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-extrabold text-ink text-sm truncate">
                      {receiptFile?.name || 'receipt'}
                    </p>
                    <p className="text-[11px] text-ink/55 font-medium">
                      {receiptFile ? `${(receiptFile.size / 1024).toFixed(1)} KB · ` : ''}ready to submit
                    </p>
                  </div>
                  <button
                    onClick={removeReceipt}
                    className="font-mono text-xs font-bold text-[#C9362F] hover:underline flex-shrink-0"
                  >
                    remove
                  </button>
                </div>
              )}
            </div>

            {errorMsg && (
              <p className="text-sm font-bold text-[#C9362F]">{errorMsg}</p>
            )}

            {/* CTA */}
            {stage !== 'done' && (
              <button
                onClick={handleSubmitPayment}
                disabled={submitting || !receiptData}
                className="w-full chunky-btn chunky-btn--primary chunky-btn--large justify-center"
                style={{ minHeight: 56, opacity: (submitting || !receiptData) ? 0.55 : 1 }}
              >
                {submitting ? (
                  <><PaySpin />Verifying receipt…</>
                ) : !receiptData ? (
                  <>Upload receipt to continue</>
                ) : (
                  <>Submit receipt →</>
                )}
              </button>
            )}

            {stage === 'done' && (
              <div className="bg-[#A8E6A1] border-[3px] border-ink rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <div className="flex-1">
                  <p className="font-display font-black text-ink text-sm">Receipt received!</p>
                  <p className="text-[11px] text-ink/70 font-medium">
                    We're verifying — Pro will activate within 5 minutes. Taking you to the dashboard…
                  </p>
                </div>
              </div>
            )}

            <p className="text-[11px] text-ink/50 font-medium text-center pt-1">
              Cancel anytime in Settings. Refunds within 7 days, no questions.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────

function PlanCard({ title, price, sub, badge, highlight, features, selected, onSelect }) {
  const bg = highlight ? 'bg-yellow' : 'bg-white'
  return (
    <button
      onClick={onSelect}
      className={`relative text-left rounded-2xl border-[3px] border-ink p-5 transition-all w-full ${bg} ${selected ? '-translate-y-1' : ''}`}
      style={{ boxShadow: selected ? '8px 12px 0 #0F172A' : '4px 4px 0 #0F172A' }}
    >
      {badge && (
        <div className="absolute -top-3 right-5 bg-ink text-cream text-[10px] font-black px-3 py-1 rounded-md tracking-widest border-[2px] border-ink">
          {badge}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="font-display font-black text-ink text-xs uppercase tracking-[0.25em]">{title}</p>
        {selected ? (
          <span className="w-6 h-6 rounded-full bg-cobalt border-[2.5px] border-ink flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F4F1EA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        ) : (
          <span className="w-6 h-6 rounded-full border-[2.5px] border-ink bg-white flex-shrink-0" />
        )}
      </div>
      <div className="flex items-baseline gap-2 mt-3">
        <span className="font-display font-black text-ink text-4xl tracking-tighter tabular-nums">{price}</span>
        <span className="font-bold text-ink/60 text-xs">{sub}</span>
      </div>
      <ul className="mt-4 space-y-2">
        {features.map((f, i) => (
          <li key={i} className={`flex items-start gap-2 text-sm font-bold ${f.ok ? 'text-ink' : 'text-ink/40'}`}>
            <FeatureMark ok={f.ok} highlight={highlight} />
            <span className={f.ok ? '' : 'line-through decoration-[2px]'}>{f.label}</span>
          </li>
        ))}
      </ul>
    </button>
  )
}

function FeatureMark({ ok, highlight }) {
  if (ok) {
    return (
      <span className="w-5 h-5 rounded-md border-[2px] border-ink flex items-center justify-center flex-shrink-0 mt-[1px]"
        style={{ background: highlight ? '#0F172A' : '#2F5DDB' }}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 6.5l2.5 2.5L10 3" stroke="#F4F1EA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }
  return (
    <span className="w-5 h-5 rounded-md border-[2px] border-ink/40 flex items-center justify-center flex-shrink-0 mt-[1px]">
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#0F172A" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round">
        <path d="M3 3l6 6M9 3l-6 6" />
      </svg>
    </span>
  )
}

function SummaryRow({ label, value, muted }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={`font-bold text-sm ${muted ? 'text-ink/55' : 'text-ink'}`}>{label}</span>
      <span className={`font-display font-extrabold text-sm tabular-nums ${muted ? 'text-ink/55' : 'text-ink'}`}>{value}</span>
    </div>
  )
}

function PaySpin() {
  return (
    <span className="inline-block flex-shrink-0" style={{
      width: 18, height: 18,
      border: '2.5px solid currentColor', borderTopColor: 'transparent',
      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    }} />
  )
}

function UploadIcon({ white }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={white ? '#F4F1EA' : '#0F172A'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

// Decorative QR — shown when admin hasn't set a real QR yet
function QrCodeSVG({ size = 180 }) {
  const N = 21
  const grid = useMemo(() => {
    const g = Array.from({ length: N }, () => Array(N).fill(0))
    const drawFinder = (r, c) => {
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
        const onEdge = i === 0 || i === 6 || j === 0 || j === 6
        const inner  = i >= 2 && i <= 4 && j >= 2 && j <= 4
        g[r + i][c + j] = onEdge || inner ? 1 : 0
      }
    }
    drawFinder(0, 0); drawFinder(0, N - 7); drawFinder(N - 7, 0)
    for (let i = 8; i < N - 8; i++) { g[6][i] = i % 2 === 0 ? 1 : 0; g[i][6] = i % 2 === 0 ? 1 : 0 }
    const ar = N - 9, ac = N - 9
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const onEdge = i === 0 || i === 4 || j === 0 || j === 4
      g[ar + i][ac + j] = onEdge || (i === 2 && j === 2) ? 1 : 0
    }
    let seed = 1337
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const inFinder = (r < 8 && c < 8) || (r < 8 && c >= N - 8) || (r >= N - 8 && c < 8)
      const inAlign  = r >= ar && r < ar + 5 && c >= ac && c < ac + 5
      if (inFinder || inAlign || r === 6 || c === 6) continue
      if (rand() > 0.52) g[r][c] = 1
    }
    return g
  }, [])

  return (
    <div className="bg-white border-[3px] border-ink rounded-xl p-3" style={{ boxShadow: '4px 4px 0 #0F172A' }}>
      <svg width={size} height={size} viewBox={`0 0 ${N} ${N}`} shapeRendering="crispEdges" style={{ display: 'block' }}>
        <rect width={N} height={N} fill="#F4F1EA" />
        {grid.map((row, r) => row.map((v, c) => v ? (
          <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0F172A" />
        ) : null))}
        <g transform={`translate(${N / 2 - 2.5} ${N / 2 - 2.5})`}>
          <rect width="5" height="5" rx="1.2" fill="#FFD23F" stroke="#0F172A" strokeWidth="0.4" />
          <circle cx="2.5" cy="2.5" r="1.2" fill="#2F5DDB" stroke="#0F172A" strokeWidth="0.3" />
        </g>
      </svg>
    </div>
  )
}
