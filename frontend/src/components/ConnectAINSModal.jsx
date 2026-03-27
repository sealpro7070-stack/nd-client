import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export default function ConnectAINSModal({ userId, isOpen, onClose, onSuccess }) {
  const [screenshot, setScreenshot] = useState(null)
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('Initializing...')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const canvasRef = useRef(null)
  const pollIntervalRef = useRef(null)

  // Draw screenshot onto canvas whenever it updates
  useEffect(() => {
    if (!screenshot || !canvasRef.current) return
    const img = new Image()
    img.onload = () => {
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) ctx.drawImage(img, 0, 0, 1280, 800)
    }
    img.src = `data:image/png;base64,${screenshot}`
  }, [screenshot])

  // Initialize session and start polling
  useEffect(() => {
    if (!isOpen) return

    const init = async () => {
      try {
        setError('')
        setStatus('Starting AINS login session...')
        const res = await fetch(`${BACKEND}/api/auth/start-login-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        setScreenshot(data.screenshot)
        setUrl(data.url)
        setStatus('Ready. Log in to your AINS account.')
        setLoading(false)

        // Start polling for login status
        startStatusPolling()
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }

    init()

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      // Cleanup session on unmount
      fetch(`${BACKEND}/api/auth/cancel-login-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      }).catch(() => {})
    }
  }, [isOpen, userId])

  const startStatusPolling = () => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND}/api/auth/check-login-status?userId=${userId}`)
        const data = await res.json()

        if (data.screenshot) setScreenshot(data.screenshot)
        if (data.url) setUrl(data.url)
        if (data.message) setStatus(data.message)

        if (data.loggedIn) {
          // Success!
          clearInterval(pollIntervalRef.current)
          setStatus('✓ AINS connected! Closing...')
          setTimeout(() => {
            onSuccess()
            onClose()
          }, 1000)
        }
      } catch (err) {
        console.error('[modal] Status check failed:', err)
      }
    }, 2000)
  }

  const handleInputClick = async (clientX, clientY) => {
    if (!screenshot || loading) return

    try {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = 1280 / rect.width // Canvas is 1280px wide
      const scaleY = 800 / rect.height // Canvas is 800px tall
      const x = (clientX - rect.left) * scaleX
      const y = (clientY - rect.top) * scaleY

      // Find element at coordinates and click it
      // For now, just send a generic click selector based on position
      // In a real implementation, this would use playwright's locateBy coordinates
      const selector = `[data-x="${Math.round(x)}"][data-y="${Math.round(y)}"]`

      setStatus('Clicking...')
      const res = await fetch(`${BACKEND}/api/auth/send-input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type: 'click', target: 'body' })
      })
      const data = await res.json()
      if (data.screenshot) setScreenshot(data.screenshot)
      if (data.url) setUrl(data.url)
      setStatus('Ready. Continue logging in.')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleKeydown = async (e) => {
    if (!screenshot || loading || e.target.tagName === 'INPUT') return

    try {
      let type = 'key'
      let payload = { userId, type, key: e.key }

      if (e.key === 'Enter') {
        payload.key = 'Enter'
      } else if (e.key === 'Tab') {
        e.preventDefault()
        payload.key = 'Tab'
      } else if (e.key.length === 1) {
        type = 'type'
        payload = { userId, type, text: e.key }
      } else {
        return
      }

      setStatus('Sending input...')
      const res = await fetch(`${BACKEND}/api/auth/send-input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.screenshot) setScreenshot(data.screenshot)
      if (data.url) setUrl(data.url)
      setStatus('Ready. Continue logging in.')
    } catch (err) {
      setError(err.message)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-brand-600 text-white p-4 flex items-center justify-between">
          <h3 className="font-bold">Connect your AINS Account</h3>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-danger-50 border border-danger-200 rounded-lg p-3 text-danger-700 text-sm">
              {error}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
            <p className="text-sm text-brand-800">
              <strong>Log in to AINS here:</strong> Click on the screen below to interact with the login form. Use your DELIMa account (Google login, IC+password, or any method you normally use).
            </p>
          </div>

          {/* Screenshot display */}
          <div className="border border-line rounded-lg overflow-hidden bg-gray-50">
            {loading ? (
              <div className="w-full h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-muted text-sm">Starting AINS...</p>
                </div>
              </div>
            ) : screenshot ? (
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={1280}
                  height={800}
                  onClick={e => handleInputClick(e.clientX, e.clientY)}
                  onKeyDown={handleKeydown}
                  tabIndex={0}
                  className="w-full h-auto cursor-pointer border-0"
                  style={{ display: 'block', maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className="w-full h-96 flex items-center justify-center text-muted">
                No screenshot available
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted mb-1">Status:</p>
              <p className="text-sm font-semibold text-heading">{status}</p>
              {url && <p className="text-xs text-muted mt-1">{url}</p>}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-line text-muted font-bold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  )
}
