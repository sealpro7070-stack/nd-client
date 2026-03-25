const BACKEND_URL = 'http://localhost:3001'

const saveBtn         = document.getElementById('saveBtn')
const saveAndSubmitBtn = document.getElementById('saveAndSubmitBtn')
const userInput       = document.getElementById('userIdentifier')
const statusBox       = document.getElementById('status-box')
const statusText      = document.getElementById('status-text')
const msgEl           = document.getElementById('msg')
const savedTimeEl     = document.getElementById('savedTime')
const triggerBtn      = document.getElementById('triggerBtn')
const triggerMsg      = document.getElementById('triggerMsg')

// ── Load saved state ──────────────────────────────────────────────
chrome.storage.local.get(['userIdentifier', 'tokenSaved', 'tokenSavedAt'], (data) => {
  if (data.userIdentifier) {
    userInput.value = data.userIdentifier
    enableButtons()
    loadLastSubmission(data.userIdentifier)
  }
  if (data.tokenSaved && data.tokenSavedAt) {
    const d = new Date(data.tokenSavedAt)
    savedTimeEl.textContent = `Last saved: ${d.toLocaleDateString()} at ${d.toLocaleTimeString()}`
    savedTimeEl.style.display = 'block'
  }
  checkAinsTab()
})

userInput.addEventListener('input', () => {
  if (userInput.value.trim().length >= 5) enableButtons()
  else disableButtons()
})

function enableButtons() {
  saveBtn.disabled = false
  saveAndSubmitBtn.disabled = false
  triggerBtn.disabled = false
}
function disableButtons() {
  saveBtn.disabled = true
  saveAndSubmitBtn.disabled = true
  triggerBtn.disabled = true
}

// ── Check AINS tab ────────────────────────────────────────────────
function checkAinsTab() {
  chrome.tabs.query({}, (tabs) => {
    const ainsTabs = tabs.filter(t => t.url && t.url.includes('ains.moe.gov.my'))
    if (!ainsTabs.length) {
      setStatus('warn', 'No AINS tab found. Open ains.moe.gov.my and log in.')
      return
    }
    setStatus('ok', 'AINS tab detected. Ready to capture.')
  })
}

// ── Core: capture token from AINS tab ─────────────────────────────
async function captureToken() {
  const userIdentifier = userInput.value.trim()
  if (!userIdentifier) throw new Error('Enter your email first.')

  chrome.storage.local.set({ userIdentifier })

  const allTabs = await new Promise(r => chrome.tabs.query({}, r))
  const ainsTabs = allTabs.filter(t => t.url && t.url.includes('ains.moe.gov.my'))
  if (!ainsTabs.length) throw new Error('No AINS tab found. Open ains.moe.gov.my and log in.')

  const ainsTabId = ainsTabs[0].id

  // Read sessionStorage + localStorage
  let storageData = {}
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: ainsTabId },
      func: () => {
        const ls = {}, ss = {}
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k) }
        for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); ss[k] = sessionStorage.getItem(k) }
        return { ls, ss }
      }
    })
    if (results?.[0]?.result) storageData = results[0].result
  } catch (e) { console.error('scripting error:', e) }

  // Read cookies — capture BOTH the frontend and API domains
  let allCookies = []
  try {
    const byUrl    = await chrome.cookies.getAll({ url: 'https://ains.moe.gov.my/' })
    const byDomain = await chrome.cookies.getAll({ domain: 'ains.moe.gov.my' })
    const byApi    = await chrome.cookies.getAll({ domain: 'ains-api.moe.gov.my' })
    const seen = new Set()
    for (const c of [...byUrl, ...byDomain, ...byApi]) {
      if (!seen.has(c.name + c.domain)) { seen.add(c.name + c.domain); allCookies.push(c) }
    }
  } catch (e) { console.error('cookies error:', e) }

  const ss = storageData.ss || {}

  // AINS requires ALL THREE sessionStorage keys to authenticate
  const token   = ss['jb-app-token']
  const ssUser  = ss['jb-app-user']
  const ssProfile = ss['jb-app-profile']

  if (!token) throw new Error('Not logged in. Please log in to AINS first.')

  return { token, ssUser, ssProfile, tokenSource: 'sessionStorage', userIdentifier, cookies: allCookies }
}

// ── Core: save token to backend ───────────────────────────────────
async function saveTokenToBackend(userIdentifier, token, ssUser, ssProfile, cookies) {
  const res = await fetch(`${BACKEND_URL}/api/auth/save-cookie`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIdentifier, cookie: token, ssUser, ssProfile, cookies: cookies || [] })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Server error')
  return data
}

