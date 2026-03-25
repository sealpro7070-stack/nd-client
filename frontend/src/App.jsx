import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import History from './pages/History'
import Admin from './pages/Admin'
import Navbar from './components/Navbar'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
      <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
      <Route path="/history" element={<AppLayout><History /></AppLayout>} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

export default App
