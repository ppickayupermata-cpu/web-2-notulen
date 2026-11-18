import { useEffect, useState } from 'react'
import { Menu, LogOut, Maximize, Minimize, Sun, Moon, Search, Keyboard, WifiOff, Check, Loader2 } from 'lucide-react'
import CariGlobal from './CariGlobal.jsx'
import Pintasan from './Pintasan.jsx'
import FsFab from './FsFab.jsx'
import { useUi } from '../context/UiContext.jsx'
import Sidebar from './Sidebar.jsx'
import Monitoring from '../pages/Monitoring.jsx'
import UploadExcel from '../pages/UploadExcel.jsx'
import DeleteData from '../pages/DeleteData.jsx'
import Riwayat from '../pages/Riwayat.jsx'
import Cadangan from '../pages/Cadangan.jsx'
import { useData } from '../context/DataContext.jsx'

export default function Shell({ user, onLogout }) {
  const [page, setPage] = useState('monitoring')
  const [nav, setNav] = useState(true)
  const { loading, error, clearError, saving, lastSaved, notice, clearNotice } = useData()
  const [cari, setCari] = useState(false), [pin, setPin] = useState(false), [online, setOnline] = useState(navigator.onLine)
  const { setJump } = useUi()
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    const key = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCari((v) => !v); return }
      const t = e.target, typing = t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
      if (e.key === '?' && !typing) { e.preventDefault(); setPin(true) }
    }
    window.addEventListener('online', on); window.addEventListener('offline', off); window.addEventListener('keydown', key)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); window.removeEventListener('keydown', key) }
  }, [])
  const pick = (r) => { setJump({ groupId: r.groupId, so: r.so }); setPage('monitoring'); setCari(false) }
  const { theme, toggleTheme, fs, toggleFs, showFilter, setShowFilter } = useUi()
  const ThemeIcon = theme === 'dark' ? Sun : Moon
  const [navFs, setNavFs] = useState(false) // di layar penuh sidebar jadi laci yang menimpa tabel, tertutup sampai hamburger diklik
  useEffect(() => { if (!fs) setNavFs(false) }, [fs])
  return (
    <div className={'shell' + (fs ? ' fs' : '')}>
      <header className="shellbar">
        <button className="icon-btn" onClick={() => setNav((v) => !v)} title="Menu"><Menu size={20} /></button>
        <b>Monitoring Packing List</b>
        <span className="spacer" />
        {!online ? <span className="savestat off" role="status"><WifiOff size={14} /> Offline: perubahan belum tersimpan</span>
          : saving ? <span className="savestat busy" role="status"><Loader2 size={14} className="spin" /> Menyimpan…</span>
          : lastSaved ? <span className="savestat ok" role="status"><Check size={14} /> Tersimpan {lastSaved.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span> : null}
        <button className="icon-btn" onClick={() => setCari(true)} title="Cari di semua container (Ctrl+K)"><Search size={18} /></button>
        <button className="icon-btn" onClick={() => setPin(true)} title="Pintasan keyboard (?)"><Keyboard size={18} /></button>
        <button className="icon-btn" onClick={toggleTheme} title="Tema terang / gelap"><ThemeIcon size={18} /></button>
        <button className="icon-btn" onClick={toggleFs} title="Layar penuh"><Maximize size={18} /></button>
        <span>{user.username}</span>
        <button className="btn ghost" onClick={onLogout}><LogOut size={15} /> Keluar</button>
      </header>
      {fs && <FsFab items={[
        { key: 'menu', label: 'Menu', icon: <Menu size={18} />, active: navFs, onClick: () => setNavFs((v) => !v) },
        { key: 'cari', label: 'Tampilkan / sembunyikan pencarian', icon: <Search size={18} />, active: showFilter, onClick: () => setShowFilter((v) => !v), keep: true },
        { key: 'tema', label: 'Tema terang / gelap', icon: <ThemeIcon size={18} />, onClick: toggleTheme, keep: true },
        { key: 'keluar', label: 'Keluar layar penuh (Esc)', icon: <Minimize size={18} />, onClick: toggleFs },
      ]} />}
      {fs && navFs && <div className="fs-backdrop" onClick={() => setNavFs(false)} />}
      <div className="body">
        <Sidebar page={page} setPage={(p) => { setPage(p); if (fs) setNavFs(false) }} open={fs ? navFs : nav} />
        <main className="content">
          {error && <div className="banner">{error}<button onClick={clearError} title="Tutup">×</button></div>}
          {notice && <div className="banner info">{notice}<button onClick={clearNotice} title="Tutup">×</button></div>}
          {loading ? <div className="empty">Memuat data...</div> : (
            <>
              {page === 'monitoring' && <Monitoring by={user.username} />}
              {page === 'upload' && <UploadExcel by={user.username} />}
              {page === 'delete' && <DeleteData by={user.username} />}
              {page === 'log' && <Riwayat />}
              {page === 'cadangan' && <Cadangan />}
            </>
          )}
        </main>
      </div>
      {cari && <CariGlobal onClose={() => setCari(false)} onPick={pick} />}
      {pin && <Pintasan onClose={() => setPin(false)} />}
    </div>
  )
}
