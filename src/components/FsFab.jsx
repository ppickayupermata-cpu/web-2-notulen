import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LayoutGrid } from 'lucide-react'

// Tombol melayang tunggal untuk mode layar penuh (menggantikan 4 tombol yang menutupi tabel):
// - bisa diseret ke mana saja; saat dilepas menempel ke tepi layar terdekat seperti magnet (animasi ease-in-out)
// - klik = membuka menu (menu, pencarian, tema, keluar); posisinya diingat
// - 10 menit tidak dipakai: memudar dan "ngumpet" separuh ke tepi; klik sekali = kembali normal, dan seterusnya
const S = 48, M = 12, KEY = 'pl_fab'
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const muat = () => { try { const o = JSON.parse(localStorage.getItem(KEY)); if (o && ['left', 'right', 'top', 'bottom'].includes(o.edge) && Number.isFinite(o.t)) return o } catch { /* abaikan */ } return { edge: 'right', t: 0.88 } }
const koordinat = ({ edge, t }) => { // edge + posisi sepanjang tepi (0..1) -> piksel kiri-atas tombol
  const W = innerWidth, H = innerHeight, x = M + t * Math.max(0, W - 2 * M - S), y = M + t * Math.max(0, H - 2 * M - S)
  return edge === 'left' ? { x: M, y } : edge === 'right' ? { x: W - S - M, y } : edge === 'top' ? { x, y: M } : { x, y: H - S - M }
}

export default function FsFab({ items, idleMs = 600000 }) {
  const [pt, setPt] = useState(muat), [pos, setPos] = useState(() => koordinat(muat()))
  const [open, setOpen] = useState(false), [idle, setIdle] = useState(false), [anim, setAnim] = useState(false), [drag, setDrag] = useState(false)
  const timer = useRef(0), g = useRef(null), root = useRef(null)
  const kick = () => { setIdle(false); clearTimeout(timer.current); timer.current = setTimeout(() => { setOpen(false); setIdle(true) }, idleMs) }
  useEffect(() => { kick(); return () => clearTimeout(timer.current) }, [idleMs])
  useLayoutEffect(() => { const r = () => setPos(koordinat(pt)); r(); addEventListener('resize', r); return () => removeEventListener('resize', r) }, [pt])
  useEffect(() => { // klik di luar / Esc menutup menu
    if (!open) return
    const d = (e) => { if (root.current && !root.current.contains(e.target)) setOpen(false) }, k = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('pointerdown', d); document.addEventListener('keydown', k, true)
    return () => { document.removeEventListener('pointerdown', d); document.removeEventListener('keydown', k, true) }
  }, [open])

  const down = (e) => { if (e.button > 0) return; const wasIdle = idle; kick(); g.current = { sx: e.clientX, sy: e.clientY, ox: e.clientX - pos.x, oy: e.clientY - pos.y, moved: false, wasIdle }; e.currentTarget.setPointerCapture(e.pointerId) }
  const move = (e) => {
    const s = g.current; if (!s) return
    if (!s.moved && Math.hypot(e.clientX - s.sx, e.clientY - s.sy) < 6) return
    if (!s.moved) { s.moved = true; setDrag(true); setAnim(false); setOpen(false) }
    setPos({ x: clamp(e.clientX - s.ox, 0, innerWidth - S), y: clamp(e.clientY - s.oy, 0, innerHeight - S) })
  }
  const up = (e) => {
    const s = g.current; g.current = null; if (!s) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    if (s.moved) { // menempel ke tepi terdekat
      setDrag(false)
      const W = innerWidth, H = innerHeight, d = { left: pos.x, right: W - S - pos.x, top: pos.y, bottom: H - S - pos.y }
      const edge = Object.entries(d).sort((a, b) => a[1] - b[1])[0][0]
      const t = edge === 'left' || edge === 'right' ? clamp((pos.y - M) / Math.max(1, H - 2 * M - S), 0, 1) : clamp((pos.x - M) / Math.max(1, W - 2 * M - S), 0, 1)
      const n = { edge, t }; setAnim(true); setPt(n); try { localStorage.setItem(KEY, JSON.stringify(n)) } catch { /* mode privat */ }
      setTimeout(() => setAnim(false), 450); return
    }
    if (!s.wasIdle) setOpen((v) => !v) // klik pertama saat "ngumpet" hanya memunculkan kembali
  }
  const ke = pt.edge, vertikal = ke === 'top' || ke === 'bottom'
  const panel = { left: { left: S + 8, top: 0, flexDirection: 'row' }, right: { right: S + 8, top: 0, flexDirection: 'row-reverse' }, top: { top: S + 8, left: 0, flexDirection: 'column' }, bottom: { bottom: S + 8, left: 0, flexDirection: 'column-reverse' } }[ke]
  const sembunyi = { left: 'translateX(-64%)', right: 'translateX(64%)', top: 'translateY(-64%)', bottom: 'translateY(64%)' }[ke]
  return (
    <div ref={root} className={'fsfab' + (idle ? ' idle' : '') + (drag ? ' drag' : '') + (anim ? ' anim' : '')} data-edge={ke} style={{ left: pos.x, top: pos.y, transform: idle ? sembunyi : 'none' }}>
      <button className="fsfab-btn" aria-label="Menu cepat layar penuh" aria-expanded={open} title="Menu cepat (seret untuk memindahkan)" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kick(); setOpen((v) => !v) } }} onFocus={kick}><LayoutGrid size={20} /></button>
      {open && <div className={'fsfab-panel' + (vertikal ? ' v' : '')} style={panel}>{items.map((it) => (
        <button key={it.key} className={'icon-btn' + (it.active ? ' on' : '')} title={it.label} aria-label={it.label} onClick={() => { kick(); if (!it.keep) setOpen(false); it.onClick() }}>{it.icon}</button>))}</div>}
    </div>
  )
}
