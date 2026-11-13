import { useState, useRef, useEffect } from 'react'
import { useUi } from '../context/UiContext.jsx'
import FilterBar, { GROUP_FIELDS, ITEM_FIELDS, ITEM_FIELDS_COADS } from '../components/FilterBar.jsx'
import GroupList from '../components/GroupList.jsx'
import DataTable from '../components/DataTable.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { useData } from '../context/DataContext.jsx'
import { filterGroups, filterRows } from '../utils/filter.js'
import { PencilLine, ArrowLeft, Radio, Trash2, QrCode, Share2, Merge, ArrowRightLeft, Tag, FileSpreadsheet, Boxes, ArchiveRestore, PackageCheck } from 'lucide-react'
import { colsFor, isCoAds } from '../config.js'
import DataPulihan from './DataPulihan.jsx'
import BarangJadi from './BarangJadi.jsx'
import { useFill } from '../utils/useFill.js'
import NotulenGabungan from '../components/NotulenGabungan.jsx'
import PantauAbsensi from '../components/PantauAbsensi.jsx'
import LiveDialog from '../components/LiveDialog.jsx'
import InputData from './InputData.jsx'
import PindahData from './PindahData.jsx'
import Notulen from '../components/Notulen.jsx'

const G0 = { container: '', buyer: '' }
const I0 = { so: '', soItem: '', productCode: '' }

