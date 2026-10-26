import { useEffect, useState } from 'react'
import Login from './components/Login.jsx'
import Shell from './components/Shell.jsx'
import { DataProvider } from './context/DataContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { lapor } from './utils/lapor.js'

export default function App() {
  const [user, setUserState] = useState(() => {
    try { const u = JSON.parse(sessionStorage.getItem('pl_user')); return u?.token ? u : null } catch { return null }
  })
  const [notice, setNotice] = useState('')
  const setUser = (u, n = '') => {
    u ? sessionStorage.setItem('pl_user', JSON.stringify(u)) : sessionStorage.removeItem('pl_user')
    setUserState(u); setNotice(n)
  }
  useEffect(() => { // error yang lolos dari React (event handler, promise) ikut dilaporkan
    if (!user?.token) return
    const a = (e) => lapor(user.token, e.error || e.message, 'window'), b = (e) => lapor(user.token, e.reason, 'promise')
    window.addEventListener('error', a); window.addEventListener('unhandledrejection', b)
    return () => { window.removeEventListener('error', a); window.removeEventListener('unhandledrejection', b) }
  }, [user?.token])
  if (!user) return <Login onLogin={(u) => setUser(u)} notice={notice} />
  return (
    <DataProvider key={user.username} token={user.token} onUnauthorized={() => setUser(null, 'Sesi habis. Silakan login lagi.')}>
      <ErrorBoundary onError={(e, w) => lapor(user.token, e, w)}><Shell user={user} onLogout={() => setUser(null)} /></ErrorBoundary>
    </DataProvider>
  )
}
