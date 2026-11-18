import { useState } from 'react'
import { ArrowLeft, Eye, Undo2, PackageCheck } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import FilterBar, { GROUP_FIELDS } from '../components/FilterBar.jsx'
import DataTable from '../components/DataTable.jsx'
import { filterGroups } from '../utils/filter.js'
import { colsFor } from '../config.js'
import { kunciSo } from '../utils/barangJadi.js'

const G0 = { container: '', buyer: '' }
const tgl = (v) => (v ? new Date(v).toLocaleString('id-ID') : '-')

// Tab Barang Jadi: daftar per container berisi SO yang sudah dipindahkan dari Monitoring. Bisa dilihat dan dikembalikan (semua atau per SO).
export default function BarangJadi() {
  const { finished, finishedRows, unfinishRows } = useData()
  const { confirm, dialog } = useConfirm()
  const [f, setF] = useState(() => { let q = ''; try { q = sessionStorage.getItem('pl_q') || ''; sessionStorage.removeItem('pl_q') } catch { /* mode privat */ } return { ...G0, q } }), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false)
  const [view, setView] = useState(null)   // { group, rows }
  const shown = filterGroups(finished || [], f)

  const buka = async (container) => {
    setBusy(true); const d = await finishedRows(container); setBusy(false)
    if (!d) { setView(null); return setMsg({ type: 'err', text: 'Isi Barang Jadi tidak bisa dimuat (mungkin sudah dikembalikan).' }) }
    setView({ group: d.group, rows: d.rows.map((r) => ({ ...r, groupId: 'fg:' + container })) }); setMsg(null)
  }
  const kembalikan = async (container, ids, judul, so) => {
    const n = ids.length
    const ok = await confirm({ title: 'Kembalikan ke Monitoring?', message: `${judul}: ${n} baris dikembalikan ke Container ${container} di Monitoring (lengkap dengan isian dan tag packing). Bila container itu sudah tidak ada, dibuat lagi.`, confirmLabel: 'Kembalikan' })
    if (!ok) return
    setBusy(true); const done = await unfinishRows(container, ids); setBusy(false)
    if (!done) return setMsg({ type: 'err', text: 'Gagal mengembalikan. Tidak ada yang diubah, coba lagi.' })
    setMsg({ type: 'ok', text: `${judul} (${n} baris) sudah kembali ke Monitoring.` })
    if (view) { const d = await finishedRows(container); d?.rows?.length ? setView({ group: d.group, rows: d.rows.map((r) => ({ ...r, groupId: 'fg:' + container })) }) : setView(null) }
  }
  const semua = async (container) => { const d = await finishedRows(container); if (d?.rows?.length) kembalikan(container, d.rows.map((r) => r.id), `Semua SO Container ${container}`) }

  if (view) {
    const g = view.group
    const soActions = [{ key: 'back', label: 'Kembalikan ke Monitoring', icon: <Undo2 size={14} />, title: 'Kembalikan semua baris SO ini ke Monitoring', onClick: (so) => kembalikan(g.container, view.rows.filter((r) => kunciSo(r) === so).map((r) => r.id), `SO ${so}`) }]
    return (
      <>
        <div className="toolbar wrap">
          <button className="btn" onClick={() => { setView(null); setMsg(null) }}><ArrowLeft size={15} /> Kembali</button>
          <h2 style={{ margin: 0 }}>Barang Jadi · Container {g.container} <small>Buyer {g.buyer || '-'} · hanya lihat</small></h2>
          <span className="spacer" />
          <button className="btn primary" disabled={busy} onClick={() => kembalikan(g.container, view.rows.map((r) => r.id), `Semua SO Container ${g.container}`)}><Undo2 size={15} /> Kembalikan semua</button>
        </div>
        {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
        <div className="count">{view.rows.length} baris</div>
        <DataTable fileName={`BarangJadi-${g.container}`} cols={colsFor(g)} soActions={soActions} groupId={'fg:' + g.container} rows={view.rows} />
        {dialog}
      </>
    )
  }

  return (
    <>
      <p className="hint">SO yang sudah selesai disimpan di sini dari tombol <b>Simpan ke list Barang Jadi</b> pada tabel Input. Tidak ikut terhapus otomatis, dan bisa dikembalikan kapan saja.</p>
      <FilterBar fields={GROUP_FIELDS} scope="Container, Buyer, Packing List" value={f} onChange={(v) => { setF(v); setMsg(null) }} onClear={() => setF(G0)} />
      <div className="count">{shown.length} container di Barang Jadi</div>
      {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
      {!shown.length ? <div className="empty">{finished?.length ? 'Tidak ada container yang cocok.' : 'Belum ada barang jadi. Buka Input pada sebuah container, lalu klik Simpan ke list Barang Jadi di header SO.'}</div> : (
        <div className="tablewrap">
          <table className="grid">
            <thead><tr><th>Container</th><th>Buyer</th><th>Packing List No</th><th>Ship Date</th><th>Status</th><th>SO</th><th>Baris</th><th>Terakhir dipindah</th><th>Aksi</th></tr></thead>
            <tbody>{shown.map((g) => (
              <tr key={g.container}>
                <td>{g.container}{g.kind === 'coads' && <span className="chip-st kind-coads">CO ADS</span>}</td><td>{g.buyer}</td><td>{g.packingListNo}</td><td>{g.shipDate}</td><td>{g.status}</td><td>{g.soCount}</td><td>{g.count}</td><td>{tgl(g.movedAt)}</td>
                <td className="actions">
                  <button className="btn sm" disabled={busy} onClick={() => buka(g.container)}><Eye size={14} /> Lihat isi</button>
                  <button className="btn sm" disabled={busy} onClick={() => semua(g.container)}><PackageCheck size={14} /> Kembalikan semua</button>
                </td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
      {dialog}
    </>
  )
}
