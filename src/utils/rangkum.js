import {angka} from './notulenParse.js'
// Ringkasan berbasis aturan (tanpa API berbayar): buang obrolan ringan, kelompokkan per topik, ambil masalah dan tindak lanjut
const FILLER = /^(iya|ya|oke|ok|baik|siap|sip|setuju|betul|mantap|terima kasih|halo|tes|test)\b[\s.,!]*$/i
const MASALAH = /\b(kendala|masalah|belum|telat|terlambat|kurang|rusak|salah|revisi|komplain|cacat|reject|hold|tidak (?:ada|sesuai|mengerti|paham))\b/i
const TINDAK = /\b(akan|segera|harus|tolong|mohon|siapkan|kirim|selesaikan|follow ?up|cek|konfirmasi|target)\b/i
const INFO = /\b\d{4,5}[A-Z]{0,2}\b|\b(area|buyer|SO)\b|\b\d{1,2}\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\b/i
const TOPIK = [['Kayu', /kayu|jati|mahoni|multiplek|plywood/i], ['Gambar', /gambar|drawing|desain/i], ['Material', /material|bahan|stok/i], ['Warna dan finishing', /warna|finishing|painting|\bcat\b/i],
  ['Pengiriman', /kirim|loading|container|pengiriman/i], ['Kualitas', /kualitas|\bqc\b|reject|cacat/i], ['Produksi', /produksi|proses|mesin|\bline\b/i]]
const pendek = (s, n = 110) => s.length > n ? s.slice(0, n - 3) + '...' : s
const nama = (n) => n.replace(/\s*\(.*\)/, '')
export function rangkum(ucapan) {
  const topik = {}, masalah = [], tindak = []; let buang = 0
  ucapan.forEach(u => {
    const t = angka(u.t).trim(), w = t.split(/\s+/).length
    if (FILLER.test(t) || (w < 3 && !INFO.test(t))) { buang++; return }
    const m = MASALAH.test(t), a = TINDAK.test(t), i = INFO.test(t)
    if (!m && !a && !i) { buang++; return }
    const k = (TOPIK.find(x => x[1].test(t)) || ['Lainnya'])[0]; (topik[k] ||= []).push({n: u.n, t, jenis: m ? 'Masalah' : a ? 'Tindak lanjut' : 'Info'})
    if (m) masalah.push({n: u.n, t, k})
    if (a) tindak.push({n: u.n, t, tg: (t.match(/\b\d{1,2}\s+[a-z]{3,9}(?:\s+\d{4})?\b/i) || ['-'])[0]})
  })
  const names = Object.keys(topik), pic = [...new Set(tindak.map(x => nama(x.n)))]
  const kesimpulan = names.length ? `Rapat membahas ${names.length} topik: ${names.join(', ')}. ` +
    (masalah.length ? `Ada ${masalah.length} masalah yang disebut, misalnya pada topik ${masalah[0].k.toLowerCase()}: "${pendek(masalah[0].t)}". ` : 'Tidak ada masalah yang disebut. ') +
    (tindak.length ? `Ada ${tindak.length} tindak lanjut; penanggung jawab yang menyebutnya: ${pic.join(', ')}. ` : '') + `${buang} ucapan tidak penting dibuang.` : 'Belum ada pembahasan penting yang terdeteksi.'
  return {topik: names.map(k => ({judul: k, poin: topik[k]})), tindak, kesimpulan, buang}
}
