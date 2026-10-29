import { useState, useRef, useEffect } from 'react'
import { useUi } from '../context/UiContext.jsx'
import FilterBar, { GROUP_FIELDS, ITEM_FIELDS } from '../components/FilterBar.jsx'
import GroupList from '../components/GroupList.jsx'
import DataTable from '../components/DataTable.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { useData } from '../context/DataContext.jsx'
import { filterGroups, filterRows } from '../utils/filter.js'
import { PencilLine, ArrowLeft, Radio, Trash2, QrCode, Share2, Merge } from 'lucide-react'
import NotulenGabungan from '../components/NotulenGabungan.jsx'
import PantauAbsensi from '../components/PantauAbsensi.jsx'
import LiveDialog from '../components/LiveDialog.jsx'
import InputData from './InputData.jsx'
import Notulen from '../components/Notulen.jsx'

const G0 = { container: '', buyer: '' }
const I0 = { so: '', soItem: '', productCode: '' }

export default function Monitoring({ by }) {
  const { rows, groups, removeGroup, updateGroup, applyChanges, refresh } = useData()
  const [pa, setPa] = useState(null), [ld, setLd] = useState(null), [ng, setNg] = useState(false) // grup untuk panel Pantau absensi / dialog link live
  const { confirm, dialog } = useConfirm()
  const [f, setF] = useState(G0)
  const [fi, setFi] = useState(I0)
  const [openId, setOpenId] = useState(null)
  const [msg, setMsg] = useState('')
  const [inputId, setInputId] = useState(null)
  const [nt, setNt] = useState(false)
  const { jump, setJump } = useUi()
  useEffect(() => { if (jump) { setInputId(null); setNt(false); setOpenId(jump.groupId); setFi({ ...I0, so: jump.so || '' }); setJump(null) } }, [jump])
  const calcRef = useRef(null) // fungsi hitung rumus dari tabel, dipakai notulen
  const canDelete = true
  const open = groups.find((g) => g.id === openId)
  useEffect(() => { // halaman Live: muat ulang tiap 4 detik (perubahan dari komputer lain langsung terlihat)
    if (!openId) return
    const t = setInterval(() => { if (!document.hidden) refresh() }, 4000); return () => clearInterval(t)
  }, [openId])

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

  if (inputId) return <InputData groupId={inputId} onBack={() => setInputId(null)} />

  // ---- Isi tabel satu parent group ----
  if (open) {
    const shown = filterRows(rows.filter((r) => r.groupId === open.id), fi)
    return (
      <>
        <div className="toolbar">
          <button className="btn" onClick={() => { setOpenId(null); setFi(I0) }}><ArrowLeft size={15} /> Kembali</button>
          <h2 style={{ margin: 0 }}>Container {open.container} <small>Buyer {open.buyer || '-'}</small></h2>
          <span className="live-badge"><Radio size={14} /> LIVE</span><span className="spacer" />
          <button className="btn" onClick={() => setLd(open)}><Share2 size={15} /> Bagikan link live</button>
        </div>
        <FilterBar fields={ITEM_FIELDS} value={fi} onChange={setFi} onClear={() => setFi(I0)} />
        <div className="count">{shown.length} baris</div>
        <DataTable fileName={`Container-${open.container}`} rows={shown} onNotulen={(c) => { calcRef.current = c; setNt(true) }} onPack={(r) => applyChanges({ [r.id]: { packed: r.packed ? '' : '1' } })} />
        {nt && <Notulen calc={calcRef.current} group={open} rows={rows.filter((r) => r.groupId === open.id)} onClose={() => setNt(false)} />}
        {ld && <LiveDialog group={ld} onClose={() => setLd(null)} />}
      </>
    )
  }

  // ---- Daftar parent group ----
  const shown = filterGroups(groups, f)
  return (
    <>
      <div className="toolbar"><h2 style={{ margin: 0 }}>Monitoring</h2><span className="spacer" /><button className="btn" disabled={!groups.length} onClick={() => setNg(true)} title="Gabungkan notulen beberapa container menjadi satu (semua atau custom select)"><Merge size={15} /> Gabungkan notulen</button></div>
      <FilterBar fields={GROUP_FIELDS} value={f} onChange={(v) => { setF(v); setMsg('') }} onClear={() => setF(G0)} />
      <div className="count">{shown.length} packing list {msg && <span className="msg ok"> · {msg}</span>}</div>
      <GroupList
        groups={shown} rows={rows} canEdit={canDelete} onSave={updateGroup}
        empty={groups.length ? 'Tidak ada packing list yang cocok.' : 'Belum ada data. Upload file Excel di menu Upload Excel.'}
        actions={(g) => (
          <>
            <button className="btn sm primary" onClick={() => setInputId(g.id)}><PencilLine size={14} /> Input</button>
            <button className="btn sm" onClick={() => setOpenId(g.id)} title="Tampilan live (hanya lihat, ter-update otomatis)"><Radio size={14} /> Live</button>
            <button className="btn sm" onClick={() => setPa(g)} title="Pantau & konfirmasi absensi, bagikan QR"><QrCode size={14} /> Pantau absensi</button>
            {canDelete && <button className="btn sm danger" onClick={() => del(g)}><Trash2 size={14} /> Delete</button>}
          </>
        )}
      />
      {ng && <NotulenGabungan groups={groups} rows={rows} onClose={() => setNg(false)} />}
      {pa && <PantauAbsensi group={pa} onClose={() => setPa(null)} />}
      {dialog}
    </>
  )
}
