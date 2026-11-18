import { useUi } from '../context/UiContext.jsx'

export const ITEM_FIELDS = [
  { key: 'so', label: 'SO', placeholder: 'Ketik nomor SO...' },
  { key: 'soItem', label: 'SO Item', placeholder: 'Contoh: 10' },
  { key: 'productCode', label: 'Product Code (opsional)', placeholder: 'Contoh: DSA24868' },
]
export const ITEM_FIELDS_COADS = [
  { key: 'so', label: 'KP SO Number', placeholder: 'Ketik nomor SO...' },
  { key: 'po', label: 'DSA PO Number', placeholder: 'Contoh: 24764' },
  { key: 'productName', label: 'Product Description', placeholder: 'Contoh: Alexandria' },
]
export const GROUP_FIELDS = [
  { key: 'container', label: 'Container', placeholder: 'Ketik nomor container...' },
  { key: 'buyer', label: 'Buyer', placeholder: 'Contoh: AAW' },
]

// Pencarian horizontal (flex, satu baris, turun baris bila sempit). Dipakai di SEMUA tempat pencarian:
// kotak "Cari" bebas (semua kolom, beberapa kata) + kolom khusus, lalu Reset. Cakupannya ditentukan pemanggil lewat `scope`:
// di dalam container = isi container itu; di daftar = Container / Buyer / Packing List; di Hapus Data = semua container.
// Pemanggil tetap memakai value / onChange / onClear; teks bebas disimpan di value.q (lihat utils/filter.js).
export default function FilterBar({ value = {}, onChange, onClear, fields = ITEM_FIELDS, scope = '' }) {
  const { fs, showFilter } = useUi()
  if (fs && !showFilter) return null // layar penuh: pencarian disembunyikan, buka lewat toggle
  const punyaQ = fields.some((f) => f.key === 'q')
  const aktif = [...fields.map((f) => f.key), 'q'].some((k) => String(value[k] ?? '').trim())
  const ubah = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  const tombol = (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation() } else if (e.key === 'Escape' && aktif) { e.preventDefault(); e.stopPropagation(); onClear?.() } }
  return (
    <div className="filterbar" role="search" aria-label={scope ? 'Pencarian: ' + scope : 'Pencarian'}>
      {!punyaQ && (
        <label className="ff q"><span>Cari (semua kolom)</span>
          <input type="search" value={value.q ?? ''} placeholder={scope ? 'Cari di ' + scope : 'Ketik kata kunci...'} onChange={ubah('q')} onKeyDown={tombol} /></label>
      )}
      {fields.map((f) => (
        <label className={'ff' + (f.key === 'q' ? ' q' : '')} key={f.key}><span>{f.label}</span>
          <input type={f.key === 'q' ? 'search' : 'text'} value={value[f.key] ?? ''} placeholder={f.placeholder || ''} onChange={ubah(f.key)} onKeyDown={tombol} /></label>
      ))}
      <button type="button" className="btn" onClick={onClear} disabled={!aktif}>Reset</button>
    </div>
  )
}
