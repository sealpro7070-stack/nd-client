/**
 * browser-pool.js — Single global semaphore for ALL Playwright/Chromium instances.
 *
 * Both the AINS-connect flow (session-manager.js) and the book-submission bot
 * (bot/bot.js) launch headless Chromium (~150-300 MB each) inside the SAME
 * Node process, so they must share ONE memory budget. Previously each kept its
 * own counter (connect=3, submit=5), allowing up to 8 concurrent browsers and
 * making OOM crashes possible on a small instance.
 *
 * Size the cap to the host RAM via env: floor((RAM_MB - 400) / 300).
 * e.g. 2 GB -> ~5, 4 GB -> ~12. Defaults to 5.
 */

const MAX_CONCURRENT_BROWSERS = parseInt(process.env.MAX_CONCURRENT_BROWSERS, 10) || 5

let activeBrowserCount = 0
const waitQueue = [] // array of waiter fns: (releaseFn) => void

// Build an idempotent release fn: calling it more than once is a no-op, so the
// connect path (which may release via an early-return + the session object) can
// never double-decrement the counter.
function makeRelease() {
  let released = false
  return function release() {
    if (released) return
    released = true
    activeBrowserCount--
    if (waitQueue.length > 0 && activeBrowserCount < MAX_CONCURRENT_BROWSERS) {
      activeBrowserCount++
      const next = waitQueue.shift()
      next(makeRelease())
    }
  }
}

/**
 * Acquire one browser slot. Resolves with a release() function once a slot is
 * free. If none frees within timeoutMs, rejects so the caller can fail fast
 * (return "server busy") instead of hanging forever.
 */
async function acquireBrowserSlot(timeoutMs = 30000) {
  if (activeBrowserCount < MAX_CONCURRENT_BROWSERS) {
    activeBrowserCount++
    return makeRelease()
  }
  return new Promise((resolve, reject) => {
    const waiter = (releaseFn) => {
      clearTimeout(timer)
      resolve(releaseFn)
    }
    const timer = setTimeout(() => {
      // Remove the stale waiter so a later release() doesn't hand a slot to a
      // dead promise (which would permanently leak a slot).
      const idx = waitQueue.indexOf(waiter)
      if (idx !== -1) waitQueue.splice(idx, 1)
      reject(new Error('Browser pool full — server busy, please try again shortly'))
    }, timeoutMs)
    waitQueue.push(waiter)
  })
}

function getActiveBrowserCount() {
  return activeBrowserCount
}

module.exports = { acquireBrowserSlot, getActiveBrowserCount, MAX_CONCURRENT_BROWSERS }
