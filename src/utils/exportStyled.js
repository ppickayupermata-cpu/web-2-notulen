import ExcelJS from 'exceljs'
// Ekspor tabel ke .xlsx dengan gaya penuh: warna sel, warna teks, tebal, miring, rata, wrap text, merge, lebar kolom, border.
// Tiap SO menjadi blok tabel sendiri (judul SO + header kolom), tersusun ke bawah seperti di layar.
const argb = (h) => 'FF' + h.slice(1).toUpperCase()
export async function buildStyledXlsx({ cols, rows, calc, fmt, spans, widthPx, freeze = 0, segs, areas = [], sheetName = 'Data' }) {
  const wb = new ExcelJS.Workbook(), blok = segs?.length ? segs : [{ so: '', start: 0, end: rows.length }], multi = blok.length > 1
  const ws = wb.addWorksheet(String(sheetName || 'Data').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31), { views: [{ state: 'frozen', xSplit: freeze, ySplit: multi ? 0 : 1 }] })
  ws.columns = cols.map((c) => ({ width: Math.max(8, Math.round(widthPx(c.key) / 7)) }))
  const line = { style: 'thin', color: { argb: 'FF000000' } }, border = { top: line, left: line, bottom: line, right: line }
  const base = { name: 'Times New Roman', size: 12 }, rn = []
  blok.forEach((sg, si) => {
    if (multi) { if (si) ws.addRow([]); const t = ws.addRow(['SO ' + sg.so]); ws.mergeCells(t.number, 1, t.number, cols.length); t.getCell(1).font = { ...base, bold: true, size: 13 } }
    const head = ws.addRow(cols.map((c) => c.label)); head.height = 24
    head.eachCell((c) => { c.font = { ...base, bold: true }; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; c.border = border; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } } })
    rows.slice(sg.start, sg.end).forEach((r, k) => {
      const row = ws.addRow(cols.map((c) => {
        const v = calc(r, c.key)
        if (c.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)) }
        return c.key === 'qty' && v !== '' && Number.isFinite(Number(v)) ? Number(v) : v
      }))
      rn[sg.start + k] = row.number
      let wrapped = false
      cols.forEach((c, ci) => {
        const s = fmt(r.id, c.key), cell = row.getCell(ci + 1); if (s.wrap) wrapped = true
        cell.font = { ...base, bold: !!s.bold, italic: !!s.italic, ...(s.color ? { color: { argb: argb(s.color) } } : {}) }
        cell.alignment = { horizontal: s.align || (c.key === 'qty' ? 'center' : 'left'), vertical: 'middle', wrapText: !!s.wrap }
        cell.border = border
        if (c.type === 'date') cell.numFmt = 'dd/mm/yyyy'
        if (c.key === 'qty') cell.numFmt = '#,##0.###'
        if (s.bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(s.bg) } }
      })
      if (!wrapped) row.height = 21.95   // baris dengan wrap text dibiarkan otomatis agar Excel menyesuaikan tinggi
    })
  })
  const ai = cols.findIndex((c) => c.key === 'area'), lst = '"' + areas.join(',') + '"'
  if (ai >= 0 && areas.length && lst.length <= 255) rn.forEach((n) => { ws.getCell(n, ai + 1).dataValidation = { type: 'list', allowBlank: true, formulae: [lst], showErrorMessage: true, errorStyle: 'warning', errorTitle: 'AREA', error: 'Nilai di luar daftar bawaan. Tetap dipakai?' } })   // dropdown AREA di Excel
  if (!multi && rn.length) ws.autoFilter = { from: { row: rn[0] - 1, column: 1 }, to: { row: rn[rn.length - 1], column: cols.length } }
  ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, ...(multi ? {} : { printTitlesRow: '1:1' }) }   // siap cetak A4 landscape, 1 halaman lebar
  Object.entries(spans).forEach(([k, s]) => { const [i, c] = k.split(',').map(Number); if (rn[i]) ws.mergeCells(rn[i], c + 1, rn[i] + s.rs - 1, c + s.cs) })
  return wb.xlsx.writeBuffer()
}
