import JSZip from 'jszip'
import {tgl, jam} from './notulenUtil.js'
// Memakai file contoh (public/template-notulen.docx) sebagai cetakan: bingkai halaman, kop judul, huruf, dan bullet tetap sama.
const RF = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>'
const X = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const run = (t, p = '') => `<w:r><w:rPr>${RF}${p}</w:rPr><w:t xml:space="preserve">${X(t)}</w:t></w:r>`
const tab = `<w:r><w:rPr>${RF}</w:rPr><w:tab/></w:r>`
const para = (inner = '', ppr = '', rpr = '') => `<w:p><w:pPr>${ppr}<w:rPr>${RF}${rpr}</w:rPr></w:pPr>${inner}</w:p>`
const TABS = '<w:tabs><w:tab w:val="left" w:pos="1380"/><w:tab w:val="left" w:pos="2100"/></w:tabs>'
const info = (a, b) => run(a) + tab + run(':') + tab + run(b)
export const NOTE_DEFAULT = 'TOLONG AGAR DI PERHATIKAN OLEH TIAP BAGIAN AGAR MENGERJAKAN TARGET SESUAI DENGAN HASIL MEETING INI'

export async function buatDocx(tpl, judul, m, hadir, groups, note, bold) {
  const zip = await JSZip.loadAsync(tpl), d = await zip.file('word/document.xml').async('string'), head = d.slice(0, d.indexOf('<w:body>') + 8)
  const body = d.slice(head.length), p0 = body.match(/<w:p[ >][\s\S]*?<\/w:p>/)[0], sect = d.slice(d.lastIndexOf('<w:sectPr'), d.lastIndexOf('</w:sectPr>') + 11)
  const END = '</mc:AlternateContent></w:r>', keep = p0.slice(0, p0.indexOf(END) + END.length) // bingkai halaman dari contoh
  let x = keep + info('Hari,Tanggal', tgl(m.tanggal)) + '</w:p>'
  x += para(info('Tempat', 'Ruang Meeting ' + m.ruang), TABS) + para(info('Jam', `${jam(m.mulai)} WIB s/d ${jam(m.selesai)}`), TABS) + para(run('Peserta') + tab + run(':'), TABS) + para()
  hadir.forEach(h => { x += para(run(h), '<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="3"/><w:numId w:val="1"/></w:numPr><w:ind w:left="2127"/>') })
  x += para() + para()
  groups.forEach(g => {
    const gb = g.bold ?? bold, B = gb ? '<w:b/>' : '', num = gb ? 39 : 36
    x += para(run('*' + g.h, '<w:b/>'), '<w:ind w:left="720"/>', '<w:b/>')
    g.items.forEach(i => { const cl = i.color ? `<w:color w:val="${i.color}"/>` : ''; x += para(run(i.t, B + cl), `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${num}"/></w:numPr>`, B + cl) })
    x += para()
  })
  if (note) { const R = '<w:b/><w:i/><w:color w:val="FF0000"/>'; x += para(run('NOTE : ' + note, R), '', R) }
  zip.file('word/document.xml', head + x + sect + '</w:body></w:document>')
  const h = await zip.file('word/header1.xml').async('string'); zip.file('word/header1.xml', h.split('NOTULEN MEETING CUSTOM ORDER').join(X(judul)))
  return zip.generateAsync({type: 'uint8array', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})
}
