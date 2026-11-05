// Upload CO ADS: menyaring file "DRAFT PL" (packing list CO ADS) menjadi baris tabel saja.
// Yang diambil: tabel NO / DSA PO Number / KP SO Number / Product Description / Type / Size / Wood Species / Qty / UoM.
// Yang dibuang: kop surat & alamat, baris Total, daftar PO di bawah Total, catatan, dan kolom liar di luar tabel.
// Tiap sheet (R0, R1, R2, ...) menjadi satu container. Fungsi di sini murni (menerima array of arrays) agar mudah diuji.

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const ALIAS = {
  no: 'no', nomor: 'no',
  dsaponumber: 'po', dsapo: 'po', ponumber: 'po', po: 'po',
  kpsonumber: 'so', kpso: 'so', sonumber: 'so', so: 'so',
  productdescription: 'productName', description: 'productName', deskripsi: 'productName',
  type: 'type', tipe: 'type', size: 'size', ukuran: 'size',
  woodspecies: 'material', wood: 'material', material: 'material',
  qty: 'qty', quantity: 'qty', uom: 'uom', unit: 'uom',
}
const URUT = ['no', 'po', 'so', 'productName', 'type', 'size', 'material', 'qty', 'uom'] // susunan kolom A..I bila sheet tanpa header
const txt = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(+v.toFixed(6))) : String(v ?? '').replace(/\s+/g, ' ').trim())
const kosong = (v) => txt(v) === ''
const angka = (v) => { const s = txt(v).replace(/,/g, ''); return s !== '' && Number.isFinite(Number(s)) ? Number(s) : null }

export function namaDasar(fileName) {
  return String(fileName || 'CO ADS').replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() || 'CO ADS'
}

// grid: array of arrays satu sheet. Hasil: { sheet, rows, buyer, tanpaHeader, totalFile, totalHitung, warnings, catatan }
export function bacaSheetCoAds(grid, sheet = '') {
  const hasil = { sheet, rows: [], buyer: '', tanpaHeader: false, totalFile: null, totalHitung: 0, warnings: [], catatan: [] }
  // kop: "Messrs:" -> nama buyer di sel terisi berikutnya
  for (const r of grid.slice(0, 15)) {
    const i = r.findIndex((c) => norm(c) === 'messrs'); if (i < 0) continue
    const v = r.slice(i + 1).find((c) => !kosong(c)); if (v) { hasil.buyer = txt(v); break }
  }
  // baris header: punya kolom KP SO Number + Product Description (nama lain diterima lewat ALIAS)
  let h = grid.findIndex((r) => { const f = r.map((c) => ALIAS[norm(c)]); return f.includes('so') && f.includes('productName') })
  let kol = {}
  if (h >= 0) grid[h].forEach((c, i) => { const f = ALIAS[norm(c)]; if (f && !(f in kol)) kol[f] = i })
  else {
    // tanpa header: baris pertama dengan C = nomor SO (angka), D = deskripsi, H = qty (angka); kolom dianggap A..I standar
    const i = grid.findIndex((r) => { const so = txt(r[2]); return /^\d{6,}$/.test(so) && !kosong(r[3]) && angka(r[7]) !== null })
    if (i < 0) { hasil.warnings.push('Tabel tidak ditemukan (tidak ada kolom "KP SO Number" dan "Product Description").'); return hasil }
    h = i - 1; kol = Object.fromEntries(URUT.map((k, j) => [k, j])); hasil.tanpaHeader = true
    hasil.warnings.push('Sheet ini tidak punya baris judul kolom; dibaca sebagai kolom A sampai I standar.')
  }
  const ambil = (r, k) => (k in kol ? r[kol[k]] : '')
  const carry = { no: '', po: '', so: '' }
  let selesai = false, catat = false
  for (let i = h + 1; i < grid.length && !selesai; i++) {
    const r = grid[i]
    if (r.every(kosong)) continue
    // baris Total: berhenti (daftar PO / catatan di bawahnya bukan baris data)
    const t = r.findIndex((c) => norm(c) === 'total')
    if (t >= 0) { hasil.totalFile = r.slice(t + 1).map(angka).find((x) => x !== null) ?? null; selesai = true; continue }
    const nama = txt(ambil(r, 'productName')), qty = ambil(r, 'qty'), tipe = txt(ambil(r, 'type'))
    if (!nama || (kosong(qty) && !tipe)) { // bukan baris data: simpan teksnya sebagai catatan (mis. "NOTE ITEM")
      const teks = r.map(txt).filter(Boolean).join(' · ')
      if (/^note/i.test(teks)) catat = true
      else if (catat && hasil.catatan.length < 8) hasil.catatan.push(teks)
      continue
    }
    // NO / DSA PO / KP SO hanya tertulis di baris pertama tiap kelompok: baris di bawahnya diisi dari atas (sel gabungan juga)
    for (const k of ['no', 'po', 'so']) { const v = txt(ambil(r, k)); if (v) carry[k] = v }
    const q = angka(qty)
    const row = { no: carry.no, po: carry.po, so: carry.so, productName: nama, type: tipe, size: txt(ambil(r, 'size')), material: txt(ambil(r, 'material')), qty: q === null ? txt(qty) : String(q), uom: txt(ambil(r, 'uom')), _baris: i + 1 }
    if (q === null) hasil.warnings.push(`Baris ${i + 1}: Qty "${txt(qty)}" bukan angka.`)
    else hasil.totalHitung += q
    if (!row.so) hasil.warnings.push(`Baris ${i + 1}: KP SO Number kosong.`)
    hasil.rows.push(row)
  }
  // satuan yang berbeda dari kebanyakan baris (mis. salah ketik PAA)
  const cnt = new Map(); hasil.rows.forEach((r) => cnt.set(r.uom, (cnt.get(r.uom) || 0) + 1))
  const umum = [...cnt].sort((a, b) => b[1] - a[1])[0]?.[0]
  hasil.rows.forEach((r) => { if (r.uom !== umum) hasil.warnings.push(`Baris ${r._baris}: UoM "${r.uom || '(kosong)'}" berbeda dari umumnya (${umum}).`) })
  hasil.totalHitung = +hasil.totalHitung.toFixed(6)
  if (hasil.totalFile !== null && hasil.totalFile !== hasil.totalHitung) hasil.warnings.push(`Total Qty di file ${hasil.totalFile}, hasil baca ${hasil.totalHitung}.`)
  return hasil
}

// Baca seluruh workbook: satu hasil per sheet yang berisi tabel
export async function bacaFileCoAds(file) {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(await file.arrayBuffer())
  const base = namaDasar(file.name)
  const sheets = wb.SheetNames.map((nama) => ({ ...bacaSheetCoAds(XLSX.utils.sheet_to_json(wb.Sheets[nama], { header: 1, defval: '', raw: true }), nama), container: `${base} - ${nama}`.slice(0, 120) }))
  return { base, sheets: sheets.filter((s) => s.rows.length) , kosong: sheets.filter((s) => !s.rows.length).map((s) => s.sheet) }
}
