import ExcelJS from 'exceljs'
import { ALL_COLS } from '../config.js'

const nama = (s, dipakai) => { // nama sheet Excel: maks 31 karakter, tanpa \ / ? * [ ] :, harus unik
  let n = String(s || 'Container').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Container', i = 2
  while (dipakai.has(n.toLowerCase())) { const suf = ` (${i++})`; n = n.slice(0, 31 - suf.length) + suf }
  dipakai.add(n.toLowerCase()); return n
}
const tgl = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v ?? '')); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null }
const line = { style: 'thin', color: { argb: 'FF7C8399' } }, border = { top: line, left: line, bottom: line, right: line }

// Semua container -> satu file Excel: sheet "Ringkasan" + satu sheet per container (nilai apa adanya, bukan rumus).
export async function bangunExcelSemua({ groups, rows, extra = [] }) {
  const wb = new ExcelJS.Workbook(); wb.creator = 'Monitoring Packing List'; wb.created = new Date()
  const dipakai = new Set(['ringkasan'])
  const kolom = [...ALL_COLS, ...extra.map((c) => ({ key: c.key, label: c.label, type: 'text' }))]
  const rs = wb.addWorksheet('Ringkasan')
  rs.columns = [{ header: 'Container', width: 34 }, { header: 'Buyer', width: 14 }, { header: 'Packing List No', width: 34 }, { header: 'Ship Date', width: 14 }, { header: 'Status', width: 14 }, { header: 'Jumlah Baris', width: 14 }, { header: 'Sudah Dipacking', width: 16 }, { header: 'Tanggal Upload', width: 16 }, { header: 'Sheet', width: 24 }]
  const head = (ws) => { const h = ws.getRow(1); h.font = { bold: true }; h.alignment = { vertical: 'middle', wrapText: true }; h.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } }; c.border = border }); ws.views = [{ state: 'frozen', ySplit: 1 }] }
  for (const g of groups) {
    const list = rows.filter((r) => r.groupId === g.id), sh = nama(g.container, dipakai), ws = wb.addWorksheet(sh)
    ws.columns = [...kolom.map((c) => ({ header: c.label, width: Math.min(46, Math.max(10, c.label.length + 2, ...list.slice(0, 200).map((r) => String(r[c.key] ?? '').length + 2))) })), { header: 'Sudah Dipacking', width: 18 }]
    list.forEach((r) => {
      const row = ws.addRow([...kolom.map((c) => { const v = r[c.key] ?? ''; if (c.type === 'date') return tgl(v) || v; return c.key === 'qty' && v !== '' && Number.isFinite(Number(v)) ? Number(v) : v }), r.packed ? 'Ya' : ''])
      kolom.forEach((c, i) => { if (c.type === 'date' && row.getCell(i + 1).value instanceof Date) row.getCell(i + 1).numFmt = 'dd/mm/yyyy' })
      row.eachCell({ includeEmpty: true }, (c) => { c.border = border }); if (r.packed) row.eachCell({ includeEmpty: true }, (c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } } })
    })
    head(ws); if (list.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: kolom.length + 1 } }
    rs.addRow([g.container, g.buyer, g.packingListNo, g.shipDate, g.status, list.length, list.filter((r) => r.packed).length, g.addedAt, sh])
  }
  head(rs)
  return wb.xlsx.writeBuffer()
}

export const unduhBlob = (data, fileName, type) => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = fileName; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
export const stamp = () => new Date().toLocaleDateString('sv-SE')
