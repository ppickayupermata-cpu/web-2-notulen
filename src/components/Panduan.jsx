import { useEffect, useMemo, useRef, useState } from 'react'
import { X, BookOpen, Search, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react'
import { TOPIK, PINTASAN } from '../data/panduan.js'
import { useUi } from '../context/UiContext.jsx'

const fmt = (s) => String(s).split('**').map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p))   // **tebal**
const teks = (t) => [t.judul, t.ringkas, t.analogi, ...(t.kerja || []), ...(t.cara || []), ...(t.tips || [])].join(' ').toLowerCase()

// Panel Panduan: panel samping yang tidak menutup layar dan tidak mengganggu (tanpa latar gelap, halaman di belakangnya tetap bisa dipakai).
// Dibuka lewat ikon buku di bilah atas, tombol "?" di judul tiap halaman, atau F1. Menutup: tombol X atau Esc.
export default function Panduan() {
  const { panduan, bukaPanduan, tutupPanduan } = useUi()
  const [q, setQ] = useState('')
  const body = useRef(null)
  const daftar = useMemo(() => { const k = q.trim().toLowerCase().split(/\s+/).filter(Boolean); return k.length ? TOPIK.filter((t) => k.every((w) => teks(t).includes(w))) : TOPIK }, [q])
  const idx = Math.max(0, TOPIK.findIndex((t) => t.id === panduan.topik))
  const t = TOPIK[idx]
  useEffect(() => { body.current?.scrollTo?.(0, 0) }, [t.id])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') tutupPanduan() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [])
  const pindah = (n) => bukaPanduan(TOPIK[(idx + n + TOPIK.length) % TOPIK.length].id)

  return (
    <aside className="panduan" role="complementary" aria-label="Panduan penggunaan">
      <header className="pd-head">
        <BookOpen size={18} aria-hidden="true" /><h2>Panduan</h2>
        <label className="pd-cari"><Search size={14} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari di panduan…" aria-label="Cari di panduan" onKeyDown={(e) => { if (e.key === 'Escape' && q) { e.stopPropagation(); setQ('') } }} /></label>
        <button type="button" className="icon-btn" onClick={tutupPanduan} aria-label="Tutup panduan" title="Tutup (Esc)"><X size={18} /></button>
      </header>
      <div className="pd-body" ref={body}>
        <nav className="pd-toc" aria-label="Daftar topik">
          {daftar.map((x) => <button type="button" key={x.id} className={'pd-chip' + (x.id === t.id ? ' on' : '')} aria-current={x.id === t.id ? 'true' : undefined} onClick={() => bukaPanduan(x.id)}>{x.judul}</button>)}
          {!daftar.length && <span className="hint">Tidak ada topik yang cocok dengan “{q}”.</span>}
        </nav>
        <article className="pd-art" aria-labelledby="pd-judul">
          <h3 id="pd-judul">{t.judul}</h3>
          <p className="pd-ringkas">{fmt(t.ringkas)}</p>
          {t.analogi && <div className="pd-analogi"><b>Analogi</b><p>{fmt(t.analogi)}</p></div>}
          {t.pintasan && PINTASAN.map(([g, rows]) => <div key={g}><h4>{g}</h4>{rows.map(([k, d]) => <div key={k} className="pin-r"><kbd>{k}</kbd><span>{d}</span></div>)}</div>)}
          {t.kerja && <section><h4>{t.cara ? 'Cara kerja' : 'Penjelasan'}</h4><ul>{t.kerja.map((x, i) => <li key={i}>{fmt(x)}</li>)}</ul></section>}
          {t.cara && <section><h4>Cara memakai</h4><ol>{t.cara.map((x, i) => <li key={i}>{fmt(x)}</li>)}</ol></section>}
          {t.tips && <section className="pd-tips"><h4><Lightbulb size={14} aria-hidden="true" /> Tips</h4><ul>{t.tips.map((x, i) => <li key={i}>{fmt(x)}</li>)}</ul></section>}
        </article>
        <footer className="pd-foot">
          <button type="button" className="btn sm" onClick={() => pindah(-1)}><ChevronLeft size={14} /> {TOPIK[(idx - 1 + TOPIK.length) % TOPIK.length].judul}</button>
          <span className="spacer" />
          <button type="button" className="btn sm" onClick={() => pindah(1)}>{TOPIK[(idx + 1) % TOPIK.length].judul} <ChevronRight size={14} /></button>
        </footer>
      </div>
    </aside>
  )
}
