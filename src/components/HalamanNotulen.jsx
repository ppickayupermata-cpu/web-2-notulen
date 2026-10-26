import { useLayoutEffect, useRef } from 'react'
import { List, UserPlus, Wand2, Heading1 } from 'lucide-react'
import { parseIsi } from '../utils/isiNotulen.js'

// Halaman notulen seperti kertas Word: tata letak tetap (kotak judul, keterangan sejajar, bullet, NOTE merah) tetapi SEMUA bisa diketik langsung.
// Model data tetap teks (lihat utils/isiNotulen.js); tiap baris = <div class="ln" data-t="jenis">.
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const LBL = { 'hari,tanggal': 'Hari,Tanggal', tempat: 'Tempat', jam: 'Jam', peserta: 'Peserta' }
const ln = (t, inner, extra = '') => `<div class="ln" data-t="${t}"${extra}>${inner || '<br>'}</div>`
const bersih = (s) => String(s ?? '').replace(/\u200b/g, '').replace(/\u00a0/g, ' ')

export const toHtml = (text, done) => parseIsi(text, done).map((b) => {
  const dn = b.color ? ' data-done="1"' : ''
  if (b.type === 'blank') return ln('blank', '')
  if (b.type === 'info') { const k = LBL[b.label.toLowerCase()] || b.label; return `<div class="ln" data-t="info" data-k="${esc(k)}"><span class="ik" contenteditable="false">${esc(k)}</span><span class="ic" contenteditable="false">:</span><span class="iv">${esc(b.v) || '<br>'}</span></div>` }
  if (b.type === 'bullet') return ln('bullet', esc(b.t), ` data-l="${b.lvl || 0}"${dn}`)
  return ln(b.type, esc(b.t), dn) // title, head, text, note, peserta
}).join('') || ln('text', '')

export function domToText(root) {
  const out = []
  root.childNodes.forEach((n) => {
    if (n.nodeType === 3) { out.push(bersih(n.data).trim()); return }
    if (n.nodeType !== 1) return
    const t = n.dataset.t || 'text'
    if (t === 'info') {
      const k = n.dataset.k || bersih(n.querySelector('.ik')?.textContent), v = n.querySelector('.iv') ? bersih(n.querySelector('.iv').textContent) : bersih(n.textContent).replace(k, '')
      out.push(`${k} : ${v.replace(/\s+/g, ' ').trim()}`.trimEnd()); return
    }
    const raw = bersih(n.innerText ?? n.textContent).replace(/\n$/, '')
    raw.split('\n').forEach((x) => {
      const s = x.replace(/\s+$/, '')
      if (t === 'blank' || !s.trim()) return out.push('')
      out.push(t === 'peserta' ? '• ' + s.trim() : t === 'bullet' ? (n.dataset.l === '1' ? '  ' : '') + '• ' + s.trim() : t === 'head' ? '*' + s.trim() : s)
    })
  })
  return out.join('\n')
}

const lineOf = (root, node) => { while (node && node.parentNode !== root) node = node.parentNode; return node && node.nodeType === 1 ? node : null }
const caret = (el, end = false) => { const r = document.createRange(); r.selectNodeContents(el); r.collapse(!end); const s = getSelection(); s.removeAllRanges(); s.addRange(r) }
const mk = (type, l) => { const d = document.createElement('div'); d.className = 'ln'; d.dataset.t = type; if (l) d.dataset.l = l; return d }
const kosong = (el) => !bersih(el.textContent).trim()

