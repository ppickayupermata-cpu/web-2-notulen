import { useMemo, useRef, useState } from 'react'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { Upload, ZoomIn, ZoomOut } from 'lucide-react'
const colName = (n) => { let s = ''; for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s }

// Palet tema Office (urutan indeks tema OOXML: lt1, dk1, lt2, dk2, accent1..6)
const TH = ['FFFFFF', '000000', 'E7E6E6', '44546A', '5B9BD5', 'ED7D31', 'A5A5A5', 'FFC000', '4472C4', '70AD47']
function tint(h, t) {
  if (!t) return h
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let l = (mx + mn) / 2, s = 0, H = 0
  if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); H = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6 }
  l = t < 0 ? l * (1 + t) : l * (1 - t) + t
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const f = (x) => { x = ((x % 1) + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 0.5 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p }
  return '#' + [H + 1 / 3, H, H - 1 / 3].map((x) => Math.round((s ? f(x) : l) * 255).toString(16).padStart(2, '0')).join('')
}
const clr = (c, def) => (!c ? def : c.argb ? '#' + c.argb.slice(2) : c.theme != null ? tint('#' + TH[c.theme], c.tint) : def)
const css = (st, c) => `${{ medium: 2, thick: 3, double: 3 }[st] || 1}px ${{ dotted: 'dotted', hair: 'dotted', dashed: 'dashed', double: 'double' }[st] || 'solid'} ${c}`
const side = (b) => (!b?.style ? null : css(b.style, clr(b.color, '#000')))
const FONTS = ['Times New Roman', 'Arial', 'Calibri', 'Cambria', 'Courier New', 'Georgia', 'Tahoma', 'Verdana']
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28]
const NFS = [['General', 'Umum'], ['0', '0'], ['0.00', '0.00'], ['#,##0', '#,##0'], ['#,##0.00', '#,##0.00'], ['0%', 'Persen'], ['dd/mm/yyyy', 'Tanggal'], ['@', 'Teks']]
const BMODES = [['all', 'Semua'], ['outer', 'Luar'], ['top', 'Atas'], ['bottom', 'Bawah'], ['left', 'Kiri'], ['right', 'Kanan'], ['none', 'Tanpa']]
const rng = (s) => { const [a, b] = s.split(':'); const p = (x) => [+x.replace(/\D/g, ''), x.replace(/\d/g, '').split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0)]; const [r1, c1] = p(a), [r2, c2] = p(b || a); return { r1, c1, r2, c2 } }
const raw = (cell) => {
  const v = cell.value; if (v == null) return ''
  if (typeof v !== 'object') return v
  if (v instanceof Date) return v.toLocaleDateString('id-ID')
  return 'result' in v ? v.result ?? '' : v.richText ? v.richText.map((x) => x.text).join('') : v.text ?? ''
}
const fmtv = (v, nf) => {
  if (typeof v !== 'number' || !nf || nf === 'General') return String(v)
  const d = nf.match(/0\.(0+)/)?.[1].length || 0
  if (nf.includes('%')) return (v * 100).toFixed(d) + '%'
  return /,/.test(nf) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : d ? v.toFixed(d) : String(v)
}

