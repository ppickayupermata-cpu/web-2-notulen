import { useState } from 'react'
import { FileSpreadsheet, FileJson, Archive, RotateCcw, Trash2, ShieldCheck } from 'lucide-react'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { useData } from '../context/DataContext.jsx'
import { bangunExcelSemua, unduhBlob, stamp } from '../utils/exportAll.js'

const KIND = { harian: 'Otomatis harian', manual: 'Manual', 'sebelum-pulih': 'Sebelum pemulihan' }
const XLSX_T = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export default function Cadangan() {
  const { groups, rows, schedules, settings, snapshots, snapshotNow, dropSnapshot, restoreSnapshot } = useData()
  const { confirm, dialog } = useConfirm()
  const [busy, setBusy] = useState(''), [msg, setMsg] = useState(null)
  const jalan = async (kode, fn, ok) => { setBusy(kode); setMsg(null); try { const r = await fn(); setMsg(r === false ? { type: 'err', text: 'Gagal. Coba lagi.' } : { type: 'ok', text: ok }) } catch (e) { setMsg({ type: 'err', text: 'Gagal: ' + (e.message || e) }) } setBusy('') }

  const unduhExcel = () => jalan('xlsx', async () => unduhBlob(await bangunExcelSemua({ groups, rows, extra: settings.cols || [] }), `Semua-Data-Packing-${stamp()}.xlsx`, XLSX_T), `${groups.length} container (${rows.length} baris) diunduh ke Excel.`)
  const unduhJson = () => jalan('json', async () => unduhBlob(JSON.stringify({ app: 'monitoring-packing-list', dibuat: new Date().toISOString(), groups, rows, schedules, settings }), `Cadangan-Packing-${stamp()}.json`, 'application/json'), 'File cadangan (.json) diunduh. Simpan di tempat lain, mis. Google Drive atau flashdisk.')
  const buat = () => jalan('now', snapshotNow, 'Cadangan baru dibuat di server.')
  const pulih = async (s) => {
    const ok = await confirm({ title: 'Pulihkan ke cadangan ini?', message: `SEMUA data (${s.groups} container, ${s.rows} baris, jadwal hapus) akan diganti dengan isi cadangan ${new Date(s.at).toLocaleString('id-ID')}. Perubahan sesudah itu hilang dari tampilan, dan absensi QR milik container yang tidak ada di cadangan ikut terhapus. Keadaan sekarang disimpan otomatis sebagai cadangan "Sebelum pemulihan" sehingga pemulihan ini bisa dibatalkan.`, confirmLabel: 'Pulihkan', danger: true })
    if (ok) jalan('r' + s.id, () => restoreSnapshot(s.id), 'Data dipulihkan. Keadaan sebelumnya tersimpan sebagai cadangan "Sebelum pemulihan".')
  }
  const buang = async (s) => { if (await confirm({ title: 'Buang cadangan ini?', message: `Cadangan ${new Date(s.at).toLocaleString('id-ID')} dihapus permanen.`, confirmLabel: 'Buang', danger: true })) jalan('d' + s.id, () => dropSnapshot(s.id), 'Cadangan dibuang.') }

  return (
    <>
      <h2>Cadangan Data</h2>
      {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Unduh semua data</h3>
        <p className="hint">{groups.length} container · {rows.length} baris saat ini. Unduh berkala dan simpan di tempat lain (Google Drive, flashdisk) agar data tidak hanya bergantung pada satu database.</p>
        <div className="toolbar wrap">
          <button className="btn primary" disabled={!groups.length || !!busy} onClick={unduhExcel}><FileSpreadsheet size={15} /> {busy === 'xlsx' ? 'Menyusun…' : 'Unduh Excel (semua container)'}</button>
          <button className="btn" disabled={!groups.length || !!busy} onClick={unduhJson}><FileJson size={15} /> Unduh cadangan (.json)</button>
        </div>
      </div>
      <div className="panel">
        <h3 style={{ marginTop: 0 }}><ShieldCheck size={17} style={{ verticalAlign: '-3px' }} /> Cadangan otomatis di server</h3>
        <p className="hint">Dibuat otomatis tiap hari (sebelum pembersihan data lama) dan sebelum pemulihan. 14 terakhir disimpan di database yang sama dengan data aplikasi.</p>
        <div className="toolbar wrap"><button className="btn" disabled={!!busy} onClick={buat}><Archive size={15} /> Buat cadangan sekarang</button></div>
        {!snapshots?.length ? <div className="empty">Belum ada cadangan. Cadangan pertama dibuat otomatis saat pembersihan harian berjalan, atau klik tombol di atas.</div> : (
          <div className="tablewrap" style={{ maxHeight: 'none' }}>
            <table className="grid">
              <thead><tr><th>Waktu</th><th>Jenis</th><th>Container</th><th>Baris</th><th>Oleh</th><th>Aksi</th></tr></thead>
              <tbody>{snapshots.map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.at).toLocaleString('id-ID')}</td><td>{KIND[s.kind] || s.kind}</td><td>{s.groups}</td><td>{s.rows}</td><td>{s.by || 'Sistem'}</td>
                  <td className="actions">
                    <button className="btn sm" disabled={!!busy} onClick={() => pulih(s)}><RotateCcw size={14} /> Pulihkan</button>
                    <button className="btn sm danger" disabled={!!busy} onClick={() => buang(s)}><Trash2 size={14} /> Buang</button>
                  </td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </div>
      {dialog}
    </>
  )
}
