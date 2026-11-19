import { useState } from 'react'
import { Search, Check, X } from 'lucide-react'

// Pilih container tujuan untuk data hasil upload. Tiap container menampilkan seberapa cocok isinya dengan file:
// "cocok" = baris file yang SUDAH ada di container itu, "baru" = baris file yang belum ada (akan ditambahkan).
// kandidat: hasil kandidatContainer() (sudah terurut dari yang paling cocok).
export default function PilihContainer({ kandidat, terpilihId, autoId, onPilih, onOtomatis, onTutup, batas = 8 }) {
  const [q, setQ] = useState(''), [semua, setSemua] = useState(false)
  const t = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const cocokQ = (k) => !t.length || t.every((w) => [k.g.container, k.g.buyer, k.g.packingListNo].join(' ').toLowerCase().includes(w))
  const daftar = kandidat.filter(cocokQ), tampil = semua || t.length ? daftar : daftar.slice(0, batas)
  return (
    <div className="pc" role="group" aria-label="Pilih container tujuan">
      <div className="pc-head">
        <label className="pc-cari"><Search size={14} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari container…" aria-label="Cari container tujuan" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} /></label>
        {onOtomatis && <button type="button" className="btn sm" onClick={onOtomatis} disabled={!terpilihId}>Pakai otomatis</button>}
        <button type="button" className="icon-btn" onClick={onTutup} aria-label="Tutup pilihan container"><X size={16} /></button>
      </div>
      {!tampil.length && <div className="empty">Tidak ada container yang cocok.</div>}
      <div className="pc-list">
        {tampil.map((k) => {
          const on = k.g.id === terpilihId, saran = k.g.id === autoId
          return (
            <button type="button" key={k.g.id} className={'pc-row' + (on ? ' on' : '')} aria-pressed={on} onClick={() => onPilih(k.g)}>
              <span className="pc-nama">{on && <Check size={14} aria-hidden="true" />} <b>{k.g.container}</b>{k.g.kind === 'coads' && <span className="chip-st kind-coads">CO ADS</span>}{saran && <span className="chip-st buka">Terdeteksi</span>}<small>{k.g.buyer ? 'Buyer ' + k.g.buyer : ''}</small></span>
              <span className="pc-stat"><span>{k.total} baris tersimpan</span><span className={k.cocok ? 'ok' : ''}>{k.cocok} cocok</span><span className={k.baru ? 'baru' : ''}>{k.baru} baru</span>{k.berubah > 0 && <span>{k.berubah} berubah</span>}</span>
            </button>)
        })}
      </div>
      {!semua && !t.length && daftar.length > batas && <button type="button" className="btn sm" onClick={() => setSemua(true)}>Tampilkan semua ({daftar.length})</button>}
    </div>
  )
}