// ── Core: trigger bot ─────────────────────────────────────────────
async function triggerBot(userIdentifier, directCookie, directSsUser, directSsProfile, directCookies) {
  const body = { userIdentifier }
  if (directCookie) body.cookie = directCookie
  if (directSsUser) body.ssUser = directSsUser
  if (directSsProfile) body.ssProfile = directSsProfile
  if (directCookies && directCookies.length) body.cookies = directCookies

  const res = await fetch(`${BACKEND_URL}/api/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Trigger failed')
  return data
}

// ── Button: Save Session ──────────────────────────────────────────
saveBtn.addEventListener('click', async () => {
  saveBtn.disabled = true
  saveBtn.textContent = 'Saving...'
  showMsg('', '')

  try {
    const { token, ssUser, ssProfile, tokenSource, userIdentifier, cookies } = await captureToken()
    await saveTokenToBackend(userIdentifier, token, ssUser, ssProfile, cookies)

    const now = new Date()
    chrome.storage.local.set({ tokenSaved: true, tokenSavedAt: now.getTime() })
    savedTimeEl.textContent = `Last saved: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`
    savedTimeEl.style.display = 'block'
    showMsg(`✓ Saved from ${tokenSource}`, 'success')
    setStatus('ok', 'Session saved successfully!')
    loadLastSubmission(userIdentifier)
  } catch (err) {
    showMsg(err.message, 'error')
  } finally {
    saveBtn.disabled = false
    saveBtn.textContent = 'Save Session'
  }
})

// ── Button: Save & Submit (one click!) ────────────────────────────
saveAndSubmitBtn.addEventListener('click', async () => {
  saveAndSubmitBtn.disabled = true
  saveAndSubmitBtn.textContent = 'Saving...'
  showMsg('', '')
  showTriggerMsg('', '')

  try {
    // Step 1: Capture & save
    const { token, ssUser, ssProfile, tokenSource, userIdentifier, cookies } = await captureToken()
    await saveTokenToBackend(userIdentifier, token, ssUser, ssProfile, cookies)

    const now = new Date()
    chrome.storage.local.set({ tokenSaved: true, tokenSavedAt: now.getTime() })
    savedTimeEl.textContent = `Last saved: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`
    savedTimeEl.style.display = 'block'
    showMsg(`✓ Saved from ${tokenSource}`, 'success')

    // Step 2: Immediately trigger bot with FRESH token + all session data
    saveAndSubmitBtn.textContent = 'Submitting...'
    const result = await triggerBot(userIdentifier, token, ssUser, ssProfile, cookies)
    showTriggerMsg(`✓ ${result.message}`, 'success')
    setStatus('ok', 'Session saved & bot started!')
    setTimeout(() => loadLastSubmission(userIdentifier), 2000)

  } catch (err) {
    showMsg(err.message, 'error')
  } finally {
    saveAndSubmitBtn.disabled = false
    saveAndSubmitBtn.textContent = 'Save & Submit'
  }
})

// ── Button: Submit Now (standalone) ───────────────────────────────
triggerBtn.addEventListener('click', async () => {
  const userIdentifier = userInput.value.trim()
  if (!userIdentifier) return

  triggerBtn.disabled = true
  triggerBtn.textContent = 'Submitting...'
  showTriggerMsg('', '')

  try {
    const data = await triggerBot(userIdentifier)
    showTriggerMsg(`✓ ${data.message}`, 'success')
    setStatus('ok', 'Bot started!')
    setTimeout(() => loadLastSubmission(userIdentifier), 2000)
  } catch (err) {
    showTriggerMsg(err.message, 'error')
  } finally {
    triggerBtn.disabled = false
    triggerBtn.textContent = 'Submit Records Now'
  }
})

// ── Load last submission ──────────────────────────────────────────
async function loadLastSubmission(userIdentifier) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/history?userIdentifier=${encodeURIComponent(userIdentifier)}&limit=1`)
    if (!res.ok) return
    const data = await res.json()
    const rows = data.submissions || data
    if (!rows || !rows.length) return

    const last = rows[0]
    document.getElementById('submissionCard').style.display = 'block'
    document.getElementById('subBook').textContent = last.book_title || last.book_id || 'Unknown Book'
    document.getElementById('subDate').textContent = last.submitted_at
      ? new Date(last.submitted_at).toLocaleString()
      : last.month && last.year ? `${last.month}/${last.year}` : ''

    const badge = document.getElementById('subBadge')
    const status = (last.status || 'pending').toLowerCase()
    badge.textContent = status.charAt(0).toUpperCase() + status.slice(1)
    badge.style.background = status === 'success' ? '#dcfce7' : status === 'failed' ? '#fee2e2' : '#fef9c3'
    badge.style.color      = status === 'success' ? '#166534' : status === 'failed' ? '#991b1b' : '#854d0e'
  } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────
function setStatus(type, text) {
  statusBox.className = `status-box ${type}`
  statusBox.querySelector('.dot').className = `dot ${type === 'ok' ? 'green' : type === 'warn' ? 'yellow' : 'purple'}`
  statusText.textContent = text
}
function showMsg(text, type) {
  if (!text) { msgEl.style.display = 'none'; return }
  msgEl.textContent = text
  msgEl.className = `msg ${type}`
  msgEl.style.display = 'block'
}
function showTriggerMsg(text, type) {
  if (!text) { triggerMsg.style.display = 'none'; return }
  triggerMsg.textContent = text
  triggerMsg.className = `msg ${type}`
  triggerMsg.style.display = 'block'
}