const D0 = { edits: {}, merges: [], cols: {}, rows: {}, fz: null }
export default function SheetEditor() {
  const [m, setM] = useState(null)
  const [doc, setDocS] = useState(D0)
  const [sel, setSel] = useState(null); const [drag, setDrag] = useState(false)
  const [zoom, setZoom] = useState(100); const [msg, setMsg] = useState('')
  const wrap = useRef(null); const drw = null // preview: tidak ada pengubahan ukuran

  const open = async (f) => {
    if (!f) return
    try {
      const buf = await f.arrayBuffer(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf)
      const ws = wb.worksheets[0], zip = await JSZip.loadAsync(buf)
      const sz = +((await zip.file('xl/styles.xml').async('string')).match(/<fonts[^>]*>\s*<font>[\s\S]*?<sz val="([\d.]+)"/)?.[1] || 11)
      let boxes = []
      const dr = zip.file('xl/drawings/drawing1.xml')
      if (dr) {
        const d = new DOMParser().parseFromString(await dr.async('string'), 'application/xml'), T = (e, n) => [...e.getElementsByTagNameNS('*', n)]
        boxes = T(d, 'twoCellAnchor').map((a) => { const g = (n, k) => +T(T(a, n)[0], k)[0].textContent; return { c1: g('from', 'col'), o1: g('from', 'colOff'), r1: g('from', 'row'), p1: g('from', 'rowOff'), c2: g('to', 'col'), o2: g('to', 'colOff'), r2: g('to', 'row'), p2: g('to', 'rowOff'), text: T(a, 'p').map((p) => T(p, 't').map((t) => t.textContent).join('')).join('\n') } })
      }
      setM({ buf, ws, mdw: Math.round((sz * 2) / 3), boxes, name: f.name.replace(/\.xlsx$/i, '') })
      setDocS({ ...D0, merges: [...ws.model.merges] }); setSel(null); setMsg(''); setZoom(ws.views?.[0]?.zoomScale || 100)
    } catch (e) { setMsg('Gagal membuka file: ' + e.message) }
  }

  const geo = useMemo(() => {
    if (!m) return null
    const { ws, mdw } = m, NC = ws.columnCount + 4, NR = ws.rowCount + 25
    const dw = ws.properties.defaultColWidth || 8.43, dh = ws.properties.defaultRowHeight || 15
    const cw = Array.from({ length: NC }, (_, i) => Math.round((ws.getColumn(i + 1).width || dw) * mdw + 5))
    const rh = Array.from({ length: NR }, (_, i) => Math.round((ws.getRow(i + 1).height || dh) * 4 / 3))
    const dup = {} // conditional formatting "duplicateValues"
    ws.conditionalFormattings.forEach((cf) => cf.rules.filter((x) => x.type === 'duplicateValues').forEach((rule) => {
      const { r1, c1, r2, c2 } = rng(cf.ref.split(' ')[0]), cnt = {}
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) { const v = String(raw(ws.getCell(r, c))); if (v) cnt[v] = (cnt[v] || 0) + 1 }
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) { const v = String(raw(ws.getCell(r, c))); if (v && cnt[v] > 1) dup[r + ',' + c] = { bg: clr(rule.style?.fill?.bgColor, null), color: clr(rule.style?.font?.color, null) } }
    }))
    const v0 = ws.views?.[0]
    return { NC, NR, cw, rh, dup, grid: v0?.showGridLines !== false, fileFz: v0?.state === 'frozen' ? { r: v0.ySplit || 0, c: v0.xSplit || 0 } : { r: 0, c: 0 } }
  }, [m])
  if (!m) return (
    <div>
      <h2>Lembar Excel</h2>
      <div className="panel"><p>Buka file .xlsx untuk melihat tampilannya (ukuran kolom dan baris, font, warna, border, merge, zoom mengikuti file aslinya). Lembar ini hanya untuk preview: tidak bisa diedit dan tidak bisa diunduh.</p>
        <label className="btn primary" style={{ width: 'fit-content', cursor: 'pointer' }}><Upload size={15} /> Pilih file Excel<input type="file" accept=".xlsx" hidden onChange={(e) => open(e.target.files[0])} /></label>
        {msg && <span className="msg err">{msg}</span>}</div>
    </div>
  )

  const { ws, mdw } = m, { NC, NR, dup, grid } = geo
  const E = (r, c) => doc.edits[r + ',' + c] || {}
  const cell = (r, c) => ws.getCell(r, c)
  const colHidden = (c) => doc.cols[c]?.hidden ?? !!ws.getColumn(c).hidden
  const rowHidden = (r) => doc.rows[r]?.hidden ?? !!ws.getRow(r).hidden
  const colPx = (c) => (drw?.k === 'c' && drw.i === c ? drw.px : doc.cols[c]?.w != null ? Math.round(doc.cols[c].w * mdw + 5) : geo.cw[c - 1])
  const rowPx = (r) => (drw?.k === 'r' && drw.i === r ? drw.px : doc.rows[r]?.h != null ? Math.round(doc.rows[r].h * 4 / 3) : geo.rh[r - 1])
  const vc = Array.from({ length: NC }, (_, i) => i + 1).filter((c) => !colHidden(c))
  const vr = Array.from({ length: NR }, (_, i) => i + 1).filter((r) => !rowHidden(r))
  const hiddenRows = vr.length < NR ? NR - vr.length : 0
  const fzn = doc.fz ?? geo.fileFz
  const leftOff = (c) => 46 + vc.filter((x) => x < c).reduce((s, x) => s + colPx(x), 0)
  const topOff = (r) => 22 + vr.filter((x) => x < r).reduce((s, x) => s + rowPx(x), 0)
  const merges = doc.merges.map(rng)
  const masterAt = {}, covered = new Set()
  merges.forEach((g) => { masterAt[g.r1 + ',' + g.c1] = g; for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) if (r !== g.r1 || c !== g.c1) covered.add(r + ',' + c) })
  const locked = (r, c) => { const v = cell(r, c).value; return !!(v && typeof v === 'object' && (v.formula || v.sharedFormula)) && E(r, c).v === undefined }
  const text = (r, c) => { const e = E(r, c), ce = cell(r, c); if (e.v !== undefined) return e.v; return fmtv(raw(ce), e.nf || ce.numFmt) }
  const bsd = (r, c, k) => { const sp = E(r, c).bd?.[k[0]]; return sp ? (sp.st === 'none' ? null : css(sp.st, sp.color || '#000000')) : side(cell(r, c).border?.[k]) }
  const rg = sel && { r0: Math.min(sel.a[0], sel.b[0]), r1: Math.max(sel.a[0], sel.b[0]), c0: Math.min(sel.a[1], sel.b[1]), c1: Math.max(sel.a[1], sel.b[1]) }
  const each = (fn) => { if (rg) for (let r = rg.r0; r <= rg.r1; r++) for (let c = rg.c0; c <= rg.c1; c++) fn(r, c) }
  const onCopy = (e) => {
    if (!rg) return
    const t = []; for (let r = rg.r0; r <= rg.r1; r++) { const row = []; for (let c = rg.c0; c <= rg.c1; c++) row.push(text(r, c)); t.push(row.join('\t')) }
    e.clipboardData.setData('text/plain', t.join('\n')); e.preventDefault()
  }
  const selCol = (c, ev) => setSel(ev.shiftKey && sel ? { a: sel.a, b: [NR, c] } : { a: [1, c], b: [NR, c] })
  const selRow = (r, ev) => setSel(ev.shiftKey && sel ? { a: sel.a, b: [r, NC] } : { a: [r, 1], b: [r, NC] })
  const tableW = 46 + vc.reduce((s, c) => s + colPx(c), 0)

  return (
    <div className="xlpage">
      <div className="tools xtb">
        <label className="btn sm" style={{ cursor: 'pointer' }}><Upload size={15} /> Buka file<input type="file" accept=".xlsx" hidden onChange={(e) => open(e.target.files[0])} /></label>
        <span className="sep" />
        <button className="icon-btn dark" title="Perkecil" onClick={() => setZoom((z) => Math.max(30, z - 10))}><ZoomOut size={15} /></button><span className="hint">{zoom}%</span><button className="icon-btn dark" title="Perbesar" onClick={() => setZoom((z) => Math.min(200, z + 10))}><ZoomIn size={15} /></button>
        <span className="hint">Mode preview: hanya untuk dilihat, tidak bisa diedit atau diunduh.</span>
      </div>
      <div className="xlwrap" ref={wrap} tabIndex={0} onCopy={onCopy}>
        <div style={{ zoom: zoom / 100, position: 'relative', width: 'max-content' }}>
          <table className="xl" style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', width: tableW }}>
            <colgroup><col style={{ width: 46 }} />{vc.map((c) => <col key={c} style={{ width: colPx(c) }} />)}</colgroup>
            <thead>
              <tr>
                <th className="xh corner" onClick={() => setSel({ a: [1, 1], b: [NR, NC] })} />
                {vc.map((c) => <th key={c} className="xh top" onClick={(ev) => selCol(c, ev)} style={c <= fzn.c ? { left: leftOff(c), zIndex: 5 } : undefined}>{colName(c)}</th>)}
              </tr>
            </thead>
            <tbody>
              {vr.map((r) => {
                const fr = r <= fzn.r
                return (
                  <tr key={r} style={{ height: rowPx(r) }}>
                    <th className="xh left" onClick={(ev) => selRow(r, ev)} style={fr ? { top: topOff(r), zIndex: 3 } : undefined}>{r}</th>
                    {vc.map((c) => {
                      const k = r + ',' + c
                      if (covered.has(k)) return null
                      const g = masterAt[k], rs = g ? vr.filter((x) => x >= g.r1 && x <= g.r2).length : 1, cs = g ? vc.filter((x) => x >= g.c1 && x <= g.c2).length : 1
                      const ce = cell(r, c), e = E(r, c), f = ce.font || {}, al = ce.alignment || {}, fl = ce.fill, fc = c <= fzn.c
                      const bg = e.bg || dup[k]?.bg || (fl?.type === 'pattern' && fl.pattern === 'solid' ? clr(fl.fgColor, null) : null)
                      const val = text(r, c), num = typeof raw(ce) === 'number' && e.v === undefined
                      const h = e.h || (al.horizontal && al.horizontal !== 'general' ? al.horizontal : num ? 'right' : 'left'), wrapT = e.wrap ?? !!al.wrapText
                      const u = e.u ?? !!f.underline, sk = e.s ?? !!f.strike
                      const nextEmpty = !g && !text(r, c + 1) && !covered.has(r + ',' + (c + 1))
                      const g0 = grid ? '1px solid #d4d4d4' : '1px solid transparent', c2 = g ? g.c2 : c, r2 = g ? g.r2 : r
                      const sty = {
                        background: bg || (fr || fc ? '#fff' : undefined), color: e.color || dup[k]?.color || clr(f.color, '#000'), fontFamily: `'${e.fn || f.name || 'Calibri'}', serif`, fontSize: (e.fs || f.size || 11) * 4 / 3,
                        fontWeight: (e.b ?? f.bold) ? 700 : 400, fontStyle: (e.i ?? f.italic) ? 'italic' : 'normal', textDecoration: [u && 'underline', sk && 'line-through'].filter(Boolean).join(' ') || undefined,
                        textAlign: h, verticalAlign: { top: 'top', center: 'middle', middle: 'middle' }[e.vv || al.vertical] || 'bottom', whiteSpace: wrapT ? 'pre-wrap' : 'nowrap',
                        overflow: !wrapT && h === 'left' && val && nextEmpty ? 'visible' : 'hidden', textOverflow: 'clip',
                        borderRight: bsd(r2, c2, 'right') || bsd(r2, c2 + 1, 'left') || g0, borderBottom: bsd(r2, c2, 'bottom') || bsd(r2 + 1, c2, 'top') || g0,
                        ...(c === vc[0] ? { borderLeft: bsd(r, c, 'left') || g0 } : {}), ...(r === vr[0] ? { borderTop: bsd(r, c, 'top') || g0 } : {}),
                        ...(fr || fc ? { position: 'sticky', left: fc ? leftOff(c) : undefined, top: fr ? topOff(r) : undefined, zIndex: fr && fc ? 3 : 2 } : {}),
                      }
                      const inR = rg && r >= rg.r0 && r <= rg.r1 && c >= rg.c0 && c <= rg.c1
                      return (
                        <td key={c} className={'xc' + (inR ? ' rng' : '')} style={sty} rowSpan={rs > 1 ? rs : undefined} colSpan={cs > 1 ? cs : undefined}
                          onMouseDown={(ev) => { setSel(ev.shiftKey && sel ? { a: sel.a, b: [r, c] } : { a: [r, c], b: [r, c] }); setDrag(true); wrap.current?.focus() }}
                          onMouseEnter={() => drag && setSel((x) => x && { ...x, b: [r, c] })} onMouseUp={() => setDrag(false)}>
                          {String(val)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {m.boxes.map((b, i) => {
            const X = (c, o) => 46 + Array.from({ length: c }, (_, j) => (colHidden(j + 1) ? 0 : colPx(j + 1))).reduce((s, w) => s + w, 0) + o / 9525
            const Y = (r, o) => 22 + Array.from({ length: r }, (_, j) => (rowHidden(j + 1) ? 0 : rowPx(j + 1))).reduce((s, w) => s + w, 0) + o / 9525
            return <div key={i} className="xbox" style={{ left: X(b.c1, b.o1), top: Y(b.r1, b.p1), width: X(b.c2, b.o2) - X(b.c1, b.o1), height: Y(b.r2, b.p2) - Y(b.r1, b.p1) }}>{b.text}</div>
          })}
        </div>
      </div>
    </div>
  )
}
