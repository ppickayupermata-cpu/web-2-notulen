import { X } from 'lucide-react'
const L = [
  ['Umum', [['Ctrl + K', 'Cari SO / PO / produk di semua container'], ['?', 'Buka daftar pintasan ini'], ['Esc', 'Tutup jendela / keluar layar penuh']]],
  ['Tabel', [['Ctrl + F', 'Cari & Ganti'], ['Enter / Shift + Enter', 'Hasil cari berikutnya / sebelumnya'], ['Ctrl + Z / Ctrl + Y', 'Undo / Redo format'], ['Ctrl + C / Ctrl + V', 'Salin / tempel sel'], ['Ctrl + D / Ctrl + R', 'Isi ke bawah / ke kanan'], ['Shift + klik', 'Perluas pilihan sel'], ['Shift + scroll', 'Geser tabel ke kiri / kanan']]],
  ['Catat Notulen', [['Enter di bullet', 'Bullet baru (Enter di bullet kosong = selesai)'], ['Tab / Shift + Tab', 'Bullet tingkat 2 / kembali'], ['- spasi di awal baris', 'Jadikan bullet']]],
]
export default function Pintasan({ onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Pintasan keyboard" onClick={(e) => e.stopPropagation()}>
        <div className="toolbar"><h3 style={{ margin: 0 }}>Pintasan keyboard</h3><span className="spacer" /><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={18} /></button></div>
        {L.map(([t, rows]) => <div key={t}><h4 className="pin-h">{t}</h4>{rows.map(([k, d]) => <div key={k} className="pin-r"><kbd>{k}</kbd><span>{d}</span></div>)}</div>)}
      </div>
    </div>
  )
}
