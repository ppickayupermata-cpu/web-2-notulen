import { useState, useRef } from 'react'
import FilterBar, { GROUP_FIELDS, ITEM_FIELDS } from '../components/FilterBar.jsx'
import GroupList from '../components/GroupList.jsx'
import DataTable from '../components/DataTable.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { useData } from '../context/DataContext.jsx'
import { filterGroups, filterRows } from '../utils/filter.js'
import { ROLES } from '../config.js'
import Notulen from '../components/Notulen.jsx'
import { Undo2, Save, X, ArrowLeft, Pencil } from 'lucide-react'

const G0 = { container: '', buyer: '' }
const I0 = { so: '', soItem: '', productCode: '' }

export default function InputData({ role, groupId, onBack }) {
  const { rows, groups, applyChanges } = useData()
  const editable = ROLES[role].edit
  const { confirm, dialog } = useConfirm()
  const [f, setF] = useState(G0)              // cari container & buyer (daftar)
  const [fi, setFi] = useState(I0)            // cari SO, SO item, product code (di dalam container)
  const [openId, setOpenId] = useState(groupId || null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})      // { idBaris: { kolom: nilai } }
  const [history, setHistory] = useState([])  // tumpukan draft sebelumnya untuk Undo
  const [msg, setMsg] = useState('')
  const [nt, setNt] = useState(false)
  const calcRef = useRef(null) // fungsi hitung rumus dari tabel, dipakai notulen

  const open = groups.find((g) => g.id === openId)
  const changed = Object.keys(draft).length
  const getValue = (r, k) => draft[r.id]?.[k] ?? r[k]

  const change = (id, k, v) => {
    setHistory((h) => [...h, draft])
    setDraft((d) => ({ ...d, [id]: { ...d[id], [k]: v } }))
    setMsg('')
  }
  const undo = () => {
    if (!history.length) return
    setDraft(history[history.length - 1])
    setHistory((h) => h.slice(0, -1))
  }
  const reset = () => { setDraft({}); setHistory([]); setEditing(false) }
  const submit = async () => {
    if (!changed) return
    const n = changed
    if (await applyChanges(draft)) { setMsg(`Tersimpan: ${n} baris diperbarui.`); reset() }
  }
  const cancel = async () => {
    if (!changed) return reset()
    const ok = await confirm({ title: 'Batalkan perubahan?', message: `${changed} baris yang sudah diisi akan dibuang.`, confirmLabel: 'Buang perubahan', danger: true })
    if (ok) reset()
  }
  const back = async () => {
    if (changed) {
      const ok = await confirm({ title: 'Keluar tanpa menyimpan?', message: `${changed} baris yang sudah diisi belum di-Submit dan akan dibuang.`, confirmLabel: 'Buang perubahan', danger: true })
      if (!ok) return
    }
    reset(); onBack ? onBack() : setOpenId(null); setFi(I0); setMsg('')
  }

  // ---- Isi satu container: edit di sini ----
  if (open) {
    const shown = filterRows(rows.filter((r) => r.groupId === open.id), fi)
    return (
      <>
        <div className="toolbar">
          <button className="btn" onClick={back}><ArrowLeft size={15} /> Kembali</button>
          <h2 style={{ margin: 0 }}>Input Data · Container {open.container} <small>Buyer {open.buyer || '-'} · kolom yang bisa diisi: {editable.join(', ').toUpperCase()}</small></h2>
        </div>
        <FilterBar fields={ITEM_FIELDS} value={fi} onChange={setFi} onClear={() => setFi(I0)} />
        <div className="toolbar">
          {!editing ? (
            <button className="btn primary" disabled={!shown.length} onClick={() => setEditing(true)}><Pencil size={15} /> Edit</button>
          ) : (
            <>
              <button className="btn" onClick={undo} disabled={!history.length}><Undo2 size={15} /> Undo</button>
              <button className="btn primary" onClick={submit} disabled={!changed}><Save size={15} /> Submit ({changed})</button>
              <button className="btn" onClick={cancel}><X size={15} /> Batal</button>
            </>
          )}
          {msg && <span className="msg ok">{msg}</span>}
          {editing && <span className="hint">Isi sel kuning (Enter/panah bawah pindah baris), lalu klik Submit.</span>}
        </div>
        <DataTable fileName={`Container-${open.container}`} rows={shown} manage={ROLES[role].upload} groupId={open.id} editable={editable} editing={editing} getValue={getValue} onChange={change} onNotulen={(c) => { calcRef.current = c; setNt(true) }} onPack={ROLES[role].packing ? (r) => applyChanges({ [r.id]: { packed: r.packed ? '' : '1' } }) : undefined} />
        {nt && <Notulen calc={calcRef.current} group={open} rows={rows.filter((r) => r.groupId === open.id)} onClose={() => setNt(false)} />}
        {dialog}
      </>
    )
  }

  // ---- Daftar container: cari Container & Buyer ----
  const shown = filterGroups(groups, f)
  return (
    <>
      <h2>Input Data</h2>
      <FilterBar fields={GROUP_FIELDS} value={f} onChange={setF} onClear={() => setF(G0)} />
      <div className="count">{shown.length} packing list {msg && <span className="msg ok"> · {msg}</span>}</div>
      <GroupList
        groups={shown} rows={rows}
        empty={groups.length ? 'Tidak ada packing list yang cocok.' : 'Belum ada data. PPIC perlu upload file Excel dulu.'}
        actions={(g) => <button className="btn sm primary" onClick={() => setOpenId(g.id)}>Input</button>}
      />
      {dialog}
    </>
  )
}
