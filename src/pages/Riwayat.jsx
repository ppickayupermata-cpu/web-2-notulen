import { useMemo, useState } from 'react'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { useData } from '../context/DataContext.jsx'
import { useFill } from '../utils/useFill.js'
import { cocokTeks } from '../utils/filter.js'
import FilterBar from '../components/FilterBar.jsx'

const TYPES = { upload: 'Upload', hapus: 'Hapus', barang: 'Barang Jadi', jadwal: 'Jadwal', error: 'Error' }
const TANPA = '(Tanpa container)'

// Riwayat dipisah per container: satu kelompok per container (yang paling baru aktif di atas), tiap kelompok berisi catatannya.
export default function Riwayat() {
  const { logs, removeLogs } = useData()
  const { confirm, dialog } = useConfirm()
  useFill()   // hanya tabel yang punya scroll
  const [type, setType] = useState('all'), [cont, setCont] = useState('all'), [kel, setKel] = useState(true), [f, setF] = useState({ q: '' })
  const [sel, setSel] = useState([]), [msg, setMsg] = useState('')

  const daftarC = useMemo(() => [...new Set(logs.map((l) => l.container || TANPA))].sort((a, b) => (a === TANPA) - (b === TANPA) || a.localeCompare(b)), [logs])
  const shown = logs.filter((l) => (type === 'all' || l.type === type) && (cont === 'all' || (l.container || TANPA) === cont) && cocokTeks([l.container, l.by, l.detail, TYPES[l.type]].join(' '), f.q))
  const grup = useMemo(() => { // [{ nama, list }] urut menurut catatan terbaru (log sudah terurut baru ke lama)
    if (!kel) return [{ nama: null, list: shown }]
    const m = new Map(); shown.forEach((l) => { const k = l.container || TANPA; if (!m.has(k)) m.set(k, []); m.get(k).push(l) })
    return [...m].map(([nama, list]) => ({ nama, list }))
  }, [shown, kel])
  const picked = sel.filter((id) => shown.some((l) => l.id === id))
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const toggleAll = () => setSel(picked.length === shown.length ? [] : shown.map((l) => l.id))
  const toggleGrup = (list) => { const ids = list.map((l) => l.id), semua = ids.every((id) => sel.includes(id)); setSel((s) => (semua ? s.filter((x) => !ids.includes(x)) : [...new Set([...s, ...ids])])) }

  const remove = async () => {
    const ok = await confirm({ title: 'Hapus riwayat terpilih?', message: `${picked.length} catatan riwayat akan dihapus permanen. Data packing list tidak ikut terhapus.`, confirmLabel: 'Hapus', danger: true })
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
        <label className="inline">Container
          <select value={cont} onChange={(e) => { setCont(e.target.value); setMsg('') }}>
            <option value="all">Semua container</option>
            {daftarC.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="swlabel"><input type="checkbox" checked={kel} onChange={(e) => setKel(e.target.checked)} /> Pisahkan per container</label>
        <button className="btn danger" disabled={!picked.length} onClick={remove}>Hapus ({picked.length})</button>
        {msg && <span className="msg ok">{msg}</span>}
        <span className="hint">{shown.length} catatan</span>
      </div>
      <FilterBar fields={[{ key: 'q', label: 'Cari catatan', placeholder: 'Container, pelaku, keterangan...' }]} value={f} onChange={setF} onClear={() => setF({ q: '' })} />
      {!shown.length ? <div className="empty">{logs.length ? 'Tidak ada catatan yang cocok.' : 'Belum ada riwayat. Upload Excel akan tercatat di sini.'}</div> : (
        <div className="tablewrap">
          <table className="grid">
            <thead><tr>
              <th><input type="checkbox" className="chk" checked={!!shown.length && picked.length === shown.length} onChange={toggleAll} title="Pilih semua" /></th>
              <th>Waktu</th><th>Aksi</th><th>Oleh</th><th>Keterangan</th>
            </tr></thead>
            <tbody>
              {grup.map((g) => [
                g.nama !== null && (
                  <tr key={'g' + g.nama} className="grp"><td><input type="checkbox" className="chk" checked={g.list.every((l) => sel.includes(l.id))} onChange={() => toggleGrup(g.list)} title="Pilih semua catatan container ini" /></td>
                    <td colSpan="4"><b>{g.nama === TANPA ? g.nama : 'Container ' + g.nama}</b> · {g.list.length} catatan</td></tr>
                ),
                ...g.list.map((l) => (
                  <tr key={l.id} className={sel.includes(l.id) ? 'picked' : ''}>
                    <td><input type="checkbox" className="chk" checked={sel.includes(l.id)} onChange={() => toggle(l.id)} /></td>
                    <td>{new Date(l.at).toLocaleString('id-ID')}</td>
                    <td><span className={'tag ' + l.type}>{TYPES[l.type] || l.type}</span></td>
                    <td>{l.by}</td><td className="wrap">{l.detail}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      )}
      {dialog}
    </>
  )
}
