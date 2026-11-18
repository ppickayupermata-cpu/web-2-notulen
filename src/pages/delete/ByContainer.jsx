import { useState } from 'react'
import FilterBar, { GROUP_FIELDS } from '../../components/FilterBar.jsx'
import { useConfirm } from '../../components/ConfirmDialog.jsx'
import { useData } from '../../context/DataContext.jsx'
import { filterGroups } from '../../utils/filter.js'
import { addMonths, showDate, today, tomorrow } from '../../utils/date.js'

const G0 = { container: '', buyer: '' }

export default function ByContainer({ by }) {
  const { groups, rows, schedules, settings, removeGroup, addSchedules } = useData()
  const { confirm, dialog } = useConfirm()
  const [f, setF] = useState(G0)
  const [sel, setSel] = useState([])
  const [date, setDate] = useState('')
  const [msg, setMsg] = useState(null)

  const shown = filterGroups(groups, f)
  const picked = groups.filter((g) => sel.includes(g.id) && shown.includes(g))
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const toggleAll = () => setSel(picked.length === shown.length ? [] : shown.map((g) => g.id))
  const countOf = (id) => rows.filter((r) => r.groupId === id).length
  const names = picked.map((g) => g.container).join(', ')

  const when = (g) => {
    const s = schedules.find((x) => x.kind === 'container' && x.groupId === g.id)
    if (s) return `${showDate(s.date)} (terjadwal)`
    return settings.autoDelete ? `${showDate(addMonths(g.addedAt, settings.months))} (otomatis)` : '—'
  }

  const removeNow = async () => {
    const total = picked.reduce((s, g) => s + countOf(g.id), 0)
    const ok = await confirm({
      title: 'Hapus container terpilih?',
      message: `Container ${names} beserta seluruh isinya (${total} baris) akan dihapus permanen.`,
      confirmLabel: 'Hapus', danger: true,
    })
    if (!ok) return
    picked.forEach((g) => removeGroup(g.id, by))
    setSel([]); setMsg({ type: 'ok', text: `${picked.length} container sudah dihapus.` })
  }
  const schedule = async () => {
    if (date <= today()) return setMsg({ type: 'err', text: 'Pilih tanggal setelah hari ini. Untuk hapus sekarang, klik Hapus sekarang.' })
    const ok = await confirm({
      title: 'Jadwalkan penghapusan?',
      message: `Container ${names} beserta seluruh isinya akan dihapus otomatis pada ${showDate(date)}.`,
      confirmLabel: 'Jadwalkan', danger: true,
    })
    if (!ok) return
    addSchedules(picked.map((g) => ({ kind: 'container', groupId: g.id, label: `Container ${g.container}`, date })), by)
    setSel([]); setMsg({ type: 'ok', text: `${picked.length} container dijadwalkan dihapus pada ${showDate(date)}.` })
  }

  return (
    <>
      <FilterBar fields={GROUP_FIELDS} scope="Container, Buyer, Packing List" value={f} onChange={(v) => { setF(v); setMsg(null) }} onClear={() => setF(G0)} />
      <div className="toolbar wrap">
        <button className="btn danger" disabled={!picked.length} onClick={removeNow}>Hapus sekarang ({picked.length})</button>
        <span className="sep" />
        <label className="inline">Hapus pada tanggal<input type="date" min={tomorrow()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <button className="btn" disabled={!picked.length || !date} onClick={schedule}>Jadwalkan hapus ({picked.length})</button>
        {msg && <span className={'msg ' + msg.type}>{msg.text}</span>}
      </div>
      {!shown.length ? <div className="empty">Tidak ada packing list.</div> : (
        <div className="tablewrap">
          <table className="grid">
            <thead><tr>
              <th><input type="checkbox" className="chk" checked={picked.length === shown.length} onChange={toggleAll} title="Pilih semua" /></th>
              <th>Container</th><th>Buyer</th><th>Packing List No</th><th>Tanggal Upload</th><th>Baris</th><th>Terhapus pada</th>
            </tr></thead>
            <tbody>
              {shown.map((g) => (
                <tr key={g.id} className={sel.includes(g.id) ? 'picked' : ''}>
                  <td><input type="checkbox" className="chk" checked={sel.includes(g.id)} onChange={() => toggle(g.id)} /></td>
                  <td>{g.container}</td><td>{g.buyer}</td><td>{g.packingListNo}</td><td>{showDate(g.addedAt)}</td><td>{countOf(g.id)}</td><td>{when(g)}</td>
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
