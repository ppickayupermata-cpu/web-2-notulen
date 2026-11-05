import { useEffect, useMemo, useRef, useState } from 'react'
import { Radio, Search, Sun, Moon, AlertTriangle, PackageCheck, ZoomIn, ZoomOut, Maximize, Minimize, ScanLine, Pencil, Crosshair } from 'lucide-react'
import { colsFor } from '../config.js'
import { useUi } from '../context/UiContext.jsx'
import { jamStr } from '../components/JamMerah.jsx'
import FsFab from '../components/FsFab.jsx'

// Tampilan LIVE read-only (publik, tanpa login): dibuka dari link yang dibagikan admin (?live=TOKEN).
// - ter-update tiap 2 detik; isian admin yang BELUM di-Submit juga terlihat langsung (kuning) beserta kursor admin
// - satu area geser untuk semua tabel (sentuh di mana saja pada tabel untuk menggeser), zoom: cubit layar / Ctrl+scroll / tombol +, −, pas layar
// - layar penuh
const fmtTgl = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('/') : v)
const todayISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const CW = 150 // lebar dasar satu kolom (px)

export default function LiveView({ token }) {
  const { theme, toggleTheme } = useUi()
  const [d, setD] = useState(null), [err, setErr] = useState(''), [at, setAt] = useState(null), [q, setQ] = useState('')
  const [flash, setFlash] = useState(() => new Set()), prev = useRef(null)
  const [scale, setScale] = useState(() => { try { return clamp(+localStorage.getItem('pl_live_zoom') || 1, 0.3, 3) } catch { return 1 } })
  const [full, setFull] = useState(false), [follow, setFollow] = useState(false)
  const page = useRef(null), vp = useRef(null), pan = useRef(null)

  useEffect(() => {
    let on = true, stop = false, timer = 0
    const load = async () => {
      try {
        const r = await fetch('/api/live?t=' + encodeURIComponent(token)), x = await r.json().catch(() => ({}))
        if (!on) return
        if (!r.ok) { setErr(x.error || 'Tidak bisa memuat data.'); if (r.status === 404 || r.status === 403) { stop = true; setD(false) } return }
        const cur = new Map(x.rows.map((o) => [o.id, JSON.stringify(o)])), ch = new Set()
        if (prev.current) cur.forEach((v, k) => { if (prev.current.get(k) !== v) ch.add(k) }) // baris baru / berubah sejak pembaruan sebelumnya
        prev.current = cur
        setD(x); setErr(''); setAt(new Date())
        if (ch.size) { setFlash(ch); setTimeout(() => on && setFlash(new Set()), 3500) }
      } catch { if (on) setErr('Koneksi terputus. Mencoba lagi…') }
    }
    const tick = async () => { if (!stop && !document.hidden) await load(); if (on && !stop) timer = setTimeout(tick, 2000) }
    tick()
    return () => { on = false; clearTimeout(timer) }
  }, [token])

  // ---- isian admin yang belum di-Submit ditumpuk di atas data tersimpan ----
  const pr = d?.presence || null
  const rowsAll = useMemo(() => (d?.rows || []).map((r) => { const dr = pr?.draft?.[r.id]; return dr ? { ...r, ...dr, _draft: Object.keys(dr) } : r }), [d])
  const cols = useMemo(() => colsFor(d?.group).filter((c) => c.key !== 'group' || rowsAll.some((r) => r.group)), [rowsAll, d?.group?.kind])
  const rows = useMemo(() => { const t = q.toLowerCase().split(/\s+/).filter(Boolean); return rowsAll.filter((r) => !t.length || t.every((w) => [r.so, r.po, r.productName, r.productCode, r.area, r.ket].join(' ').toLowerCase().includes(w))) }, [rowsAll, q])
  const bySo = useMemo(() => { const m = new Map(); rows.forEach((r) => m.set(r.so, [...(m.get(r.so) || []), r])); return [...m] }, [rows])
  const hari = todayISO(), un = rowsAll.filter((r) => !r.packed)
  const nLate = un.filter((r) => r.target && r.target < hari && !r.kirim).length, nToday = un.filter((r) => r.target === hari).length
  const nDraft = Object.keys(pr?.draft || {}).length

  // ---- zoom ----
  useEffect(() => { try { localStorage.setItem('pl_live_zoom', String(scale)) } catch { /* mode privat */ } }, [scale])
  const zoomTo = (ns, fx, fy) => { // zoom dengan titik (fx, fy) di layar tetap di tempatnya
    const v = vp.current; ns = clamp(ns, 0.3, 3)
    if (v) { const r = v.getBoundingClientRect(), x = (fx ?? r.left + r.width / 2) - r.left, y = (fy ?? r.top + r.height / 2) - r.top, k = ns / scale; const l = (v.scrollLeft + x) * k - x, t = (v.scrollTop + y) * k - y; requestAnimationFrame(() => { v.scrollLeft = l; v.scrollTop = t }) }
    setScale(ns)
  }
  const fit = () => { const v = vp.current; if (v) setScale(clamp((v.clientWidth - 24) / (CW * cols.length), 0.3, 3)) }
  useEffect(() => { // Ctrl + scroll = zoom (desktop); cubit dua jari = zoom bawaan browser di HP
    const v = vp.current; if (!v) return
    const w = (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomTo(scale * Math.exp(-e.deltaY * 0.002), e.clientX, e.clientY) } }
    v.addEventListener('wheel', w, { passive: false }); return () => v.removeEventListener('wheel', w)
  }, [scale, d])
  // geser dengan mouse (tahan klik kiri dan seret); sentuhan jari memakai geser bawaan browser jadi nyaman di mana pun jari menyentuh tabel
  const down = (e) => { if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('input,button,a')) return; const v = vp.current; pan.current = { x: e.clientX, y: e.clientY, l: v.scrollLeft, t: v.scrollTop }; v.setPointerCapture(e.pointerId); v.classList.add('panning') }
  const move = (e) => { const p = pan.current; if (!p) return; vp.current.scrollLeft = p.l - (e.clientX - p.x); vp.current.scrollTop = p.t - (e.clientY - p.y) }
  const up = (e) => { if (!pan.current) return; pan.current = null; vp.current.classList.remove('panning'); vp.current.releasePointerCapture?.(e.pointerId) }

  // ---- layar penuh ----
  const toggleFull = async () => {
    if (!full) { setFull(true); try { await page.current?.requestFullscreen?.() } catch { /* iPhone: pakai mode layar penuh bawaan halaman */ } }
    else { setFull(false); try { if (document.fullscreenElement) await document.exitFullscreen() } catch { /* abaikan */ } }
  }
  useEffect(() => { const h = () => { if (!document.fullscreenElement) setFull(false) }; document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h) }, [])

  // ---- ikuti kursor admin ----
  const cur = pr?.rowId && pr?.key ? pr.rowId + '|' + pr.key : ''
  useEffect(() => { if (follow && cur) vp.current?.querySelector('td.cursorcell')?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' }) }, [cur, follow])

  const zoomBtns = (cls) => (<>
    <button className={cls} onClick={() => zoomTo(scale / 1.2)} aria-label="Perkecil" title="Perkecil"><ZoomOut size={18} /></button>
    <button className={cls} onClick={() => zoomTo(1)} title="Ukuran 100%" style={{ minWidth: 48, fontSize: 12 }}>{Math.round(scale * 100)}%</button>
    <button className={cls} onClick={() => zoomTo(scale * 1.2)} aria-label="Perbesar" title="Perbesar"><ZoomIn size={18} /></button>
    <button className={cls} onClick={fit} aria-label="Pas lebar layar" title="Pas lebar layar"><ScanLine size={18} /></button>
  </>)

  return (
    <div ref={page} className={'livepage' + (full ? ' live-full' : '')}>
      {!full && <>
        <div className="live-head">
          <span className="live-badge"><Radio size={14} /> LIVE</span>
          <b>Container {d?.group?.container || '…'}</b>{d?.group?.buyer && <span className="hint">Buyer {d.group.buyer}</span>}{d?.group?.packingListNo && <span className="hint">{d.group.packingListNo}</span>}
          <span className="spacer" />
          {pr && (pr.editing || nDraft > 0) && <span className="live-edit" role="status"><Pencil size={13} /> {pr.editor} sedang mengedit{nDraft ? ` · ${nDraft} baris belum disimpan` : ''}</span>}
          <span className="hint">Hanya melihat{at ? ` · diperbarui ${jamStr(at)}` : ''}</span>
          <button className={'icon-btn' + (follow ? ' on' : '')} onClick={() => setFollow((v) => !v)} aria-pressed={follow} title="Ikuti kursor admin otomatis"><Crosshair size={18} /></button>
          {zoomBtns('icon-btn')}
          <button className="icon-btn" onClick={toggleTheme} aria-label="Ganti tema" title="Ganti tema">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button className="icon-btn" onClick={toggleFull} aria-label="Layar penuh" title="Layar penuh"><Maximize size={18} /></button>
        </div>
        {err && <div className="msg err" role="alert">{err}</div>}
        {d && <div className="sumbar">
          <span className="sc ok"><PackageCheck size={14} /> Dipacking {rowsAll.length - un.length}/{rowsAll.length}</span>
          <span className={'sc late' + (nLate ? '' : ' zero')}><AlertTriangle size={14} /> Terlambat {nLate}</span>
          <span className={'sc due' + (nToday ? '' : ' zero')}>Target hari ini {nToday}</span>
          <label className="live-q"><Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari SO, PO, produk, AREA…" aria-label="Cari" /></label>
        </div>}
      </>}
      {d === false && <div className="empty">Link live tidak bisa dipakai. Minta link terbaru dari PPIC.</div>}
      {d === null && !err && <div className="empty">Memuat…</div>}
      {d && <div ref={vp} className="live-vp" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="live-zoom" style={{ zoom: scale }}>
          {!rows.length && <div className="empty">Tidak ada baris yang cocok.</div>}
          {bySo.map(([so, list]) => (
            <div key={so} className="sobox live-so">
              <div className="sotitle">SO {so}<small> · {list.length} baris</small></div>
              <table className="grid fx" style={{ width: CW * cols.length }}>
                <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
                <tbody>{list.map((r) => (
                  <tr key={r.id} className={(r.packed ? 'packed ' : '') + (flash.has(r.id) ? 'flash' : '')}>
                    {cols.map((c) => {
                      const isCur = cur === r.id + '|' + c.key, isDraft = r._draft?.includes(c.key), v = c.type === 'date' ? fmtTgl(r[c.key]) : r[c.key]
                      const late = c.key === 'target' && !r.packed && r.target && r.target < hari && !r.kirim && !isDraft
                      return <td key={c.key} className={(isDraft ? 'draftcell ' : '') + (isCur ? 'cursorcell' : '')} data-who={isCur ? pr.editor + (pr.editing ? ' ✎' : '') : undefined} title={isDraft ? 'Belum disimpan admin' : undefined}
                        style={late ? { background: '#fee2e2', color: '#b91c1c', fontWeight: 600 } : undefined}>{v}</td>
                    })}
                  </tr>))}</tbody>
              </table>
            </div>))}
        </div>
      </div>}
      {full && <FsFab items={[
        { key: 'plus', label: 'Perbesar', icon: <ZoomIn size={18} />, onClick: () => zoomTo(scale * 1.2), keep: true },
        { key: 'minus', label: 'Perkecil', icon: <ZoomOut size={18} />, onClick: () => zoomTo(scale / 1.2), keep: true },
        { key: 'fit', label: 'Pas lebar layar', icon: <ScanLine size={18} />, onClick: fit, keep: true },
        { key: 'follow', label: 'Ikuti kursor admin', icon: <Crosshair size={18} />, active: follow, onClick: () => setFollow((v) => !v), keep: true },
        { key: 'tema', label: 'Tema terang / gelap', icon: theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />, onClick: toggleTheme, keep: true },
        { key: 'keluar', label: 'Keluar layar penuh', icon: <Minimize size={18} />, onClick: toggleFull },
      ]} />}
    </div>
  )
}
