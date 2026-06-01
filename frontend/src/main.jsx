import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// After a deploy, a tab that loaded the old index.html may request an asset
// hash that no longer exists. A failed <link>/<script> load fires a non-bubbling
// 'error' on the element — catch it in the capture phase and hard-reload once to
// pull the fresh build (the JS-chunk equivalent is handled by ChunkErrorBoundary).
window.addEventListener('error', (e) => {
  const t = e.target
  const isAsset = t && (t.tagName === 'LINK' || t.tagName === 'SCRIPT')
  if (isAsset && !sessionStorage.getItem('asset-reloaded')) {
    sessionStorage.setItem('asset-reloaded', '1')
    window.location.reload()
  }
}, true)
// A clean load means assets are current again — reset the one-shot reload guards
// so a future deploy can reload once more.
window.addEventListener('load', () => {
  sessionStorage.removeItem('asset-reloaded')
  sessionStorage.removeItem('chunk-reloaded')
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