export default function Monitoring({ by }) {
  const { rows, groups, backups, finished, removeGroup, updateGroup, applyChanges, refresh, clearLabels } = useData()
  useFill()   // hanya tabel yang punya scroll
  const [tab, setTabState] = useState(() => { try { return sessionStorage.getItem('pl_mon_tab') || 'all' } catch { return 'all' } }) // coads | all | pulih
  const setTab = (t) => { setTabState(t); setMsg(''); try { sessionStorage.setItem('pl_mon_tab', t) } catch { /* mode privat */ } }
  const [pa, setPa] = useState(false), [ld, setLd] = useState(null), [ng, setNg] = useState(false) // grup untuk panel Pantau absensi / dialog link live
  const { confirm, dialog } = useConfirm()
  const [f, setF] = useState(G0)
  const [fi, setFi] = useState(I0)
  const [openId, setOpenId] = useState(null)
  const [msg, setMsg] = useState('')
  const [inputId, setInputId] = useState(null), [moveId, setMoveId] = useState(null)
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
    setMsg(`Container ${g.container} sudah dihapus. Cadangan otomatis tersimpan; bisa dipulihkan dari menu Upload Excel atau Cadangan Data.`)
  }

  if (inputId) return <InputData groupId={inputId} onBack={() => setInputId(null)} />
  if (moveId) return <PindahData groupId={moveId} onBack={() => setMoveId(null)} />

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
        <FilterBar fields={isCoAds(open) ? ITEM_FIELDS_COADS : ITEM_FIELDS} scope="isi container ini: SO, PO, produk, AREA, keterangan" value={fi} onChange={setFi} onClear={() => setFi(I0)} />
        <div className="count">{shown.length} baris</div>
        <DataTable fileName={`Container-${open.container}`} cols={colsFor(open)} rows={shown} onNotulen={(c) => { calcRef.current = c; setNt(true) }} onPack={(r) => applyChanges({ [r.id]: { packed: r.packed ? '' : '1', ...(r.packed ? (String(r.area || '').trim().toUpperCase() === 'PACKING' ? { area: '' } : {}) : { area: 'PACKING' }) } })} />
        {nt && <Notulen calc={calcRef.current} group={open} rows={rows.filter((r) => r.groupId === open.id)} onClose={() => setNt(false)} />}
        {ld && <LiveDialog group={ld} onClose={() => setLd(null)} />}
      </>
    )
  }

  // ---- Daftar parent group ----
  const nCo = groups.filter(isCoAds).length
  const daftar = tab === 'coads' ? groups.filter(isCoAds) : groups
  const shown = filterGroups(daftar, f)
  const tabs = (
    <div className="montabs" role="tablist" aria-label="Pilihan tampilan Monitoring">
      <button role="tab" aria-selected={tab === 'coads'} className={tab === 'coads' ? 'on' : ''} onClick={() => setTab('coads')}><FileSpreadsheet size={15} /> Packlist CO ADS <i>{nCo}</i></button>
      <button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}><Boxes size={15} /> All Container <i>{groups.length}</i></button>
      <button role="tab" aria-selected={tab === 'pulih'} className={tab === 'pulih' ? 'on' : ''} onClick={() => setTab('pulih')}><ArchiveRestore size={15} /> Terpulihkan <i>{backups?.length || 0}</i></button>
      <button role="tab" aria-selected={tab === 'barang'} className={tab === 'barang' ? 'on' : ''} onClick={() => setTab('barang')}><PackageCheck size={15} /> Barang Jadi <i>{finished?.length || 0}</i></button>
    </div>
  )
  if (tab === 'barang') return <><div className="toolbar"><h2 style={{ margin: 0 }}>Monitoring</h2></div>{tabs}<BarangJadi /></>
  if (tab === 'pulih') return <><div className="toolbar"><h2 style={{ margin: 0 }}>Monitoring</h2></div>{tabs}<DataPulihan embedded /></>
  return (
    <>
      <div className="toolbar"><h2 style={{ margin: 0 }}>Monitoring</h2><span className="spacer" /><button className="btn" onClick={() => setPa(true)} title="Absensi satu kali untuk semua container, Meeting dimulai / ditutup, dan link live meeting"><QrCode size={15} /> Absensi &amp; Meeting</button>
      <button className="btn" disabled={!groups.length} onClick={() => setNg(true)} title="Gabungkan notulen beberapa container menjadi satu (semua atau custom select)"><Merge size={15} /> Gabungkan notulen</button></div>
      {tabs}
      <FilterBar fields={GROUP_FIELDS} scope="Container, Buyer, Packing List" value={f} onChange={(v) => { setF(v); setMsg('') }} onClear={() => setF(G0)} />
      <div className="count">{shown.length} packing list{tab === 'coads' ? ' CO ADS' : ''} {msg && <span className="msg ok"> · {msg}</span>}</div>
      <GroupList
        groups={shown} rows={rows} canEdit={canDelete} onSave={updateGroup}
        empty={tab === 'coads' && !nCo ? 'Belum ada packing list CO ADS. Upload lewat menu Upload Excel, pilih Upload CO ADS.' : groups.length ? 'Tidak ada packing list yang cocok.' : 'Belum ada data. Upload file Excel di menu Upload Excel.'}
        actions={(g) => (
          <>
            <button className="btn sm primary" onClick={() => setInputId(g.id)}><PencilLine size={14} /> Input</button>
            <button className="btn sm" onClick={() => setOpenId(g.id)} title="Tampilan live (hanya lihat, ter-update otomatis)"><Radio size={14} /> Live</button>
            {groups.length > 1 && <button className="btn sm" onClick={() => setMoveId(g.id)} title="Masukkan data lama dari container ini ke container baru (pilih baris)"><ArrowRightLeft size={14} /> Pindah data</button>}
            {rows.some((r) => r.groupId === g.id && r.label) && <button className="btn sm" onClick={() => clearLabels(g.id)} title="Hapus label OLD / NEW di container ini"><Tag size={14} /> Hapus label</button>}
            {canDelete && <button className="btn sm danger" onClick={() => del(g)}><Trash2 size={14} /> Delete</button>}
          </>
        )}
      />
      {ng && <NotulenGabungan groups={groups} rows={rows} onClose={() => setNg(false)} />}
      {pa && <PantauAbsensi onClose={() => setPa(false)} />}
      {dialog}
    </>
  )
}
