import { useState } from 'react'
import FilterBar, { ITEM_FIELDS } from '../../components/FilterBar.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useConfirm } from '../../components/ConfirmDialog.jsx'
import { useData } from '../../context/DataContext.jsx'
import { filterRows } from '../../utils/filter.js'
import { showDate, today, tomorrow } from '../../utils/date.js'

const I0 = { so: '', soItem: '', productCode: '' }

export default function ByRows({ by }) {
  const { rows, removeRows, addSchedules } = useData()
  const { confirm, dialog } = useConfirm()
  const [f, setF] = useState(I0)
  const [selected, setSelected] = useState([])
  const [date, setDate] = useState('')
  const [msg, setMsg] = useState(null)

  const noFilter = !f.so && !f.soItem && !f.productCode
  const shown = noFilter ? [] : filterRows(rows, f)
  const picked = selected.filter((id) => shown.some((r) => r.id === id))
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const toggleAll = () => setSelected(picked.length === shown.length ? [] : shown.map((r) => r.id))

  const removeNow = async () => {
    const ok = await confirm({
      title: 'Hapus baris terpilih?',
      message: `${picked.length} baris akan dihapus permanen dan tidak bisa dikembalikan.`,
      confirmLabel: 'Hapus', danger: true,
    })
    if (!ok) return
    removeRows(picked, by)
    setSelected([]); setMsg({ type: 'ok', text: `${picked.length} baris sudah dihapus.` })
  }
  const schedule = async () => {
    if (date <= today()) return setMsg({ type: 'err', text: 'Pilih tanggal setelah hari ini. Untuk hapus sekarang, klik Hapus sekarang.' })
    const bySo = new Map()
    rows.filter((r) => picked.includes(r.id)).forEach((r) => bySo.set(r.so, [...(bySo.get(r.so) || []), r.id]))
    const ok = await confirm({
      title: 'Jadwalkan penghapusan?',
      message: `${picked.length} baris (SO ${[...bySo.keys()].join(', ')}) akan dihapus otomatis pada ${showDate(date)}.`,
      confirmLabel: 'Jadwalkan', danger: true,
    })
    if (!ok) return
    addSchedules([...bySo].map(([so, ids]) => ({ kind: 'so', label: `SO ${so} (${ids.length} baris)`, rowIds: ids, date })), by)
    setSelected([]); setMsg({ type: 'ok', text: `${picked.length} baris dijadwalkan dihapus pada ${showDate(date)}.` })
  }

  return (
    <>
      <FilterBar fields={ITEM_FIELDS} value={f} onChange={(v) => { setF(v); setMsg(null) }} onClear={() => { setF(I0); setSelected([]) }} />
      <div className="toolbar wrap">
        <button className="btn danger" disabled={!picked.length} onClick={removeNow}>Hapus sekarang ({picked.length})</button>
        <span className="sep" />
        <label className="inline">Hapus pada tanggal<input type="date" min={tomorrow()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <button className="btn" disabled={!picked.length || !date} onClick={schedule}>Jadwalkan hapus ({picked.length})</button>
        {msg && <span className={'msg ' + msg.type}>{msg.text}</span>}
      </div>
      {noFilter
        ? <div className="empty">Ketik nomor SO, SO Item, atau Product Code, lalu centang baris yang mau dihapus.</div>
        : <DataTable rows={shown} selectable selected={picked} onToggle={toggle} onToggleAll={toggleAll} />}
      {dialog}
    </>
  )
}
