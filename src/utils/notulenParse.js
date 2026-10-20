// Aturan kata kunci: judul / catatan / topik, nomor order, area, buyer, SO, target
const KW = /\b(kayu|gambar|revisi|kendala|material|spesifikasi|warna|komplain|kualitas|tidak (?:mengerti|paham)|belum (?:mengerti|paham))\b/i
const ANGKA = {nol:0,satu:1,dua:2,tiga:3,empat:4,lima:5,enam:6,tujuh:7,delapan:8,sembilan:9}
const W = 'nol|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan'
// "dua empat tujuh nol lima" -> "24705"
export const angka = (t) => t.replace(new RegExp(`\\b(?:(?:${W})\\s+){3,}(?:${W})\\b`, 'gi'), m => m.split(/\s+/).map(w => ANGKA[w.toLowerCase()]).join(''))
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export function parse(text) {
  const groups = [], topik = []; let cur = null, note = ''
  angka(text).split(/\n+/).map(s => s.trim()).filter(Boolean).forEach(l => {
    let m
    if ((m = l.match(/^judul[:,]?\s+(.+)/i))) { cur = {h: m[1].toUpperCase(), items: []}; groups.push(cur) }
    else if ((m = l.match(/^catatan[:,]?\s+(.+)/i))) note = m[1].toUpperCase()
    else if (/^topik\b/i.test(l) || (!/^\d{4,5}[A-Z]{0,2}\b/.test(l) && KW.test(l))) {
      const x = l.replace(/^topik[:,]?\s*/i, ''), g = (r) => (x.match(r) || [])[1]?.trim() || '-'
      let tg = g(/target(?:\s+selesai)?\s+(?:[A-Za-z]{2,}\s+)?(\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?)/i)
      if (tg === '-') tg = g(/target(?:\s+selesai)?\s+([^,;]+)/i)
      const first = x.split(',')[0]
      topik.push({t: (first.length < 40 ? first : (x.match(KW) || ['Lainnya'])[0]).toUpperCase(),
        b: g(/buyer\s+([^,;]+?)(?=\s*(?:,|;|\bso\b|\barea\b|\bbagian\b|\btarget\b|$))/i),
        so: g(/\bSO\s*(?:number|no\.?)?\s*[:#]?\s*(\d[\w-]*)/i), a: g(/\b(?:area|bagian|lokasi)\s+([A-Za-z]{2,})/i).toUpperCase(), tg,
        r: x.length > 140 ? x.slice(0, 137) + '...' : x})
    } else {
      if (!cur) { cur = {h: 'HASIL MEETING', items: []}; groups.push(cur) }
      const t = cap(l.replace(/\b(area|bagian)\s+([a-z]{2,})/gi, (_, a, b) => a.toLowerCase() + ' ' + b.toUpperCase()).replace(/\btanggal\s+(\d)\b/gi, 'tanggal 0$1'))
      cur.items.push({t, order: (t.match(/^\d{4,5}[A-Z]{0,2}/) || [''])[0]})
    }
  })
  return {groups, topik, note}
}
