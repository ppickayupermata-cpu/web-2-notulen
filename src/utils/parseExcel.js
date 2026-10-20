import * as XLSX from 'xlsx'

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
// Nama header di Excel -> field di aplikasi (tambah alias bila header berbeda)
const ALIAS = {
  productcode: 'productCode', productname: 'productName', po: 'po',
  so: 'so', soitem: 'soItem', material: 'material', type: 'type',
  size: 'size', qty: 'qty', uom: 'uom', group: 'group',
  // RM s/d WH sengaja tidak dibaca dari Excel: selalu mulai kosong
}

const LABELS = { packinglistno: 'packingListNo', container: 'container', buyer: 'buyer', shipdate: 'shipDate', status: 'status', revision: 'revision' }
const fmt = (f, v) => {
  if (typeof v === 'number' && f === 'shipDate') {
    const d = XLSX.SSF.parse_date_code(v)
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  return String(v).trim()
}

export async function parseExcel(file) {
  const wb = XLSX.read(await file.arrayBuffer())
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  // cari baris header: baris yang punya kolom SO dan Qty
  const h = grid.findIndex((r) => { const n = r.map(norm); return n.includes('so') && n.includes('qty') })
  if (h < 0) throw new Error('Baris header tidak ditemukan. Pastikan ada kolom "SO" dan "Qty".')
  // bagian atas file: label di satu sel, nilainya di sel terisi berikutnya pada baris yang sama
  const header = { packingListNo: '', container: '', buyer: '', shipDate: '', status: '', revision: '' }
  grid.slice(0, h).forEach((r) => r.forEach((c, i) => {
    const f = LABELS[norm(c)]; if (!f) return
    const j = r.findIndex((v, k) => k > i && v !== '')
    if (j > 0 && !LABELS[norm(r[j])]) header[f] = fmt(f, r[j])
  }))
  const map = grid[h].map((c) => ALIAS[norm(c)])
  const out = []
  for (const r of grid.slice(h + 1)) {
    const row = { area: '', target: '', ket: '', kirim: '' }
    map.forEach((f, i) => { if (f && r[i] !== '') row[f] = String(r[i]).trim() })
    if (row.so) out.push(row) // baris tanpa SO (judul grup, SUB TOTAL, dll) dilewati
  }
  return { header, rows: out }
}
