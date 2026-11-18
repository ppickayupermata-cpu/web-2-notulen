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

import { useUi } from '../context/UiContext.jsx'

export default function FilterBar({ value, onChange, onClear, fields = ITEM_FIELDS }) {
  const { fs, showFilter } = useUi()
  if (fs && !showFilter) return null // layar penuh: pencarian disembunyikan, buka lewat toggle
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="filterbar">
      {fields.map((f) => (
        <label key={f.key}>{f.label}<input placeholder={f.placeholder} value={value[f.key] ?? ''} onChange={set(f.key)} /></label>
      ))}
      <button className="btn" onClick={onClear}>Reset</button>
    </div>
  )
}
