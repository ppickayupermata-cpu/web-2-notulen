import { useEffect, useMemo, useRef, useState } from 'react'
import { Radio, Search, Sun, Moon, AlertTriangle, PackageCheck } from 'lucide-react'
import { ALL_COLS } from '../config.js'
import { useUi } from '../context/UiContext.jsx'
import { jamStr } from '../components/JamMerah.jsx'

// Tampilan LIVE read-only (publik, tanpa login): dibuka dari link yang dibagikan admin (?live=TOKEN). Otomatis ter-update tiap 4 detik.
const fmtTgl = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('/') : v)
const todayISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })

export default function LiveView({ token }) {
  const { theme, toggleTheme } = useUi()
  const [d, setD] = useState(null), [err, setErr] = useState(''), [at, setAt] = useState(null), [q, setQ] = useState('')
  const [flash, setFlash] = useState(() => new Set()), prev = useRef(null)
  useEffect(() => {
    let on = true, stop = false
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
    load(); const t = setInterval(() => { if (!stop && !document.hidden) load() }, 4000)
    return () => { on = false; clearInterval(t) }
  }, [token])

  const cols = useMemo(() => ALL_COLS.filter((c) => c.key !== 'group' || d?.rows?.some((r) => r.group)), [d])
  const rows = useMemo(() => {
    const t = q.toLowerCase().split(/\s+/).filter(Boolean)
    return (d?.rows || []).filter((r) => !t.length || t.every((w) => [r.so, r.po, r.productName, r.productCode, r.area, r.ket].join(' ').toLowerCase().includes(w)))
  }, [d, q])
  const bySo = useMemo(() => { const m = new Map(); rows.forEach((r) => m.set(r.so, [...(m.get(r.so) || []), r])); return [...m] }, [rows])
  const hari = todayISO(), all = d?.rows || [], un = all.filter((r) => !r.packed)
  const nLate = un.filter((r) => r.target && r.target < hari && !r.kirim).length, nToday = un.filter((r) => r.target === hari).length

  return (
    <div className="livepage">
      <div className="live-head">
        <span className="live-badge"><Radio size={14} /> LIVE</span>
        <b>Container {d?.group?.container || '…'}</b>{d?.group?.buyer && <span className="hint">Buyer {d.group.buyer}</span>}{d?.group?.packingListNo && <span className="hint">{d.group.packingListNo}</span>}
        <span className="spacer" />
        <span className="hint">Hanya melihat{at ? ` · diperbarui ${jamStr(at)}` : ''}</span>
        <button className="icon-btn" onClick={toggleTheme} aria-label="Ganti tema" title="Ganti tema">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
      </div>
      {err && <div className="msg err" role="alert">{err}</div>}
      {d === false && <div className="empty">Link live tidak bisa dipakai. Minta link terbaru dari PPIC.</div>}
      {d === null && !err && <div className="empty">Memuat…</div>}
      {d && <>
        <div className="sumbar">
          <span className="sc ok"><PackageCheck size={14} /> Dipacking {all.length - un.length}/{all.length}</span>
          <span className={'sc late' + (nLate ? '' : ' zero')}><AlertTriangle size={14} /> Terlambat {nLate}</span>
          <span className={'sc due' + (nToday ? '' : ' zero')}>Target hari ini {nToday}</span>
          <label className="live-q"><Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari SO, PO, produk, AREA…" aria-label="Cari" /></label>
        </div>
        {!rows.length && <div className="empty">Tidak ada baris yang cocok.</div>}
        {bySo.map(([so, list]) => (
          <div key={so} className="sobox">
            <div className="sotitle">SO {so}<small> · {list.length} baris</small></div>
            <div className="tablewrap" style={{ maxHeight: 'none' }}>
              <table className="grid fx" style={{ minWidth: 140 * cols.length }}>
                <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
                <tbody>{list.map((r) => (
                  <tr key={r.id} className={(r.packed ? 'packed ' : '') + (flash.has(r.id) ? 'flash' : '')}>
                    {cols.map((c) => { const v = c.type === 'date' ? fmtTgl(r[c.key]) : r[c.key]; const late = c.key === 'target' && !r.packed && r.target && r.target < hari && !r.kirim
                      return <td key={c.key} style={late ? { background: '#fee2e2', color: '#b91c1c', fontWeight: 600 } : undefined}>{v}</td> })}
                  </tr>))}</tbody>
              </table>
            </div>
          </div>))}
      </>}
    </div>
  )
}