export default function HalamanNotulen({ text, done, onText, onPeserta, onSusun, canSusun }) {
  const ref = useRef(null), last = useRef(null), dirty = useRef(false)
  useLayoutEffect(() => { const r = ref.current; if (r && text !== last.current) { r.innerHTML = toHtml(text, done); last.current = text; dirty.current = false } }, [text])

  const emit = () => { const t = domToText(ref.current); dirty.current = true; last.current = t; onText(t) }
  const range = () => { const s = getSelection(); return s.rangeCount && ref.current.contains(s.getRangeAt(0).startContainer) ? s.getRangeAt(0) : null }
  const selLines = () => {
    const r = range(); if (!r) return []
    const a = lineOf(ref.current, r.startContainer), b = lineOf(ref.current, r.endContainer), arr = [...ref.current.children]
    if (!a || !b) return []
    const i = arr.indexOf(a), j = arr.indexOf(b); return arr.slice(Math.min(i, j), Math.max(i, j) + 1)
  }
  const jenis = (el, t) => { el.dataset.t = t; delete el.dataset.l; if (!el.childNodes.length) el.innerHTML = '<br>' }
  const toggle = (dari, ke) => { // dari: jenis yang bisa diubah; semua sudah `ke` -> kembali jadi teks
    const ls = selLines().filter((l) => [...dari, ke].includes(l.dataset.t) && !(l.dataset.t === 'text' && kosong(l)))
    if (!ls.length) return
    const semua = ls.every((l) => l.dataset.t === ke); ls.forEach((l) => jenis(l, semua ? 'text' : ke)); emit()
  }
  const enter = () => {
    const r = range(); if (!r) return false
    if (!r.collapsed) r.deleteContents()
    const line = lineOf(ref.current, r.startContainer); if (!line) return false
    const t = line.dataset.t || 'text'
    if (t === 'info') { const n = mk(/peserta/i.test(line.dataset.k || '') ? 'peserta' : 'text'); n.innerHTML = '<br>'; line.after(n); caret(n); return true }
    if ((t === 'bullet' || t === 'peserta') && kosong(line)) { jenis(line, 'text'); line.innerHTML = '<br>'; caret(line); return true } // Enter di bullet kosong = akhiri daftar
    const tail = document.createRange(); tail.setStart(r.startContainer, r.startOffset); tail.setEnd(line, line.childNodes.length)
    const n = mk(t === 'bullet' || t === 'peserta' ? t : 'text', t === 'bullet' ? line.dataset.l : ''); n.appendChild(tail.extractContents())
    if (kosong(n)) n.innerHTML = '<br>'; if (kosong(line)) line.innerHTML = '<br>'
    line.after(n); caret(n); return true
  }
  const onKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) { if (e.key.toLowerCase() === 'b') e.preventDefault(); return } // tebal diatur tampilan, bukan manual
    if (e.key === 'Enter' && !e.shiftKey) { if (enter()) { e.preventDefault(); emit() } else e.preventDefault(); return }
    if (e.key === 'Tab') { e.preventDefault(); const ls = selLines().filter((l) => l.dataset.t === 'bullet'); ls.forEach((l) => { l.dataset.l = e.shiftKey ? '0' : '1' }); if (ls.length) emit(); return }
    if (e.key === 'Backspace') {
      const r = range(); if (!r || !r.collapsed) return
      const line = lineOf(ref.current, r.startContainer); if (!line) return
      const pre = document.createRange(); pre.setStart(line, 0); pre.setEnd(r.startContainer, r.startOffset)
      if (bersih(pre.toString()) || line.dataset.t === 'info') return
      const t = line.dataset.t, prev = line.previousElementSibling
      if (['bullet', 'peserta', 'head'].includes(t)) { e.preventDefault(); jenis(line, 'text'); emit() } // di awal baris bullet: lepas bullet dulu (seperti Word)
      else if (prev && ['info', 'title'].includes(prev.dataset.t)) { e.preventDefault(); if (kosong(line)) { line.remove(); caret(prev.querySelector('.iv') || prev, true); emit() } } // jangan menggabung ke baris keterangan
    }
  }
  const onInput = () => { // ketik "- " / "• " di awal baris = bullet, "* " = judul
    const r = range(), line = r && lineOf(ref.current, r.startContainer)
    if (line && line.dataset.t === 'text') {
      const m = bersih(line.textContent).match(/^\s*(-|•|–|\*)\s(.*)$/)
      if (m) { jenis(line, m[1] === '*' ? 'head' : 'bullet'); line.textContent = m[2]; if (!m[2]) line.innerHTML = '<br>'; caret(line, true) }
    }
    emit()
  }
  const onPaste = (e) => { e.preventDefault(); const t = e.clipboardData.getData('text/plain').replace(/\r/g, ''); document.execCommand('insertText', false, t); emit() } // tempel selalu teks polos
  const onBlur = () => { if (!dirty.current) return; const t = domToText(ref.current); ref.current.innerHTML = toHtml(t, done); last.current = t; dirty.current = false; onText(t) } // rapikan struktur setelah mengetik/menempel
  const btn = (p) => ({ onMouseDown: (e) => e.preventDefault(), ...p })

  return (
    <>
      <div className="isi-tools noprint">
        <button className="btn sm" {...btn({ onClick: () => toggle(['text', 'head'], 'bullet'), title: 'Jadikan / lepas bullet pada baris terpilih' })}><List size={14} /> Bullet</button>
        <button className="btn sm" {...btn({ onClick: () => toggle(['text', 'bullet'], 'head'), title: 'Jadikan / lepas judul tebal (diawali *)' })}><Heading1 size={14} /> Judul</button>
        <button className="btn sm" {...btn({ onClick: onPeserta, title: 'Perbarui daftar peserta (absen QR + manual) tanpa mengubah bagian lain' })}><UserPlus size={14} /> Peserta terbaru</button>
        <button className="btn sm" disabled={!canSusun} {...btn({ onClick: onSusun, title: 'Isi ulang seluruh halaman dari tabel dan data meeting' })}><Wand2 size={14} /> Susun ulang</button>
        <span className="hint">Klik langsung di halaman lalu ketik apa saja. Enter di bullet = bullet baru, Enter di bullet kosong = selesai, Tab / Shift+Tab = bullet tingkat 2. Ketik "- " di awal baris untuk bullet.</span>
      </div>
      <div ref={ref} className="doc" contentEditable suppressContentEditableWarning spellCheck={false} role="textbox" aria-multiline="true" aria-label="Halaman notulen (bisa diedit langsung)"
        onInput={onInput} onKeyDown={onKeyDown} onPaste={onPaste} onBlur={onBlur} />
    </>
  )
}
