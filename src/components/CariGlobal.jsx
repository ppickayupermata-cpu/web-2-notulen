import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, CornerDownLeft } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'

const KEYS = ['so', 'po', 'productCode', 'productName', 'material', 'type', 'size', 'area', 'ket']
// Pencarian lintas container: ketik sebagian SO / PO / nama produk / AREA / keterangan (beberapa kata = semuanya harus cocok).
export default function CariGlobal({ onClose, onPick }) {
  const { rows, groups } = useData()
  const [q, setQ] = useState(''), [cur, setCur] = useState(0)
  const box = useRef(null)
  const cn = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])
  const hasil = useMemo(() => {
    const t = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!t.length) return []
    const out = []
    for (const r of rows) {
      const g = cn.get(r.groupId), hay = (KEYS.map((k) => r[k]).join(' ') + ' ' + (g?.container || '') + ' ' + (g?.buyer || '')).toLowerCase()
      if (t.every((x) => hay.includes(x))) { out.push({ r, g }); if (out.length >= 40) break }
    }
    return out
  }, [q, rows, cn])
  useEffect(() => { setCur(0) }, [q])
  useEffect(() => { box.current?.querySelector('.hit.on')?.scrollIntoView({ block: 'nearest' }) }, [cur])
  const onKey = (e) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCur((c) => Math.min(c + 1, hasil.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCur((c) => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter' && hasil[cur]) onPick(hasil[cur].r)
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal cari" role="dialog" aria-modal="true" aria-label="Cari di semua container" onClick={(e) => e.stopPropagation()}>
        <div className="cari-in"><Search size={18} /><input autoFocus placeholder="Cari SO, PO, nama produk, AREA, keterangan, container…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} /><kbd>Esc</kbd></div>
        <div className="cari-list" ref={box}>
          {!q.trim() && <div className="empty">Ketik untuk mencari di semua container. Panah atas/bawah memilih, Enter membuka.</div>}
          {q.trim() && !hasil.length && <div className="empty">Tidak ada yang cocok dengan “{q}”.</div>}
          {hasil.map(({ r, g }, i) => (
            <button key={r.id} className={'hit' + (i === cur ? ' on' : '')} onMouseEnter={() => setCur(i)} onClick={() => onPick(r)}>
              <span className="h1"><b>SO {r.so}</b> · PO {r.po || '-'} · {r.productName}</span>
              <span className="h2">Container {g?.container || '-'} · AREA {r.area || '-'} · Target {r.target || '-'}{r.ket ? ' · ' + r.ket : ''}</span>
              {i === cur && <CornerDownLeft size={14} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
