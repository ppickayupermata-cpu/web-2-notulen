import { useState } from 'react'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { useData } from '../context/DataContext.jsx'

const TYPES = { upload: 'Upload', hapus: 'Hapus', jadwal: 'Jadwal', error: 'Error' }

export default function Riwayat() {
  const { logs, removeLogs } = useData()
  const { confirm, dialog } = useConfirm()
  const canDelete = true
  const [type, setType] = useState('all')
  const [sel, setSel] = useState([])
  const [msg, setMsg] = useState('')

  const shown = logs.filter((l) => type === 'all' || l.type === type)
  const picked = sel.filter((id) => shown.some((l) => l.id === id))
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const toggleAll = () => setSel(picked.length === shown.length ? [] : shown.map((l) => l.id))

  const remove = async () => {
    const ok = await confirm({
      title: 'Hapus riwayat terpilih?',
      message: `${picked.length} catatan riwayat akan dihapus permanen. Data packing list tidak ikut terhapus.`,
      confirmLabel: 'Hapus', danger: true,
    })
    if (!ok) return
    removeLogs(picked); setSel([]); setMsg(`${picked.length} catatan dihapus.`)
  }

  return (
    <>
      <h2>Riwayat</h2>
      <div className="toolbar wrap">
        <label className="inline">Tampilkan
          <select value={type} onChange={(e) => { setType(e.target.value); setMsg('') }}>
            <option value="all">Semua</option>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        {canDelete && <button className="btn danger" disabled={!picked.length} onClick={remove}>Hapus ({picked.length})</button>}
        {msg && <span className="msg ok">{msg}</span>}
        <span className="hint">{shown.length} catatan</span>
      </div>
      {!shown.length ? <div className="empty">Belum ada riwayat. Upload Excel akan tercatat di sini.</div> : (
        <div className="tablewrap">
          <table className="grid">
            <thead><tr>
              {canDelete && <th><input type="checkbox" className="chk" checked={picked.length === shown.length} onChange={toggleAll} title="Pilih semua" /></th>}
              <th>Waktu</th><th>Aksi</th><th>Oleh</th><th>Keterangan</th>
            </tr></thead>
            <tbody>
              {shown.map((l) => (
                <tr key={l.id} className={sel.includes(l.id) ? 'picked' : ''}>
                  {canDelete && <td><input type="checkbox" className="chk" checked={sel.includes(l.id)} onChange={() => toggle(l.id)} /></td>}
                  <td>{new Date(l.at).toLocaleString('id-ID')}</td>
                  <td><span className={'tag ' + l.type}>{TYPES[l.type]}</span></td>
                  <td>{l.by}</td><td style={{ whiteSpace: 'normal' }}>{l.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog}
    </>
  )
}
