import { useState } from 'react'
import { ArrowLeft, Eye, Info, ArchiveRestore, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import FilterBar, { GROUP_FIELDS } from '../components/FilterBar.jsx'
import DataTable from '../components/DataTable.jsx'
import InfoCard from '../components/InfoCard.jsx'
import { filterGroups } from '../utils/filter.js'
import { colsFor } from '../config.js'

const KIND = { ganti: 'Sebelum diganti', hapus: 'Sebelum dihapus', gabung: 'Sebelum digabung', pindah: 'Sebelum dipindah ke Barang Jadi', 'sebelum-pulih': 'Sebelum pemulihan' }
const G0 = { container: '', buyer: '' }

// Halaman Data Pulihan: daftar file (cadangan container) yang bisa dipulihkan, tampilannya sama seperti Monitoring.
// "Pindahkan ke Monitoring" menjadikannya container aktif lagi; "Lihat isi" membuka barisnya (hanya lihat).
export default function DataPulihan({ embedded = false }) {
  const { backups, groups, rows, backupInfo, restoreBackup, dropBackup } = useData()
  const { confirm, dialog } = useConfirm()
  const [f, setF] = useState(G0), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false)
  const [info, setInfo] = useState(null)       // id cadangan untuk kartu info
  const [view, setView] = useState(null)       // { b, rows } isi cadangan yang sedang dilihat

  // cadangan dibentuk seperti "group" agar bisa memakai filter yang sama dengan Monitoring
  const list = (backups || []).map((b) => ({ ...b, id: b.id, container: b.container, buyer: b.group?.buyer || '', packingListNo: b.group?.packingListNo || '', shipDate: b.group?.shipDate || '', status: b.group?.status || '' }))
  const shown = filterGroups(list, f)
  const nowOf = (c) => { const g = groups.find((x) => x.container === c); return g ? rows.filter((r) => r.groupId === g.id).length : null }

  const pindah = async (b) => {
    const n = nowOf(b.container)
    const ok = await confirm({
      title: 'Pindahkan ke Monitoring?',
      message: n == null
        ? `Container ${b.container} (${b.count} baris, lengkap dengan isian dan tag packing) dikembalikan ke Monitoring. Cadangan ini tetap tersimpan.`
        : `Container ${b.container} sudah ada di Monitoring (${n} baris). Isinya dicadangkan dulu, lalu diganti dengan data ini (${b.count} baris). Cadangan ini tetap tersimpan.`,
      confirmLabel: 'Pindahkan', danger: n != null,
    })
    if (!ok) return
    setBusy(true); const done = await restoreBackup(b.id); setBusy(false)
    setMsg(done ? { type: 'ok', text: `Container ${b.container} sudah ada di Monitoring (${b.count} baris).` } : { type: 'err', text: 'Gagal memindahkan. Cadangan masih tersimpan, coba lagi.' })
  }
  const buang = async (b) => { if (await confirm({ title: 'Buang cadangan ini?', message: `Cadangan Container ${b.container} (${b.count} baris) dihapus permanen dan tidak bisa dipulihkan lagi.`, confirmLabel: 'Buang', danger: true })) dropBackup(b.id) }
  const lihat = async (b) => {
    setBusy(true); const d = await backupInfo(b.id); setBusy(false)
    if (!d) return setMsg({ type: 'err', text: 'Isi cadangan tidak bisa dimuat.' })
    setView({ b, rows: d.rows.map((r, i) => ({ ...r, id: `p:${b.id}:${i}`, groupId: b.id })) })
  }

  if (view) {
    const b = view.b
    return (
      <>
        <div className="toolbar wrap">
          <button className="btn" onClick={() => setView(null)}><ArrowLeft size={15} /> Kembali</button>
          <h2 style={{ margin: 0 }}>Container {b.container} <small>Buyer {b.buyer || '-'} · data pulihan, hanya lihat</small></h2>
          <span className="spacer" />
          <button className="btn" onClick={() => setInfo(b.id)}><Info size={15} /> Lihat info</button>
          <button className="btn primary" disabled={busy} onClick={() => pindah(b)}><ArchiveRestore size={15} /> Pindahkan ke Monitoring</button>
        </div>
        {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
        <div className="count">{view.rows.length} baris</div>
        <DataTable fileName={`Pulihan-${b.container}`} cols={colsFor(b.group)} rows={view.rows} />
        {info && <InfoCard type="backup" id={info} onClose={() => setInfo(null)} />}
        {dialog}
      </>
    )
  }

  return (
    <>
      {!embedded && <div className="toolbar"><h2 style={{ margin: 0 }}>Data Pulihan</h2></div>}
      <p className="hint">File yang bisa dipulihkan. Cadangan dibuat otomatis sebelum container diganti, dihapus, atau digabung. Pindahkan ke Monitoring untuk memakainya lagi.</p>
      <FilterBar fields={GROUP_FIELDS} value={f} onChange={(v) => { setF(v); setMsg(null) }} onClear={() => setF(G0)} />
      <div className="count">{shown.length} file pulihan</div>
      {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
      {!shown.length ? <div className="empty">{list.length ? 'Tidak ada file yang cocok.' : 'Belum ada file pulihan. Cadangan muncul di sini otomatis setelah ada container yang diganti, dihapus, atau digabung.'}</div> : (
        <div className="tablewrap">
          <table className="grid">
            <thead><tr><th>Container</th><th>Buyer</th><th>Packing List No</th><th>Ship Date</th><th>Status</th><th>Baris</th><th>Jenis</th><th>Dicadangkan</th><th>Di Monitoring</th><th>Aksi</th></tr></thead>
            <tbody>{shown.map((b) => { const n = nowOf(b.container); return (
              <tr key={b.id}>
                <td>{b.container}{b.group?.kind === 'coads' && <span className="chip-st kind-coads">CO ADS</span>}</td><td>{b.buyer}</td><td>{b.packingListNo}</td><td>{b.shipDate}</td><td>{b.status}</td><td>{b.count}</td>
                <td>{KIND[b.kind] || 'Cadangan'}</td><td>{new Date(b.at).toLocaleString('id-ID')}</td><td>{n == null ? 'Tidak ada' : `Ada (${n} baris)`}</td>
                <td className="actions">
                  <button className="btn sm" disabled={busy} onClick={() => lihat(b)}><Eye size={14} /> Lihat isi</button>
                  <button className="btn sm" onClick={() => setInfo(b.id)}><Info size={14} /> Lihat info</button>
                  <button className="btn sm primary" disabled={busy} onClick={() => pindah(b)}><ArchiveRestore size={14} /> Pindahkan ke Monitoring</button>
                  <button className="btn sm danger" onClick={() => buang(b)}><Trash2 size={14} /> Buang</button>
                </td>
              </tr>) })}</tbody>
          </table>
        </div>
      )}
      {info && <InfoCard type="backup" id={info} onClose={() => setInfo(null)} />}
      {dialog}
    </>
  )
}
