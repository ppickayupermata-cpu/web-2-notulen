import { useEffect, useState } from 'react'
import { buildStyledXlsx } from '../utils/exportStyled.js'
import { Columns3, Eye, EyeOff, PaintBucket, Baseline, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Merge, Eraser, RotateCcw, Download, ChevronUp, ChevronDown, Undo2, Redo2, Filter, Snowflake, Plus, Trash2, WrapText, NotebookPen, Ungroup, Search, Replace, AlarmClock, ArrowDownToLine, ArrowRightToLine, MoveHorizontal, X, PackageCheck } from 'lucide-react'
import { ALL_COLS } from '../config.js'
import { useData } from '../context/DataContext.jsx'
import { useConfirm } from './ConfirmDialog.jsx'
import { today } from '../utils/date.js'

const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }
const isN = (x) => x !== '' && x != null && Number.isFinite(Number(x))
const show = (c, v) => (c.type === 'date' && v && !String(v).startsWith('#') ? String(v).split('-').reverse().join('/') : v)
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d } catch { return d } }
const flat = (a) => a.flat(9)
const FN = {
  SUM: (...a) => flat(a).reduce((s, x) => s + num(x), 0),
  AVERAGE: (...a) => { const f = flat(a).filter(isN); return f.reduce((s, x) => s + num(x), 0) / f.length },
  MIN: (...a) => Math.min(...flat(a).filter(isN).map(num)), MAX: (...a) => Math.max(...flat(a).filter(isN).map(num)),
  COUNT: (...a) => flat(a).filter(isN).length, IF: (c, a, b = '') => (c ? a : b),
  ROUND: (x, n = 0) => Number(num(x).toFixed(n)), ABS: (x) => Math.abs(num(x)),
  UPPER: (x) => String(x ?? '').toUpperCase(), LOWER: (x) => String(x ?? '').toLowerCase(), LEN: (x) => String(x ?? '').length, TRIM: (x) => String(x ?? '').trim().replace(/\s+/g, ' '),
  CONCAT: (...a) => flat(a).join(''), LEFT: (x, n = 1) => String(x ?? '').slice(0, n), RIGHT: (x, n = 1) => (n ? String(x ?? '').slice(-n) : ''),
  AND: (...a) => flat(a).every(Boolean), OR: (...a) => flat(a).some(Boolean), NOT: (x) => !x,
}
const FNRE = new RegExp('\\b(' + Object.keys(FN).join('|') + '|C|R)\\b', 'g')

