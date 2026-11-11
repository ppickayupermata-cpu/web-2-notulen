import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { ringkas } from '../utils/ringkasBackup.js'

const KIND = { ganti: 'Sebelum diganti upload baru', hapus: 'Sebelum dihapus', gabung: 'Sebelum digabung / dipindah', pindah: 'Sebelum dipindah ke Barang Jadi', 'sebelum-pulih': 'Sebelum pemulihan', harian: 'Otomatis harian', manual: 'Manual' }
const tgl = (v) => (v ? new Date(v).toLocaleString('id-ID') : '-')
const Baris = ({ k, v }) => <div className="ir"><span>{k}</span><b>{v === '' || v == null ? '-' : v}</b></div>

// Kartu info lengkap: type='backup' (cadangan satu container) atau 'snapshot' (cadangan penuh semua container)
export default function InfoCard({ type, id, onClose }) {
  const { backupInfo, snapshotInfo, groups, rows: now } = useData()
  const [d, setD] = useState(null), [err, setErr] = useState('')
  useEffect(() => {
    let off = false
    ;(async () => { const r = await (type === 'snapshot' ? snapshotInfo : backupInfo)(id); if (off) return; r ? setD(r) : setErr('Info tidak bisa dimuat (cadangan mungkin sudah dibuang).') })()
    return () => { off = true }
  }, [type, id])
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [])

  let body = <div className="empty">{err || 'Memuat info...'}</div>
  if (d && type === 'backup') {
    const r = ringkas(d.rows), g = d.group || {}, ada = groups.find((x) => x.container === d.container), nAda = ada ? now.filter((x) => x.groupId === ada.id).length : 0
    const pct = (n) => (r.total ? `${n} dari ${r.total} baris (${Math.round((n / r.total) * 100)}%)` : '0')
    body = (
      <>
        <h4>Identitas file</h4>
        <div className="igrid"><Baris k="Container" v={d.container} /><Baris k="Buyer" v={g.buyer} /><Baris k="Packing List No" v={g.packingListNo} /><Baris k="Ship Date" v={g.shipDate} /><Baris k="Status" v={g.status} /><Baris k="Revisi" v={g.revision} /><Baris k="Jenis container" v={g.kind === 'coads' ? 'Packlist CO ADS' : 'Biasa'} /><Baris k="Tanggal upload asli" v={g.addedAt} /></div>
        <h4>Tentang cadangan ini</h4>
        <div className="igrid"><Baris k="Jenis" v={KIND[d.kind] || 'Cadangan'} /><Baris k="Dibuat" v={tgl(d.at)} /><Baris k="Oleh" v={d.by || 'Sistem'} /><Baris k="Di Monitoring sekarang" v={ada ? `Ada, ${nAda} baris${nAda !== r.total ? ` (cadangan: ${r.total})` : ' (sama)'}` : 'Tidak ada (sudah dihapus / belum dipulihkan)'} /></div>
        <h4>Isi data</h4>
        <div className="igrid"><Baris k="Jumlah baris" v={r.total} /><Baris k="Jumlah SO" v={r.so.length} /><Baris k="Jumlah PO" v={r.po} /><Baris k="Total Qty" v={r.qty} /><Baris k="Sudah dipacking" v={pct(r.packed)} />
          <Baris k="AREA terisi" v={pct(r.area)} /><Baris k="TARGET terisi" v={pct(r.target)} /><Baris k="KETERANGAN terisi" v={pct(r.ket)} /><Baris k="TGL PENGIRIMAN terisi" v={pct(r.kirim)} />
          {(r.old > 0 || r.new > 0) && <Baris k="Label" v={`old ${r.old} · new ${r.new}`} />}</div>
        {r.perArea.length > 0 && <><h4>Per AREA</h4><div className="chips">{r.perArea.map((a) => <span key={a.nama} className="sc">{a.nama} {a.n}</span>)}</div></>}
        <h4>Daftar SO ({r.so.length})</h4>
        <div className="chips">{r.so.slice(0, 80).map((s) => <span key={s.nama} className="sc">SO {s.nama} · {s.n} baris</span>)}{r.so.length > 80 && <span className="hint">+{r.so.length - 80} SO lainnya</span>}</div>
      </>
    )
  } else if (d) {
    const tot = d.groups.reduce((s, g) => s + g.n, 0)
    body = (
      <>
        <h4>Tentang cadangan ini</h4>
        <div className="igrid"><Baris k="Jenis" v={KIND[d.kind] || d.kind} /><Baris k="Dibuat" v={tgl(d.at)} /><Baris k="Oleh" v={d.by || 'Sistem'} /><Baris k="Container" v={d.groups.length} /><Baris k="Total baris" v={tot} /><Baris k="Jadwal hapus" v={d.jadwal} /></div>
        <h4>Isi per container</h4>
        <div className="tablewrap" style={{ maxHeight: 320 }}><table className="grid"><thead><tr><th>Container</th><th>Buyer</th><th>Packing List No</th><th>Tgl upload</th><th>Baris</th><th>Terisi</th><th>Packing</th></tr></thead>
          <tbody>{d.groups.map((g, i) => <tr key={i}><td>{g.container}</td><td>{g.buyer}</td><td>{g.packingListNo}</td><td>{g.addedAt}</td><td>{g.n}</td><td>{g.isi}</td><td>{g.packed}</td></tr>)}</tbody></table></div>
      </>
    )
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide infocard" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="mh"><h3>Info {type === 'snapshot' ? 'cadangan penuh' : `cadangan Container ${d?.container || ''}`}</h3><button className="btn sm" onClick={onClose} aria-label="Tutup"><X size={15} /></button></div>
        {body}
      </div>
    </div>
  )
}
