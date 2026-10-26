import JSZip from 'jszip'
// Memakai file contoh (public/template-notulen.docx) sebagai cetakan: bingkai halaman, kop judul, huruf, dan bullet tetap sama.
const RF = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>'
const X = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const run = (t, p = '') => `<w:r><w:rPr>${RF}${p}</w:rPr><w:t xml:space="preserve">${X(t)}</w:t></w:r>`
const tab = `<w:r><w:rPr>${RF}</w:rPr><w:tab/></w:r>`
const para = (inner = '', ppr = '', rpr = '') => `<w:p><w:pPr>${ppr}<w:rPr>${RF}${rpr}</w:rPr></w:pPr>${inner}</w:p>`
const TABS = '<w:tabs><w:tab w:val="left" w:pos="1380"/><w:tab w:val="left" w:pos="2100"/></w:tabs>'
const info = (a, b) => run(a) + tab + run(':') + tab + run(b)
export const NOTE_DEFAULT = 'TOLONG AGAR DI PERHATIKAN OLEH TIAP BAGIAN AGAR MENGERJAKAN TARGET SESUAI DENGAN HASIL MEETING INI'

const LBL = { 'hari,tanggal': 'Hari,Tanggal', tempat: 'Tempat', jam: 'Jam', peserta: 'Peserta' }
// blocks dari parseIsi (utils/isiNotulen.js): seluruh halaman mengikuti teks di preview
export async function buatDocx(tpl, blocks, bold = true) {
  const zip = await JSZip.loadAsync(tpl), d = await zip.file('word/document.xml').async('string'), head = d.slice(0, d.indexOf('<w:body>') + 8)
  const body = d.slice(head.length), p0 = body.match(/<w:p[ >][\s\S]*?<\/w:p>/)[0], sect = d.slice(d.lastIndexOf('<w:sectPr'), d.lastIndexOf('</w:sectPr>') + 11)
  const END = '</mc:AlternateContent></w:r>', keep = p0.slice(0, p0.indexOf(END) + END.length) // bingkai halaman dari contoh
  const B = bold ? '<w:b/>' : '', num = bold ? 39 : 36
  const infoRun = (l, v) => (v ? info(l, v) : run(l) + tab + run(':'))
  const rest = blocks.filter((b) => b.type !== 'title'), judul = blocks.find((b) => b.type === 'title')?.t
  while (rest[0]?.type === 'blank') rest.shift() // jarak setelah judul diabaikan: keterangan pertama menempel di paragraf berbingkai
  let x = keep
  if (rest[0]?.type === 'info') { x += infoRun(LBL[rest[0].label.toLowerCase()] || rest[0].label, rest[0].v) + '</w:p>'; rest.shift() } else x += '</w:p>' // baris keterangan pertama menempel di paragraf berbingkai
  rest.forEach((b) => {
    const cl = b.color ? `<w:color w:val="${b.color}"/>` : ''
    switch (b.type) {
      case 'blank': x += para(); break
      case 'info': x += para(infoRun(LBL[b.label.toLowerCase()] || b.label, b.v), TABS); break
      case 'peserta': x += para(run(b.t), '<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="3"/><w:numId w:val="1"/></w:numPr><w:ind w:left="2127"/>'); break
      case 'head': x += para(run('*' + b.t, '<w:b/>'), '<w:ind w:left="720"/>', '<w:b/>'); break
      case 'note': { const R = '<w:b/><w:i/><w:color w:val="FF0000"/>'; x += para(run(b.t, R), '', R); break }
      case 'bullet': x += para(run(b.t, B + cl), `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${b.lvl || 0}"/><w:numId w:val="${num}"/></w:numPr>`, B + cl); break
      default: x += para(run(b.t, B + cl), '<w:ind w:left="720"/>', B + cl)
    }
  })
  zip.file('word/document.xml', head + x + sect + '</w:body></w:document>')
  if (judul) { const h = await zip.file('word/header1.xml').async('string'); zip.file('word/header1.xml', h.split('NOTULEN MEETING CUSTOM ORDER').join(X(judul))) }
  return zip.generateAsync({type: 'uint8array', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})
}
