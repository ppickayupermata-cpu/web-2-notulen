import { useState } from 'react'
import SheetEditor from '../pages/SheetEditor.jsx'
import { Menu, LogOut, Maximize, Minimize, Sun, Moon, Search } from 'lucide-react'
import { useUi } from '../context/UiContext.jsx'
import Sidebar from './Sidebar.jsx'
import Monitoring from '../pages/Monitoring.jsx'
import UploadExcel from '../pages/UploadExcel.jsx'
import DeleteData from '../pages/DeleteData.jsx'
import Riwayat from '../pages/Riwayat.jsx'
import { useData } from '../context/DataContext.jsx'
import { ROLES } from '../config.js'

export default function Shell({ user, onLogout }) {
  const [page, setPage] = useState('monitoring')
  const [nav, setNav] = useState(true)
  const { loading, error, clearError } = useData()
  const role = ROLES[user.role]
  const { theme, toggleTheme, fs, toggleFs, showFilter, setShowFilter } = useUi()
  const ThemeIcon = theme === 'dark' ? Sun : Moon
  return (
    <div className={'shell' + (fs ? ' fs' : '')}>
      <header className="shellbar">
        <button className="icon-btn" onClick={() => setNav((v) => !v)} title="Menu"><Menu size={20} /></button>
        <b>Monitoring Packing List</b>
        <span className="spacer" />
        <button className="icon-btn" onClick={toggleTheme} title="Tema terang / gelap"><ThemeIcon size={18} /></button>
        <button className="icon-btn" onClick={toggleFs} title="Layar penuh"><Maximize size={18} /></button>
        <span>{user.username} ({role.label})</span>
        <button className="btn ghost" onClick={onLogout}><LogOut size={15} /> Keluar</button>
      </header>
      {fs && (
        <div className="fsbar">
          <button className={'icon-btn' + (showFilter ? ' on' : '')} onClick={() => setShowFilter((v) => !v)} title="Tampilkan / sembunyikan pencarian"><Search size={18} /></button>
          <button className="icon-btn" onClick={toggleTheme} title="Tema terang / gelap"><ThemeIcon size={18} /></button>
          <button className="icon-btn" onClick={toggleFs} title="Keluar layar penuh (Esc)"><Minimize size={18} /></button>
        </div>
      )}
      <div className="body">
        <Sidebar role={user.role} page={page} setPage={setPage} open={nav} />
        <main className="content">
          {error && <div className="banner">{error}<button onClick={clearError} title="Tutup">×</button></div>}
          {loading ? <div className="empty">Memuat data...</div> : (
            <>
              {page === 'monitoring' && <Monitoring role={user.role} by={user.username} />}
              {page === 'sheet' && <SheetEditor />}
              {page === 'upload' && <UploadExcel by={user.username} />}
              {page === 'delete' && <DeleteData by={user.username} />}
              {page === 'log' && <Riwayat role={user.role} />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
