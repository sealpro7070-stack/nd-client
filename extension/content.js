// content.js — runs on ains.moe.gov.my
// Reads auth_token from localStorage and relays it to the popup

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTH_TOKEN') {
    const token = localStorage.getItem('auth_token')
    const userData = localStorage.getItem('user') || localStorage.getItem('currentUser') || null

    sendResponse({
      token,
      userData,
      url: window.location.href,
      isLoggedIn: !!token
    })
  }
  return true
})
