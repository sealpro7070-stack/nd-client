import { useState, useRef } from 'react'

const LANG_BOOKS = {
  Malay:   ['Bumi Manusia', 'Hujan Pagi', 'Salina', 'Harimau! Harimau!', 'Ranjau Sepanjang Jalan'],
  English: ['Tuesdays with Morrie', 'The Outsiders', 'Animal Farm', 'Hatchet', 'Holes'],
  Chinese: ['活着', '解忧杂货店', '围城', '边城', '骆驼祥子'],
  Tamil:   ['பொன்னியின் செல்வன்', 'சிவகாமியின் சபதம்', 'பார்த்திபன் கனவு', 'அலை ஓசை', 'வெள்ளைக்காரி'],
}
const LANGUAGES = ['Malay', 'English', 'Chinese', 'Tamil']

export default function LiveDemo() {
  const [stage, setStage]       = useState('disconnected')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [authing, setAuthing]   = useState(false)
  const [authErr, setAuthErr]   = useState('')
  const [lang, setLang]         = useState('Malay')
  const [count, setCount]       = useState(3)
  const [progress, setProgress] = useState([])
  const submittingRef            = useRef(false)

  const connected = stage !== 'disconnected' && stage !== 'modal'

  function openModal() { setAuthErr(''); setStage('modal') }
  function closeModal() { if (authing) return; setStage(s => s === 'modal' ? 'disconnected' : s) }

  function fillExample() {
    setEmail('ahmad.zikri@moe-student.edu.my')
    setPassword('demo1234')
  }

  function submitAuth() {
    if (!email || !password) { setAuthErr('Enter both email and password.'); return }
    setAuthing(true); setAuthErr('')
    setTimeout(() => { setAuthing(false); setStage('ready') }, 1600)
  }

  function startSubmit() {
    if (submittingRef.current) return
    submittingRef.current = true
    const pool  = LANG_BOOKS[lang]
    const picks = Array.from({ length: count }, (_, i) => pool[i % pool.length])
    setProgress(picks.map(t => ({ title: t, status: 'queued' })))
    setStage('submitting')
    picks.forEach((_, i) => {
      setTimeout(() => setProgress(p => p.map((x, idx) => idx === i ? { ...x, status: 'pending' } : x)), 500 + i * 900)
      setTimeout(() => {
        setProgress(p => p.map((x, idx) => idx === i ? { ...x, status: 'success' } : x))
        if (i === picks.length - 1) setTimeout(() => { setStage('done'); submittingRef.current = false }, 700)
      }, 500 + i * 900 + 1100)
    })
  }

  function reset()     { setStage('ready'); setProgress([]); submittingRef.current = false }
  function fullReset() { setStage('disconnected'); setEmail(''); setPassword(''); setAuthErr(''); setProgress([]); submittingRef.current = false }

  return (
    <div className="relative">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#1B1F3A] border-b-[3px] border-ink">
        <span className="w-3 h-3 rounded-full bg-[#FF6157]" />
        <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
        <span className="w-3 h-3 rounded-full bg-[#28C840]" />
        <div className="flex-1 mx-3 px-3 py-1 bg-white/10 rounded-md text-white/60 font-mono text-[11px] truncate">
          nilamdesk — dashboard
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-white/60 text-[11px] font-bold">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#28C840]' : 'bg-yellow'}`} />
          {connected ? 'AINS Connected' : 'Not connected'}
        </div>
      </div>

      {/* Content */}
      <div className="bg-cream p-4 sm:p-6 relative">

        {/* DISCONNECTED */}
        {stage === 'disconnected' && (
          <div className="flex flex-col items-center text-center py-10 sm:py-14">
            <div className="w-14 h-14 rounded-2xl bg-ink text-cream flex items-center justify-center mb-4 border-[3px] border-ink"
              style={{ boxShadow: '4px 4px 0 #FFD23F' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
            <p className="font-display font-black text-ink text-xl sm:text-2xl tracking-tight">Connect your AINS account</p>
            <p className="text-ink/60 text-sm mt-1.5 max-w-xs">Takes 20 seconds. We never store your password — only your session, encrypted.</p>
            <button onClick={openModal} className="chunky-btn chunky-btn--primary mt-5">Connect AINS →</button>
          </div>
        )}

        {/* READY / SUBMITTING / DONE */}
        {connected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#28C840]" />
                <span className="font-bold text-ink text-sm truncate max-w-[200px]">{email || 'ahmad.zikri@moe-student.edu.my'}</span>
              </div>
              <button onClick={fullReset} className="text-[11px] font-bold text-ink/50 hover:text-ink underline underline-offset-2">disconnect</button>
            </div>

            {/* Config card */}
            <div className="bg-white border-[3px] border-ink rounded-2xl p-4 sm:p-5" style={{ boxShadow: '5px 5px 0 #0F172A' }}>
              <p className="font-display font-black text-ink text-sm uppercase tracking-wider mb-3">Submission settings</p>

              {/* Language chips */}
              <div className="mb-4">
                <p className="text-[11px] font-bold text-ink/50 uppercase tracking-wider mb-2">Language</p>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map(l => (
                    <button key={l} disabled={stage === 'submitting'} onClick={() => setLang(l)}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-lg border-[2px] border-ink transition-all
                        ${lang === l ? 'bg-ink text-cream' : 'bg-cream text-ink hover:bg-yellow'}
                        ${stage === 'submitting' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Count stepper */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-[11px] font-bold text-ink/50 uppercase tracking-wider mb-0.5">Books per submit</p>
                  <p className="text-ink/50 text-xs">Pro plan · up to 50/month</p>
                </div>
                <div className="flex items-center gap-2">
                  <button disabled={stage === 'submitting' || count <= 1} onClick={() => setCount(c => Math.max(1, c - 1))}
                    className="w-9 h-9 rounded-lg border-[2px] border-ink bg-white text-ink font-black text-lg disabled:opacity-30 hover:bg-cream">−</button>
                  <span className="font-display font-black text-3xl text-cobalt min-w-[44px] text-center tabular-nums">{count}</span>
                  <button disabled={stage === 'submitting' || count >= 5} onClick={() => setCount(c => Math.min(5, c + 1))}
                    className="w-9 h-9 rounded-lg border-[2px] border-ink bg-white text-ink font-black text-lg disabled:opacity-30 hover:bg-cream">+</button>
                </div>
              </div>

              {stage !== 'done' && (
                <button onClick={startSubmit} disabled={stage === 'submitting'}
                  className="w-full chunky-btn chunky-btn--primary justify-center"
                  style={stage === 'submitting' ? { opacity: 0.75 } : undefined}>
                  {stage === 'submitting'
                    ? <><DemoSpinner />Submitting…</>
                    : <>⚡ Submit {count} {lang} book{count !== 1 ? 's' : ''}</>}
                </button>
              )}
              {stage === 'done' && (
                <button onClick={reset} className="w-full chunky-btn chunky-btn--ghost justify-center">↻ Run again</button>
              )}
            </div>

            {/* Live progress */}
            {(stage === 'submitting' || stage === 'done') && (
              <div className="bg-white border-[3px] border-ink rounded-2xl overflow-hidden" style={{ boxShadow: '5px 5px 0 #0F172A' }}>
                <div className="px-4 py-2.5 bg-ink text-cream flex items-center justify-between">
                  <span className="font-display font-black text-xs uppercase tracking-wider">
                    {stage === 'done' ? 'All done!' : 'Live progress'}
                  </span>
                  <span className="text-xs font-bold text-cream/70">
                    {progress.filter(p => p.status === 'success').length}/{progress.length} done
                  </span>
                </div>
                <div className="divide-y-[2px] divide-ink/10">
                  {progress.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                        {p.status === 'queued'  && <span className="w-4 h-4 rounded-full border-2 border-ink/20 block" />}
                        {p.status === 'pending' && <DemoSpinner small />}
                        {p.status === 'success' && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" fill="#0E7D4F" />
                            <path d="M7.5 12.5l3 3 6-7" stroke="#F4F1EA" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className={`flex-1 text-sm font-bold truncate ${p.status === 'queued' ? 'text-ink/40' : 'text-ink'}`}>{p.title}</span>
                      <span className={`text-[11px] font-extrabold uppercase tracking-wider flex-shrink-0
                        ${p.status === 'success' ? 'text-[#0E7D4F]' : p.status === 'pending' ? 'text-cobalt' : 'text-ink/30'}`}>
                        {p.status === 'success' ? 'Submitted' : p.status === 'pending' ? 'Sending' : 'Queued'}
                      </span>
                    </div>
                  ))}
                </div>
                {stage === 'done' && (
                  <div className="px-4 py-3 bg-yellow border-t-[3px] border-ink flex items-center gap-2">
                    <span className="text-xl">🎉</span>
                    <span className="font-display font-black text-ink text-sm">
                      {count} record{count !== 1 ? 's' : ''} live on ains.moe.gov.my. Done for the month.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONNECT MODAL */}
      {stage === 'modal' && (
        <div onClick={closeModal}
          className="absolute inset-0 bg-ink/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-10">
          <div onClick={e => e.stopPropagation()}
            className="bg-cream border-[3px] border-ink rounded-2xl w-full max-w-sm overflow-hidden"
            style={{ boxShadow: '8px 8px 0 #FFD23F' }}>
            <div className="bg-ink text-cream px-5 py-3 flex items-center justify-between">
              <span className="font-display font-black text-sm uppercase tracking-wider">Connect AINS</span>
              <button onClick={closeModal} disabled={authing} className="text-cream/70 hover:text-cream font-bold text-lg leading-none">✕</button>
            </div>
            <div className="p-5">
              <p className="font-display font-black text-ink text-lg leading-tight mb-1">Log in once. Submit forever.</p>
              <p className="text-ink/60 text-xs mb-4">Demo only — no real login. Click "Use example" to autofill.</p>

              <label className="block">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/60">AINS Email</span>
                <input type="email" value={email} disabled={authing} onChange={e => setEmail(e.target.value)}
                  placeholder="name@moe-student.edu.my"
                  className="w-full mt-1 px-3 py-2.5 rounded-lg border-[2px] border-ink bg-white font-bold text-sm text-ink focus:outline-none focus:ring-2 focus:ring-yellow" />
              </label>
              <label className="block mt-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/60">Password</span>
                <input type="password" value={password} disabled={authing} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full mt-1 px-3 py-2.5 rounded-lg border-[2px] border-ink bg-white font-bold text-sm text-ink focus:outline-none focus:ring-2 focus:ring-yellow" />
              </label>

              {authErr && <p className="text-xs font-extrabold text-red-600 mt-2">{authErr}</p>}

              <button onClick={fillExample} disabled={authing} className="mt-3 text-xs font-extrabold text-cobalt hover:underline">
                ↳ Use example credentials
              </button>
              <button onClick={submitAuth} disabled={authing} className="mt-4 w-full chunky-btn chunky-btn--primary justify-center">
                {authing ? <><DemoSpinner />Verifying…</> : 'Connect →'}
              </button>
              <div className="mt-4 flex items-start gap-2 text-[11px] text-ink/55">
                <span className="text-base leading-none">🔒</span>
                <span>Your password is sent over TLS, used once to capture a session, then discarded.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DemoSpinner({ small = false }) {
  const s = small ? 14 : 18
  return (
    <span style={{
      display: 'inline-block', width: s, height: s,
      border: '2.5px solid currentColor', borderTopColor: 'transparent',
      borderRadius: '50%', animation: 'spinnerSpin 0.8s linear infinite', flexShrink: 0,
    }} />
  )
}
