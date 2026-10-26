import * as XLSX from 'xlsx'

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
// Nama header di Excel -> field di aplikasi (tambah alias bila header berbeda)
const ALIAS = {
  productcode: 'productCode', itemcode: 'productCode', kodebarang: 'productCode', kodeproduk: 'productCode', partno: 'productCode', partnumber: 'productCode',
  productname: 'productName', description: 'productName', deskripsi: 'productName', itemname: 'productName', namabarang: 'productName', namaproduk: 'productName',
  po: 'po', pono: 'po', ponumber: 'po', purchaseorder: 'po',
  so: 'so', sono: 'so', sonumber: 'so', salesorder: 'so',
  soitem: 'soItem', soitemno: 'soItem', item: 'soItem', itemno: 'soItem', line: 'soItem',
  material: 'material', bahan: 'material', type: 'type', tipe: 'type',
  size: 'size', ukuran: 'size', qty: 'qty', quantity: 'qty', jumlah: 'qty', uom: 'uom', unit: 'uom', satuan: 'uom', group: 'group',
  // Glass Type, Nett Weight, RM s/d WH, AREA, TARGET, KETERANGAN, TANGGAL PENGIRIMAN sengaja tidak dibaca dari Excel
}

const LABELS = { packinglistno: 'packingListNo', container: 'container', buyer: 'buyer', shipdate: 'shipDate', status: 'status', revision: 'revision' }
const fmt = (f, v) => {
  if (typeof v === 'number' && f === 'shipDate') {
    const d = XLSX.SSF.parse_date_code(v)
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  return String(v).trim()
}

// override: { [indeksKolom]: fieldAtau'' } = pemetaan manual dari layar Upload ('' = abaikan kolom). Mengembalikan juga daftar kolom + kolom wajib yang belum terpetakan.
export async function parseExcel(file, override = {}) {
  const wb = XLSX.read(await file.arrayBuffer())
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const filled = (r) => r.filter((v) => String(v).trim() !== '').length
  // cari baris header: baris yang punya kolom SO dan Qty (termasuk nama lain seperti Sales Order / Quantity);
  // bila tidak ada, tebak: baris paling terisi di 30 baris pertama (pengguna bisa memetakan kolomnya sendiri)
  let h = grid.findIndex((r) => { const f = r.map((c) => ALIAS[norm(c)]); return f.includes('so') && f.includes('qty') })
  let tebak = false
  if (h < 0) {
    const top = grid.slice(0, 30).map((r, i) => [i, filled(r)]).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]
    if (!top || top[1] < 3) throw new Error('Baris header tidak ditemukan. Pastikan ada kolom \"SO\" dan \"Qty\".')
    h = top[0]; tebak = true
  }
  // bagian atas file: label di satu sel, nilainya di sel terisi berikutnya pada baris yang sama
  const header = { packingListNo: '', container: '', buyer: '', shipDate: '', status: '', revision: '' }
  grid.slice(0, h).forEach((r) => r.forEach((c, i) => {
    const f = LABELS[norm(c)]; if (!f) return
    const j = r.findIndex((v, k) => k > i && v !== '')
    if (j > 0 && !LABELS[norm(r[j])]) header[f] = fmt(f, r[j])
  }))
  const map = grid[h].map((c, i) => (i in override ? override[i] || undefined : ALIAS[norm(c)]))
  // File tanpa label (mis. testing_025.xlsx): satu sel teks berdiri sendiri di atas/bawah header = nomor Packing List
  const lone = (r) => { const c = r.filter((v) => v !== ''); return c.length === 1 && typeof c[0] === 'string' && !LABELS[norm(c[0])] ? c[0].trim() : '' }
  if (!header.packingListNo) header.packingListNo = grid.slice(0, h).map(lone).find(Boolean) || ''
  const out = []
  for (const r of grid.slice(h + 1)) {
    const row = { area: '', target: '', ket: '', kirim: '' }
    map.forEach((f, i) => { if (f && r[i] !== '') row[f] = String(r[i]).trim() })
    if (row.so) out.push(row) // baris tanpa SO (judul grup, SUB TOTAL, dll) dilewati
    else if (!out.length && !header.packingListNo) header.packingListNo = lone(r) // hanya sebelum baris data pertama
  }
  if (!header.buyer && header.packingListNo) { const m = header.packingListNo.match(/^([A-Za-z]{2,5})\d/); if (m) header.buyer = m[1].toUpperCase() } // AAW1010002450/... -> AAW
  if (!header.container) header.container = header.packingListNo || out[0]?.so || ''
  const cols = grid[h].map((c, i) => ({ i, label: String(c).trim(), field: map[i] || '' })).filter((c) => c.label)
  const missing = ['so', 'qty'].filter((f) => !map.includes(f))
  return { header, rows: out, cols, missing, tebak }
}