export default function DataTable({ rows, editable = [], editing = false, getValue, onChange, selectable = false, selected = [], onToggle, onToggleAll, fileName, manage = false, groupId, onNotulen, onPack }) {
  const { settings, setSettings, addRows, removeRows, rows: allRows } = useData()
  const { confirm, dialog } = useConfirm()
  const extra = (settings.cols || []).map((c) => ({ ...c, type: 'text' }))
  const all = [...ALL_COLS, ...extra]
  const edt = manage ? [...editable, ...extra.map((c) => c.key)] : editable
  const [hc, setHc] = useState([]); const [hr, setHr] = useState([])
  const [menu, setMenu] = useState(false)
  const [sel, setSel] = useState(null)
  const [drag, setDrag] = useState(false)
  const [sort, setSort] = useState(null)
  const [flt, setFlt] = useState({}); const [showF, setShowF] = useState(false)
  const [fz, setFz] = useState(0)
  const [wd, setWd] = useState(() => load('pl_w2', { all: load('pl_w', {}), so: {} })) // all = lebar bawaan semua tabel; so[SO] = lebar khusus satu tabel
  const [fm, setFm] = useState(() => load('pl_fmt', {}))
  const [mg, setMg] = useState(() => load('pl_merge', []))
  const [past, setPast] = useState([]); const [fut, setFut] = useState([])
  const [warn, setWarn] = useState(() => load('pl_warn', false)) // sorot TARGET yang sudah lewat dan belum ada tanggal pengiriman
  const [fnd, setFnd] = useState(null) // cari & ganti: { q, rep, n, cs }
  useEffect(() => { try { localStorage.setItem('pl_fmt', JSON.stringify(fm)); localStorage.setItem('pl_merge', JSON.stringify(mg)); localStorage.setItem('pl_w2', JSON.stringify(wd)); localStorage.setItem('pl_warn', JSON.stringify(warn)) } catch {} }, [fm, mg, wd, warn])
  // buang merge yatim (baris sudah dihapus) supaya tidak menjadi gabungan hantu yang tak bisa dilepas
  useEffect(() => { const ids = new Set([...(allRows || []), ...rows].map((r) => r.id)); if (ids.size) setMg((m) => (m.some((x) => !ids.has(x.id)) ? m.filter((x) => ids.has(x.id)) : m)) }, [allRows, rows])
  useEffect(() => { document.querySelector('td.curhit')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }, [fnd?.n, fnd?.q])
  useEffect(() => { const up = () => setDrag(false); window.addEventListener('mouseup', up); return () => window.removeEventListener('mouseup', up) }, [])

  const val = (r, k) => (getValue ? getValue(r, k) : r[k])
  // Rumus: =SUM(I1:I5), =I1+I2*2, =IF(I1>10,1,0). Huruf kolom A.. = urutan kolom, angka = nomor baris (#).
  const calc = (r, k, d = 0) => {
    const v = val(r, k)
    if (typeof v !== 'string' || v[0] !== '=') return v ?? ''
    if (d > 15) return '#REF!'
    const cell = (a, n) => {
      const row = rows[n - 1], c = all[a.charCodeAt(0) - 65]; if (!row || !c) throw 0
      const x = calc(row, c.key, d + 1); if (String(x)[0] === '#') throw 0
      return x === '' ? 0 : isN(x) ? Number(x) : x
    }
    const range = (a, n1, b, n2) => { const o = []; for (let i = n1; i <= n2; i++) for (let c = a.charCodeAt(0); c <= b.charCodeAt(0); c++) { try { o.push(cell(String.fromCharCode(c), i)) } catch { o.push('') } } return o }
    try {
      const s = v.slice(1).toUpperCase().replace(/([A-Z])(\d+):([A-Z])(\d+)/g, 'R("$1",$2,"$3",$4)').replace(/(?<![A-Z"])([A-Z])(\d+)(?![\d"(])/g, 'C("$1",$2)').replace(/<>/g, '!=').replace(/(?<![<>!=])=(?!=)/g, '==')
      if (/[A-Za-z_$`\\]/.test(s.replace(FNRE, '').replace(/"[A-Z]"/g, ''))) return '#NAME?'
      const res = new Function('C', 'R', ...Object.keys(FN), `"use strict";return (${s})`)(cell, range, ...Object.values(FN))
      return typeof res === 'number' ? (Number.isFinite(res) ? Number(res.toFixed(6)) : '#DIV/0!') : typeof res === 'boolean' ? (res ? 'TRUE' : 'FALSE') : String(res)
    } catch { return '#ERROR!' }
  }

  const cols = all.filter((c) => !hc.includes(c.key))
  const idx = new Map(rows.map((r, i) => [r.id, i]))
  const kept = rows.filter((r) => !hr.includes(r.id) && Object.entries(flt).every(([k, q]) => !q || String(calc(r, k) ?? '').toLowerCase().includes(q.toLowerCase())))
  // SO berbeda dipisah menjadi tabel sendiri-sendiri (urut sesuai kemunculan pertama); urutan kolom (sort) berlaku di dalam tiap SO
  const bySo = new Map(); kept.forEach((r) => { const k = String(r.so ?? '').trim() || '(tanpa SO)'; bySo.set(k, [...(bySo.get(k) || []), r]) })
  const cmp = sort && ((a, b) => String(calc(a, sort.key)).localeCompare(String(calc(b, sort.key)), 'id', { numeric: true }) * sort.dir)
  const vis = [...bySo.values()].flatMap((g) => (cmp ? [...g].sort(cmp) : g))
  const segs = []; for (const [so, g] of bySo) { const st = segs.length ? segs.at(-1).end : 0; segs.push({ so, start: st, end: st + g.length }) }
  if (!rows.length) return <div className="empty">Tidak ada data yang cocok.</div>

  const rg = sel && { r0: Math.min(sel.a[0], sel.b[0]), r1: Math.max(sel.a[0], sel.b[0]), c0: Math.min(sel.a[1], sel.b[1]), c1: Math.max(sel.a[1], sel.b[1]) }
  const inR = (i, c) => rg && i >= rg.r0 && i <= rg.r1 && c >= rg.c0 && c <= rg.c1
  const each = (fn) => { if (rg) for (let i = rg.r0; i <= rg.r1; i++) for (let c = rg.c0; c <= rg.c1; c++) if (vis[i] && cols[c]) fn(vis[i], cols[c]) }
  const pos = (m) => [vis.findIndex((r) => r.id === m.id), cols.findIndex((c) => c.key === m.key)]

  // Undo / Redo untuk format dan merge
  const save = () => { setPast((p) => [...p.slice(-30), { fm, mg }]); setFut([]) }
  const undo = () => { const p = past.at(-1); if (!p) return; setFut((f) => [...f, { fm, mg }]); setPast(past.slice(0, -1)); setFm(p.fm); setMg(p.mg) }
  const redo = () => { const n = fut.at(-1); if (!n) return; setPast((p) => [...p, { fm, mg }]); setFut(fut.slice(0, -1)); setFm(n.fm); setMg(n.mg) }
  const paint = (p) => { if (!rg) return; save(); setFm((f) => { const n = { ...f }; each((r, c) => { const k = r.id + '|' + c.key; n[k] = { ...n[k], ...p } }); return n }) }
  const clearFmt = () => { save(); setFm((f) => { const n = { ...f }; each((r, c) => delete n[r.id + '|' + c.key]); return n }) }
  const hits = (m) => { const [i, c] = pos(m); return !!rg && i >= 0 && c >= 0 && i <= rg.r1 && i + m.rs - 1 >= rg.r0 && c <= rg.c1 && c + m.cs - 1 >= rg.c0 }
  const mergeSel = () => { // Merge & Center: gabungkan sel terpilih (tidak melewati batas tabel SO); merge lama yang bersinggungan diganti
    if (!rg || (rg.r0 === rg.r1 && rg.c0 === rg.c1)) return
    const sg = segs.find((x) => rg.r0 >= x.start && rg.r0 < x.end), r1 = Math.min(rg.r1, sg.end - 1), id = vis[rg.r0].id, key = cols[rg.c0].key
    save(); setMg([...mg.filter((m) => !hits(m)), { id, key, rs: r1 - rg.r0 + 1, cs: rg.c1 - rg.c0 + 1 }])
    setFm((f) => ({ ...f, [id + '|' + key]: { ...f[id + '|' + key], align: 'center' } }))
  }
  const canUnmerge = !!rg && mg.some(hits)
  const unmergeSel = () => { if (canUnmerge) { save(); setMg(mg.filter((m) => !hits(m))) } } // Unmerge: lepas semua gabungan yang bersinggungan dengan seleksi (sel tertutup pun terdeteksi)
  const fill = (dir) => { // Ctrl+D isi bawah / Ctrl+R isi kanan: salin nilai dan format dari baris atau kolom pertama seleksi
    if (!rg || !editing) return; save(); const fn = {}
    for (let i = rg.r0; i <= rg.r1; i++) for (let c = rg.c0; c <= rg.c1; c++) {
      const si = dir === 'down' ? rg.r0 : i, sc = dir === 'down' ? c : rg.c0; if (si === i && sc === c) continue
      const s0 = vis[si], d = vis[i], col = cols[c]; if (!d || !s0 || !edt.includes(col.key)) continue
      onChange(d.id, col.key, val(s0, cols[sc].key) ?? ''); fn[d.id + '|' + col.key] = fm[s0.id + '|' + cols[sc].key] || null
    }
    setFm((f) => { const n = { ...f }; for (const [k, v] of Object.entries(fn)) v ? (n[k] = { ...v }) : delete n[k]; return n })
  }
  const fillAll = (v) => { if (editing) each((r, c) => edt.includes(c.key) && onChange(r.id, c.key, v)) } // Ctrl+Enter / Ctrl+;
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const fh = fnd?.q ? vis.flatMap((r, i) => cols.flatMap((c, ci) => (new RegExp(esc(fnd.q), fnd.cs ? '' : 'i').test(String(calc(r, c.key) ?? '')) ? [{ i, ci, key: c.key }] : []))) : []
  const fcur = fh.length ? fh[((fnd.n % fh.length) + fh.length) % fh.length] : null, fset = new Set(fh.map((h) => h.i + ',' + h.ci))
  const repl = (list) => { if (!editing) return; const re = new RegExp(esc(fnd.q), fnd.cs ? 'g' : 'gi'); list.forEach((h) => { if (edt.includes(h.key)) onChange(vis[h.i].id, h.key, String(val(vis[h.i], h.key) ?? '').replace(re, fnd.rep)) }) }
  const st = rg && (() => { let n = 0, k = 0, sm = 0, mn = Infinity, mx = -Infinity; each((r, c) => { const v = calc(r, c.key); if (v === '' || v == null) return; n++; if (isN(v)) { const x = Number(v); k++; sm += x; mn = Math.min(mn, x); mx = Math.max(mx, x) } }); return { cells: (rg.r1 - rg.r0 + 1) * (rg.c1 - rg.c0 + 1), n, k, sm, mn, mx } })()
  const nf = (x) => Number(x.toFixed(3)).toLocaleString('id-ID')
  const todayS = today(), late = (r) => { const t = String(val(r, 'target') ?? ''); return warn && !!r && !r.packed && !!t && t < todayS && !String(val(r, 'kirim') ?? '').trim() }
  const areas = [...new Set(['FIN', 'WC', 'CO', 'PACK', 'LIST', 'CNC', 'PAINTING', 'PC', 'WH', ...rows.map((r) => String(val(r, 'area') ?? '').trim().toUpperCase()).filter(Boolean)])].sort()
  const spans = {}; const covered = new Set()
  mg.forEach((m) => {
    const [i, c] = pos(m); if (i < 0 || c < 0) return
    const sg = segs.find((x) => i >= x.start && i < x.end), rs = Math.min(m.rs, sg.end - i), cs = Math.min(m.cs, cols.length - c)
    spans[i + ',' + c] = { rs, cs }
    for (let a = 0; a < rs; a++) for (let b = 0; b < cs; b++) if (a || b) covered.add(i + a + ',' + (c + b))
  })

  // Baris & kolom manual (PPIC)
  const addRow = () => addRows(groupId, 1)
  const delRows = async () => {
    if (!rg) return
    const ids = vis.slice(rg.r0, rg.r1 + 1).map((r) => r.id)
    if (await confirm({ title: 'Hapus baris?', message: `${ids.length} baris terpilih akan dihapus permanen.`, confirmLabel: 'Hapus', danger: true })) { removeRows(ids, '', 'Hapus baris di tabel'); setSel(null) }
  }
  const setExtra = (cols2) => setSettings({ cols: cols2.map(({ key, label }) => ({ key, label })) })
  const addCol = () => { const n = [...Array(99).keys()].map((x) => 'x' + (x + 1)).find((k) => !extra.some((c) => c.key === k)); if (n && extra.length < 10) setExtra([...extra, { key: n, label: 'Kolom Baru' }]) }

  const W = (k, so) => wd.so?.[so]?.[k] || wd.all?.[k] || 140
  const LP = onPack ? 40 : 0, RP = onPack ? 40 : 0 // kolom tombol packing kiri dan kanan
  const off = (ci, so) => LP + 56 + (selectable ? 34 : 0) + cols.slice(0, ci).reduce((t, c) => t + W(c.key, so), 0)
  const tableW = (so) => LP + RP + 56 + (selectable ? 34 : 0) + cols.reduce((t, c) => t + W(c.key, so), 0)
  const resize = (e, k, so) => { // ukuran kolom berlaku untuk tabel SO yang sedang ditarik saja
    e.preventDefault(); e.stopPropagation(); const x0 = e.clientX, w0 = W(k, so)
    const mv = (ev) => setWd((w) => ({ ...w, so: { ...w.so, [so]: { ...w.so?.[so], [k]: Math.max(60, w0 + ev.clientX - x0) } } }))
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up)
  }
  const samakan = (so) => setWd((w) => ({ all: { ...w.all, ...Object.fromEntries(cols.map((c) => [c.key, W(c.key, so)])) }, so: {} })) // pakai ukuran tabel ini untuk semua tabel
  const fit = (so, only) => { // lebar kolom mengikuti isi terpanjang (per tabel SO)
    const cv = document.createElement('canvas').getContext('2d'); cv.font = '14px ' + getComputedStyle(document.body).fontFamily
    const sg = segs.find((x) => x.so === so), list = vis.slice(sg.start, sg.end), w = {}
    cols.filter((c) => !only || c.key === only).forEach((c) => { w[c.key] = Math.min(520, Math.max(70, Math.ceil(Math.max(cv.measureText(c.label).width + 58, ...list.map((r) => cv.measureText(String(show(c, calc(r, c.key)) ?? '')).width + 26))))) })
    setWd((x) => ({ ...x, so: { ...x.so, [so]: { ...x.so?.[so], ...w } } }))
  }
  const resetT = (so) => setWd((w) => { const x = { ...w.so }; delete x[so]; return { ...w, so: x } })

  const byId = new Map(rows.map((r) => [r.id, r]))
  const exportXlsx = async () => {
    const buf = await buildStyledXlsx({ cols, rows: vis, calc, fmt: (id, k) => { const s0 = fm[id + '|' + k] || {}; if (!s0.bg && byId.get(id)?.packed) return { ...s0, bg: '#d1fae5' }; return k === 'target' && !s0.bg && late(byId.get(id)) ? { ...s0, bg: '#fee2e2', color: '#b91c1c', bold: true } : s0 }, spans, widthPx: (k) => Math.max(...segs.map((sg) => W(k, sg.so))), freeze: fz, segs, areas, sheetName: fileName })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    a.download = (fileName || 'data') + '.xlsx'; a.click(); URL.revokeObjectURL(a.href)
  }
  const hot = (e) => { // pintasan seperti Excel: Ctrl+D/R isi, Ctrl+F/H cari, Ctrl+B/I, Ctrl+Enter isi seleksi, Ctrl+; tanggal hari ini
    if (e.defaultPrevented || !(e.ctrlKey || e.metaKey)) return false
    const k = e.key.toLowerCase(), ok = (fn) => { e.preventDefault(); fn(); return true }
    if (k === 'd') return ok(() => fill('down')); if (k === 'r') return ok(() => fill('right'))
    if (k === 'f' || k === 'h') return ok(() => setFnd((x) => x || { q: '', rep: '', n: 0, cs: false }))
    if (k === 'b') return ok(() => paint({ bold: !first?.bold })); if (k === 'i') return ok(() => paint({ italic: !first?.italic }))
    if (k === 'enter') return ok(() => fillAll(e.target.value ?? ''))
    if (k === ';' && cols[rg?.c0]?.type === 'date') return ok(() => fillAll(today()))
    return false
  }
  const move = (e, i, ci) => { if (hot(e)) return; const d = { ArrowDown: 1, Enter: 1, ArrowUp: -1 }[e.key]; if (!d) return; e.preventDefault(); document.getElementById(`cell-${vis[i + d]?.id}-${cols[ci].key}`)?.focus() }
  const onCopy = (e) => {
    if (!rg || e.target.tagName === 'INPUT') return
    const t = []; for (let i = rg.r0; i <= rg.r1; i++) t.push(cols.slice(rg.c0, rg.c1 + 1).map((c) => val(vis[i], c.key) ?? '').join('\t'))
    e.clipboardData.setData('text/plain', t.join('\n')); e.preventDefault()
  }
  const onPaste = (e) => {
    const tx = e.clipboardData.getData('text')
    if (!editing || !rg || (!/[\t\n]/.test(tx.trim()) && e.target.tagName === 'INPUT')) return
    e.preventDefault()
    tx.replace(/\r/g, '').replace(/\n$/, '').split('\n').forEach((ln, a) => ln.split('\t').forEach((v, b) => { const r = vis[rg.r0 + a], c = cols[rg.c0 + b]; if (r && c && edt.includes(c.key)) onChange(r.id, c.key, v) }))
  }
  const onKey = (e) => {
    if (hot(e)) return
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo() }
    else if (editing && e.key === 'Delete') each((r, c) => edt.includes(c.key) && onChange(r.id, c.key, ''))
  }
  const first = rg && fm[vis[rg.r0]?.id + '|' + cols[rg.c0]?.key]
  const B = ({ t, d, f, children, cls = 'icon-btn dark' }) => <button className={cls} disabled={d} title={t} onClick={f}>{children}</button>

  return (
    <>
      <div className="totalbar">
        <div className="tools">
          <div className="pop">
            <button className="btn sm" onClick={() => setMenu((v) => !v)}><Columns3 size={15} /> Kolom</button>
            {menu && <div className="menu">
              {all.map((c) => (
                <div key={c.key} className="mrow">
                  <input type="checkbox" className="chk" checked={!hc.includes(c.key)} onChange={() => setHc((h) => (h.includes(c.key) ? h.filter((x) => x !== c.key) : [...h, c.key]))} />
                  {manage && c.key[0] === 'x' ? <>
                    <input defaultValue={c.label} onBlur={(e) => e.target.value !== c.label && setExtra(extra.map((x) => (x.key === c.key ? { ...x, label: e.target.value } : x)))} />
                    <button className="mini" title="Hapus kolom" onClick={() => setExtra(extra.filter((x) => x.key !== c.key))}><Trash2 size={13} /></button>
                  </> : <span>{c.label}</span>}
                </div>
              ))}
              {manage && <button className="btn sm" onClick={addCol}><Plus size={14} /> Tambah kolom</button>}
            </div>}
          </div>
          {hr.length > 0 && <button className="btn sm" onClick={() => setHr([])}><RotateCcw size={14} /> Tampilkan {hr.length} baris</button>}
          <B t="Filter per kolom" f={() => { setShowF((v) => !v); setFlt({}) }}><Filter size={15} /></B>
          <B t="Bekukan kolom sampai sel terpilih (klik lagi untuk lepas)" f={() => setFz(fz ? 0 : rg ? rg.c1 + 1 : 1)}><Snowflake size={15} /></B>
          <span className="sep" />
          <B t="Undo (Ctrl+Z)" d={!past.length} f={undo}><Undo2 size={15} /></B>
          <B t="Redo (Ctrl+Y)" d={!fut.length} f={redo}><Redo2 size={15} /></B>
          <label className="inline" title="Warna sel"><PaintBucket size={15} /><input type="color" className="clr" disabled={!rg} onChange={(e) => paint({ bg: e.target.value })} /></label>
          <label className="inline" title="Warna teks"><Baseline size={15} /><input type="color" className="clr" disabled={!rg} onChange={(e) => paint({ color: e.target.value })} /></label>
          <B t="Tebal" d={!rg} f={() => paint({ bold: !first?.bold })}><Bold size={15} /></B>
          <B t="Miring" d={!rg} f={() => paint({ italic: !first?.italic })}><Italic size={15} /></B>
          <B t="Rata kiri" d={!rg} f={() => paint({ align: 'left' })}><AlignLeft size={15} /></B>
          <B t="Rata tengah" d={!rg} f={() => paint({ align: 'center' })}><AlignCenter size={15} /></B>
          <B t="Rata kanan" d={!rg} f={() => paint({ align: 'right' })}><AlignRight size={15} /></B>
          <B t="Bungkus teks / wrap text (klik lagi untuk lepas)" d={!rg} f={() => paint({ wrap: !first?.wrap })} cls={'icon-btn dark' + (first?.wrap ? ' on' : '')}><WrapText size={15} /></B>
          <B t="Merge & Center: gabungkan sel terpilih" d={!rg || (rg.r0 === rg.r1 && rg.c0 === rg.c1)} f={mergeSel} cls="btn sm"><Merge size={15} /> Merge & Center</B>
          <B t="Unmerge: lepas gabungan sel pada seleksi" d={!canUnmerge} f={unmergeSel} cls="btn sm"><Ungroup size={15} /> Unmerge</B>
          <B t="Hapus format" d={!rg} f={clearFmt}><Eraser size={15} /></B>
          {editing && <><B t="Isi ke bawah (Ctrl+D)" d={!rg} f={() => fill('down')}><ArrowDownToLine size={15} /></B><B t="Isi ke kanan (Ctrl+R)" d={!rg} f={() => fill('right')}><ArrowRightToLine size={15} /></B></>}
          <span className="sep" />
          <B t="Cari & Ganti (Ctrl+F)" f={() => setFnd((x) => x || { q: '', rep: '', n: 0, cs: false })} cls={'icon-btn dark' + (fnd ? ' on' : '')}><Search size={15} /></B>
          <B t="Sorot TARGET yang sudah lewat dan belum dikirim" f={() => setWarn((v) => !v)} cls={'icon-btn dark' + (warn ? ' on' : '')}><AlarmClock size={15} /></B>
          {manage && <><span className="sep" /><B t="Tambah baris di akhir" f={addRow} cls="btn sm"><Plus size={14} /> Baris</B><B t="Hapus baris terpilih" d={!rg} f={delRows} cls="btn sm"><Trash2 size={14} /> Baris</B></>}
          <span className="sep" />
          <B t="Unduh hasil sebagai Excel" f={exportXlsx} cls="btn sm primary"><Download size={15} /> Unduh Excel</B>
          {onNotulen && <B t="Catat notulen dari tabel ini" f={() => onNotulen(calc)} cls="btn sm"><NotebookPen size={15} /> Catat Notulen</B>}
        </div>
      </div>
      {fnd && <div className="findbar">
        <Search size={15} /><input autoFocus placeholder="Cari…" value={fnd.q} onChange={(e) => setFnd({ ...fnd, q: e.target.value, n: 0 })} onKeyDown={(e) => { if (e.key === 'Enter') setFnd({ ...fnd, n: fnd.n + (e.shiftKey ? -1 : 1) }); if (e.key === 'Escape') setFnd(null) }} />
        <span className="hint">{fh.length ? `${(((fnd.n % fh.length) + fh.length) % fh.length) + 1} dari ${fh.length}` : fnd.q ? 'Tidak ditemukan' : ''}</span>
        <button className="icon-btn dark" title="Sebelumnya (Shift+Enter)" onClick={() => setFnd({ ...fnd, n: fnd.n - 1 })}><ChevronUp size={15} /></button><button className="icon-btn dark" title="Berikutnya (Enter)" onClick={() => setFnd({ ...fnd, n: fnd.n + 1 })}><ChevronDown size={15} /></button>
        <label className="inline" title="Peka huruf besar-kecil"><input type="checkbox" checked={fnd.cs} onChange={(e) => setFnd({ ...fnd, cs: e.target.checked })} /> Aa</label>
        {editing && <><Replace size={15} /><input placeholder="Ganti dengan…" value={fnd.rep} onChange={(e) => setFnd({ ...fnd, rep: e.target.value })} /><button className="btn sm" disabled={!fcur} onClick={() => repl([fcur])}>Ganti</button><button className="btn sm" disabled={!fh.length} onClick={() => repl(fh)}>Ganti semua</button></>}
        <button className="icon-btn dark" title="Tutup (Esc)" onClick={() => setFnd(null)}><X size={15} /></button></div>}
      {st && st.n > 0 && <div className="statbar"><span>{st.cells} sel dipilih</span><span>Terisi: {st.n}</span>{st.k > 0 && <><span>Jumlah: <b>{nf(st.sm)}</b></span><span>Rata-rata: <b>{nf(st.sm / st.k)}</b></span><span>Min: {nf(st.mn)}</span><span>Maks: {nf(st.mx)}</span></>}</div>}
      <datalist id="dl-area">{areas.map((a) => <option key={a} value={a} />)}</datalist>
      <div className="tablewrap pad" tabIndex={0} onCopy={onCopy} onPaste={onPaste} onKeyDown={onKey}>
        {segs.map((sg, si) => (
          <div key={sg.so} className="sobox" style={{ containIntrinsicSize: 'auto ' + (80 + (sg.end - sg.start) * 38) + 'px' }}>
            <div className="sotitle">SO {sg.so}<small> · {sg.end - sg.start} baris</small>
              <span className="sotools"><button className="btn sm" title="Sesuaikan lebar kolom dengan isinya (klik dua kali tepi header untuk satu kolom)" onClick={() => fit(sg.so)}><MoveHorizontal size={14} /> Auto-fit</button><button className="btn sm" title="Pakai ukuran kolom tabel ini untuk semua tabel" onClick={() => samakan(sg.so)}>Samakan ke semua</button><button className="btn sm" title="Kembalikan ukuran tabel ini ke bawaan" disabled={!wd.so?.[sg.so]} onClick={() => resetT(sg.so)}>Reset ukuran</button></span></div>
            <table className="grid fx" style={{ width: tableW(sg.so) }}>
              <colgroup>{onPack && <col style={{ width: LP }} />}<col style={{ width: 56 }} />{selectable && <col style={{ width: 34 }} />}{cols.map((c) => <col key={c.key} style={{ width: W(c.key, sg.so) }} />)}{onPack && <col style={{ width: RP }} />}</colgroup>
              <thead>
                <tr>
                  {onPack && <th className="pk lpk" />}
                  <th className="rn" style={{ left: LP }}>#</th>
                  {selectable && <th><input type="checkbox" className="chk" checked={rows.every((r) => selected.includes(r.id))} onChange={onToggleAll} /></th>}
                  {cols.map((c, ci) => (
                    <th key={c.key} className={(edt.includes(c.key) ? 'in ' : '') + (ci < fz ? 'frz' : '')} style={{ width: W(c.key, sg.so), minWidth: W(c.key, sg.so), maxWidth: W(c.key, sg.so), left: ci < fz ? off(ci, sg.so) : undefined }}>
                      <span className="th">
                        <button className="hb" onClick={() => setSort((x) => (x?.key !== c.key ? { key: c.key, dir: 1 } : x.dir === 1 ? { key: c.key, dir: -1 } : null))}>
                          {c.label}{sort?.key === c.key && (sort.dir === 1 ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                        </button>
                        <button className="mini" title="Sembunyikan kolom" onClick={() => setHc((h) => [...h, c.key])}><EyeOff size={13} /></button>
                      </span>
                      <span className="rz" onMouseDown={(e) => resize(e, c.key, sg.so)} onDoubleClick={() => fit(sg.so, c.key)} />
                    </th>
                  ))}
                  {onPack && <th className="pk rpk" />}
                </tr>
                {showF && si === 0 && <tr>{[...(onPack ? [<th key="lp" className="pk lpk f2" />] : []), <th key="n" className="rn f2" style={{ left: LP }} />, ...(selectable ? [<th key="s" className="f2" />] : []), ...cols.map((c) => <th key={c.key} className="f2"><input placeholder="filter..." value={flt[c.key] ?? ''} onChange={(e) => setFlt({ ...flt, [c.key]: e.target.value })} /></th>), ...(onPack ? [<th key="rp" className="pk rpk f2" />] : [])]}</tr>}
              </thead>
              <tbody>
                {vis.slice(sg.start, sg.end).map((r, k) => { const i = sg.start + k
                  const pk = onPack && <button className={'packbtn' + (r.packed ? ' on' : '')} title={r.packed ? 'Sudah dipacking (klik untuk membatalkan)' : 'Tandai sudah dipacking'} aria-label={'Tag packing baris ' + (idx.get(r.id) + 1)} aria-pressed={!!r.packed} onClick={() => onPack(r)}><PackageCheck size={16} /></button>
                  return (
                  <tr key={r.id} className={(selected.includes(r.id) ? 'picked' : '') + (r.packed ? ' packed' : '')}>
                    {onPack && <td className="pk lpk">{pk}</td>}
                    <td className="rn" style={{ left: LP }} onMouseDown={(e) => { if (e.target.closest('button')) return; setSel(e.shiftKey && sel ? { a: sel.a, b: [i, cols.length - 1] } : { a: [i, 0], b: [i, cols.length - 1] }); setDrag(true) }}><span>{idx.get(r.id) + 1}</span><button className="mini" title="Sembunyikan baris" onClick={() => setHr((h) => [...h, r.id])}><Eye size={13} /></button></td>
                    {selectable && <td><input type="checkbox" className="chk" checked={selected.includes(r.id)} onChange={() => onToggle(r.id)} /></td>}
                    {cols.map((c, ci) => {
                      if (covered.has(i + ',' + ci)) return null
                      const sp = spans[i + ',' + ci], s = fm[r.id + '|' + c.key] || {}
                      const canEdit = editing && edt.includes(c.key)
                      const st = { background: s.bg || (r.packed ? 'var(--packed)' : ci < fz ? 'var(--card)' : undefined), color: s.color || (s.bg ? '#1f2433' : undefined), fontWeight: s.bold ? 700 : undefined, fontStyle: s.italic ? 'italic' : undefined, textAlign: s.align || (sp || c.key === 'qty' ? 'center' : undefined), verticalAlign: sp ? 'middle' : undefined, left: ci < fz ? off(ci, sg.so) : undefined, whiteSpace: s.wrap ? 'normal' : undefined, wordBreak: s.wrap ? 'break-word' : undefined, textOverflow: s.wrap ? 'clip' : undefined, ...(c.key === 'target' && !s.bg && late(r) ? { background: '#fee2e2', color: '#b91c1c', fontWeight: 600 } : {}) }
                      const props = { id: `cell-${r.id}-${c.key}`, value: val(r, c.key) ?? '', onChange: (e) => onChange(r.id, c.key, e.target.value), ...(c.key === 'area' ? { list: 'dl-area' } : {}) }
                      const input = s.wrap ? <textarea {...props} rows={1} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) move(e, i, ci) }} /> : <input {...props} type={c.type === 'date' ? 'date' : 'text'} onKeyDown={(e) => move(e, i, ci)} />
                      const shown = show(c, calc(r, c.key))
                      return (
                        <td key={c.key} className={(canEdit ? 'edit ' : '') + (inR(i, ci) ? 'rng ' : '') + (ci < fz ? 'frz' : '') + (fset.has(i + ',' + ci) ? ' hit' : '') + (fcur && fcur.i === i && fcur.ci === ci ? ' curhit' : '')} style={st} rowSpan={sp?.rs} colSpan={sp?.cs}
                          onMouseDown={(e) => { setSel(e.shiftKey && sel ? { a: sel.a, b: [i, ci] } : { a: [i, ci], b: [i, ci] }); setDrag(true) }}
                          onMouseEnter={() => drag && setSel((x) => x && { ...x, b: [i, ci] })}>
                          {canEdit ? input : shown}
                        </td>
                      )
                    })}
                    {onPack && <td className="pk rpk">{pk}</td>}
                  </tr>
                ) })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      {dialog}
    </>
  )
}
