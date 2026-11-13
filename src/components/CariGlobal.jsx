import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, CornerDownLeft, Loader2 } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { cocokTeks } from '../utils/filter.js'

const KEYS = ['so', 'po', 'productCode', 'productName', 'material', 'type', 'size', 'area', 'ket']
const KIND = { ganti: 'sebelum diganti', hapus: 'sebelum dihapus', gabung: 'sebelum digabung', 'sebelum-pulih': 'sebelum pemulihan', harian: 'harian', manual: 'manual' }
const tgl = (v) => (v ? new Date(v).toLocaleString('id-ID') : '-')

// Pencarian menyeluruh (semua container): isi Monitoring, jadwal Hapus Data, Barang Jadi, dan Cadangan Data.
// Tiap hasil ditandai container-nya dan dikelompokkan per sumber. Beberapa kata = semuanya harus cocok.
export default function CariGlobal({ onClose, onPick }) {
  const { rows, groups, schedules, ask } = useData()
  const [q, setQ] = useState(''), [cur, setCur] = useState(0)
  const [srv, setSrv] = useState({ finished: [], backups: [], snapshots: [] }), [cari, setCari] = useState(false)
  const box = useRef(null)
  const cn = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])

  const isi = useMemo(() => {   // Monitoring: di browser
    if (!q.trim()) return []
    const out = []
    for (const r of rows) {
      const g = cn.get(r.groupId)
      if (cocokTeks(KEYS.map((k) => r[k]).join(' ') + ' ' + (g?.container || '') + ' ' + (g?.buyer || ''), q)) { out.push({ kind: 'isi', r, g, container: g?.container || '' }); if (out.length >= 40) break }
    }
    return out
  }, [q, rows, cn])
  const jadwal = useMemo(() => !q.trim() ? [] : schedules.filter((s) => cocokTeks((s.label || '') + ' ' + (cn.get(s.groupId)?.container || '') + ' ' + s.date, q)).slice(0, 20)
    .map((s) => ({ kind: 'jadwal', s, container: cn.get(s.groupId)?.container || '' })), [q, schedules, cn])

  // Barang Jadi + Cadangan: di server (isi cadangan ikut dicari), ditunda sebentar sambil mengetik
  useEffect(() => {
    const t = q.trim()
    if (t.length < 2) { setSrv({ finished: [], backups: [], snapshots: [] }); setCari(false); return }
    let batal = false; setCari(true)
    const h = setTimeout(async () => { const x = await ask('searchAll', { q: t }, true); if (!batal) { setSrv(x || { finished: [], backups: [], snapshots: [] }); setCari(false) } }, 350)
    return () => { batal = true; clearTimeout(h) }
  }, [q])
  const barang = srv.finished.map((x) => ({ kind: 'barang', x, container: x.container }))
  const cad = srv.backups.map((x) => ({ kind: 'cadangan', x, container: x.container }))
  const penuh = srv.snapshots.map((x) => ({ kind: 'penuh', x, container: '' }))

  // daftar bagian; hanya baris hasil yang bisa dipilih dengan panah / Enter
  const bagian = [
    { judul: 'Isi container (Monitoring)', list: isi }, { judul: 'Hapus Data (jadwal hapus)', list: jadwal },
    { judul: 'Barang Jadi', list: barang }, { judul: 'Cadangan Data · per container', list: cad }, { judul: 'Cadangan Data · cadangan penuh', list: penuh },
  ].filter((b) => b.list.length)
  const datar = bagian.flatMap((b) => b.list)
  useEffect(() => { setCur(0) }, [q])
  useEffect(() => { box.current?.querySelector('.hit.on')?.scrollIntoView({ block: 'nearest' }) }, [cur])
  const onKey = (e) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCur((c) => Math.min(c + 1, datar.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCur((c) => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (datar[cur]) onPick(datar[cur]) }
  }
  const baris = (it) => {
    if (it.kind === 'isi') { const { r, g } = it; return [<><b>SO {r.so}</b> · PO {r.po || '-'} · {r.productName}</>, <>Container {g?.container || '-'} · AREA {r.area || '-'} · Target {r.target || '-'}{r.ket ? ' · ' + r.ket : ''}</>] }
    if (it.kind === 'jadwal') return [<><b>{it.s.label || 'Jadwal hapus'}</b></>, <>{it.container ? 'Container ' + it.container + ' · ' : ''}dihapus {it.s.date}</>]
    if (it.kind === 'barang') { const x = it.x; return [<><b>SO {x.so}</b> · PO {x.po || '-'} · {x.productName}</>, <>Container {x.container} · AREA {x.area || '-'} · dipindah {tgl(x.movedAt)}</>] }
    if (it.kind === 'cadangan') return [<><b>Container {it.x.container}</b> · {it.x.count} baris</>, <>Cadangan {KIND[it.x.kind] || it.x.kind} · {tgl(it.x.at)}</>]
    return [<><b>Cadangan penuh</b> · {it.x.groups} container, {it.x.rows} baris</>, <>{KIND[it.x.kind] || it.x.kind} · {tgl(it.x.at)}</>]
  }
  let n = -1
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal cari" role="dialog" aria-modal="true" aria-label="Cari di semua container" onClick={(e) => e.stopPropagation()}>
        <div className="cari-in"><Search size={18} /><input autoFocus placeholder="Cari di semua container: SO, PO, produk, AREA, container…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} />{cari ? <Loader2 size={16} className="spin" aria-label="Mencari" /> : <kbd>Esc</kbd>}</div>
        <div className="cari-list" ref={box}>
          {!q.trim() && <div className="empty">Pencarian menyeluruh: isi semua container, jadwal Hapus Data, Barang Jadi, dan Cadangan Data (hasilnya ditandai container-nya). Untuk mencari di satu container saja, pakai tombol Cari di dalam container itu.</div>}
          {q.trim() && !datar.length && !cari && <div className="empty">Tidak ada yang cocok dengan “{q}”.</div>}
          {bagian.map((b) => (
            <div key={b.judul} role="group" aria-label={b.judul}>
              <div className="cari-sec">{b.judul} <i>{b.list.length}</i></div>
              {b.list.map((it) => { n++; const i = n, [a, c] = baris(it); return (
                <button key={b.judul + i} className={'hit' + (i === cur ? ' on' : '')} onMouseEnter={() => setCur(i)} onClick={() => onPick(it)}>
                  <span className="h1">{a}</span><span className="h2">{c}</span>{i === cur && <CornerDownLeft size={14} />}
                </button>) })}
            </div>))}
        </div>
      </div>
    </div>
  )
}
