import { useState } from 'react'
import Login from './components/Login.jsx'
import Shell from './components/Shell.jsx'
import { DataProvider } from './context/DataContext.jsx'

export default function App() {
  const [user, setUserState] = useState(() => {
    try { const u = JSON.parse(sessionStorage.getItem('pl_user')); return u?.token ? u : null } catch { return null }
  })
  const [notice, setNotice] = useState('')
  const setUser = (u, n = '') => {
    u ? sessionStorage.setItem('pl_user', JSON.stringify(u)) : sessionStorage.removeItem('pl_user')
    setUserState(u); setNotice(n)
  }
  if (!user) return <Login onLogin={(u) => setUser(u)} notice={notice} />
  return (
    <DataProvider key={user.username} token={user.token} onUnauthorized={() => setUser(null, 'Sesi habis. Silakan login lagi.')}>
      <Shell user={user} onLogout={() => setUser(null)} />
    </DataProvider>
  )
}
