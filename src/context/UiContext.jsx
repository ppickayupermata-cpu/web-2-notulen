import { createContext, useContext, useEffect, useState } from 'react'

const Ui = createContext(null)
export const useUi = () => useContext(Ui)

// Tema (terang/gelap) + mode layar penuh. Di layar penuh, kolom pencarian disembunyikan dan hanya muncul lewat toggle.
export function UiProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('pl_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [fs, setFs] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [jump, setJump] = useState(null) // { groupId, so }: lompat dari pencarian global ke tabel Monitoring
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('pl_theme', theme) } catch {} }, [theme])
  useEffect(() => {
    const out = () => { if (!document.fullscreenElement) setFs(false) }
    const esc = (e) => e.key === 'Escape' && setFs(false)
    document.addEventListener('fullscreenchange', out); window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('fullscreenchange', out); window.removeEventListener('keydown', esc) }
  }, [])
  const toggleFs = () => {
    const next = !fs; setFs(next); setShowFilter(false)
    if (next) document.documentElement.requestFullscreen?.().catch(() => {})
    else if (document.fullscreenElement) document.exitFullscreen()
  }
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  return <Ui.Provider value={{ theme, toggleTheme, fs, toggleFs, showFilter, setShowFilter, jump, setJump }}>{children}</Ui.Provider>
}
