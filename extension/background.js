const BACKEND_URL = 'http://localhost:3001'
const AINS_URL = 'https://ains.moe.gov.my/'

// Listen for messages from content.js or popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_COOKIE') {
    handleSaveCookie(message.userIdentifier).then(sendResponse)
    return true // keep channel open for async
  }
  if (message.type === 'GET_STATUS') {
    getStatus().then(sendResponse)
    return true
  }
})

async function handleSaveCookie(userIdentifier) {
  try {
    // Fetch cookies by URL — more reliable than domain filter
    const cookiesByUrl = await chrome.cookies.getAll({ url: AINS_URL })

    // Also try bare domain as fallback
    const cookiesByDomain = await chrome.cookies.getAll({ domain: 'ains.moe.gov.my' })

    // Merge both lists, deduplicate by name
    const seen = new Set()
    const allCookies = []
    for (const c of [...cookiesByUrl, ...cookiesByDomain]) {
      if (!seen.has(c.name)) {
        seen.add(c.name)
        allCookies.push(c)
      }
    }

    if (!allCookies || allCookies.length === 0) {
      return {
        success: false,
        error: 'No AINS cookies found. Make sure you are logged in and the AINS tab is open.'
      }
    }

    // Build full cookie string
    const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ')

    // Find the session cookie for display
    const sessionCookie =
      allCookies.find(c => c.name === 'PHPSESSID') ||
      allCookies.find(c => c.name === 'laravel_session') ||
      allCookies.find(c => c.name.toLowerCase().includes('sess') || c.name.toLowerCase().includes('token')) ||
      allCookies[0]

    // Send to backend — backend resolves user by UUID or email
    const res = await fetch(`${BACKEND_URL}/api/auth/save-cookie`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIdentifier, cookie: cookieString })
    })

    const data = await res.json()

    if (!res.ok) return { success: false, error: data.error || 'Server error' }

    // Store locally
    await chrome.storage.local.set({
      cookieSaved: true,
      cookieSavedAt: Date.now(),
      userIdentifier
    })

    return {
      success: true,
      cookieName: sessionCookie.name,
      totalCookies: allCookies.length
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function getStatus() {
  return chrome.storage.local.get(['cookieSaved', 'cookieSavedAt', 'userIdentifier', 'ainsDetected'])
}

// Detect AINS login
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes('ains.moe.gov.my') &&
    !tab.url.includes('login') &&
    !tab.url.includes('sign-in')
  ) {
    chrome.storage.local.set({ ainsDetected: true, ainsUrl: tab.url })
  }
})
