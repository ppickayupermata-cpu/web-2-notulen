import { useState, useRef } from 'react'
import FilterBar, { GROUP_FIELDS, ITEM_FIELDS } from '../components/FilterBar.jsx'
import GroupList from '../components/GroupList.jsx'
import DataTable from '../components/DataTable.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { useData } from '../context/DataContext.jsx'
import { filterGroups, filterRows } from '../utils/filter.js'
import { PencilLine, ArrowLeft, Eye, Trash2 } from 'lucide-react'
import InputData from './InputData.jsx'
import Notulen from '../components/Notulen.jsx'
import { ROLES } from '../config.js'

const G0 = { container: '', buyer: '' }
const I0 = { so: '', soItem: '', productCode: '' }

export default function Monitoring({ role, by }) {
  const { rows, groups, removeGroup, updateGroup, applyChanges } = useData()
  const { confirm, dialog } = useConfirm()
  const [f, setF] = useState(G0)
  const [fi, setFi] = useState(I0)
  const [openId, setOpenId] = useState(null)
  const [msg, setMsg] = useState('')
  const [inputId, setInputId] = useState(null)
  const [nt, setNt] = useState(false)
  const calcRef = useRef(null) // fungsi hitung rumus dari tabel, dipakai notulen
  const canDelete = ROLES[role].remove
  const open = groups.find((g) => g.id === openId)

  const del = async (g) => {
    const n = rows.filter((r) => r.groupId === g.id).length
    const ok = await confirm({
      title: 'Hapus packing list?',
      message: `Container ${g.container} (Buyer ${g.buyer || '-'}) beserta ${n} baris di dalamnya akan dihapus permanen.`,
      confirmLabel: 'Hapus', danger: true,
    })
    if (!ok) return
    removeGroup(g.id, by)
    setMsg(`Container ${g.container} sudah dihapus.`)
  }

  if (inputId) return <InputData role={role} groupId={inputId} onBack={() => setInputId(null)} />

  // ---- Isi tabel satu parent group ----
  if (open) {
    const shown = filterRows(rows.filter((r) => r.groupId === open.id), fi)
    return (
      <>
        <div className="toolbar">
          <button className="btn" onClick={() => { setOpenId(null); setFi(I0) }}><ArrowLeft size={15} /> Kembali</button>
          <h2 style={{ margin: 0 }}>Container {open.container} <small>Buyer {open.buyer || '-'}</small></h2>
        </div>
        <FilterBar fields={ITEM_FIELDS} value={fi} onChange={setFi} onClear={() => setFi(I0)} />
        <div className="count">{shown.length} baris</div>
        <DataTable fileName={`Container-${open.container}`} rows={shown} onNotulen={(c) => { calcRef.current = c; setNt(true) }} onPack={ROLES[role].packing ? (r) => applyChanges({ [r.id]: { packed: r.packed ? '' : '1' } }) : undefined} />
        {nt && <Notulen calc={calcRef.current} group={open} rows={rows.filter((r) => r.groupId === open.id)} onClose={() => setNt(false)} />}
      </>
    )
  }

  // ---- Daftar parent group ----
  const shown = filterGroups(groups, f)
  return (
    <>
      <h2>Monitoring</h2>
      <FilterBar fields={GROUP_FIELDS} value={f} onChange={(v) => { setF(v); setMsg('') }} onClear={() => setF(G0)} />
      <div className="count">{shown.length} packing list {msg && <span className="msg ok"> · {msg}</span>}</div>
      <GroupList
        groups={shown} rows={rows} canEdit={canDelete} onSave={updateGroup}
        empty={groups.length ? 'Tidak ada packing list yang cocok.' : 'Belum ada data. Upload file Excel di menu Upload Excel.'}
        actions={(g) => (
          <>
            {ROLES[role].edit.length > 0 && <button className="btn sm primary" onClick={() => setInputId(g.id)}><PencilLine size={14} /> Input</button>}
            <button className="btn sm" onClick={() => setOpenId(g.id)}><Eye size={14} /> View</button>
            {canDelete && <button className="btn sm danger" onClick={() => del(g)}><Trash2 size={14} /> Delete</button>}
          </>
        )}
      />
      {dialog}
    </>
  )
}
