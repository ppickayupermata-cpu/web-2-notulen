import { useState, useRef, useEffect } from 'react'
import FilterBar, { GROUP_FIELDS, ITEM_FIELDS } from '../components/FilterBar.jsx'
import GroupList from '../components/GroupList.jsx'
import DataTable from '../components/DataTable.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { useData } from '../context/DataContext.jsx'
import { filterGroups, filterRows } from '../utils/filter.js'
import { ALL_COLS } from '../config.js'
import Notulen from '../components/Notulen.jsx'
import { Undo2, Save, X, ArrowLeft, Filter } from 'lucide-react'

const G0 = { container: '', buyer: '' }
const I0 = { so: '', soItem: '', productCode: '' }

export default function InputData({ groupId, onBack }) {
  const { rows, groups, applyChanges, ask } = useData()
  const editable = ALL_COLS.map((c) => c.key)
  const { confirm, dialog } = useConfirm()
  const [f, setF] = useState(G0)              // cari container & buyer (daftar)
  const [fi, setFi] = useState(I0)            // cari SO, SO item, product code (di dalam container)
  const [openId, setOpenId] = useState(groupId || null)
  const editing = true // langsung bisa diisi: tidak ada tombol Edit lagi
  const [draft, setDraft] = useState({})      // { idBaris: { kolom: nilai } }
  const [history, setHistory] = useState([])  // tumpukan draft sebelumnya untuk Undo
  const [msg, setMsg] = useState('')
  const [nt, setNt] = useState(false)
  const [showFilter, setShowFilter] = useState(() => { try { return localStorage.getItem('pl_ui_filter') === '1' } catch { return false } }) // kotak filter bisa disembunyikan agar tabel lebih luas
  useEffect(() => { try { localStorage.setItem('pl_ui_filter', showFilter ? '1' : '0') } catch { /* mode privat */ } }, [showFilter])
  const calcRef = useRef(null) // fungsi hitung rumus dari tabel, dipakai notulen

  const open = groups.find((g) => g.id === openId)
  // Live: kursor admin + isian yang BELUM di-Submit dikirim (tertunda 0,35 dtk, denyut 6 dtk) agar tampilan live menunjukkannya langsung
  const [cursor, setCursor] = useState(null), pres = useRef({})
  pres.current = { groupId: openId, rowId: cursor?.rowId, key: cursor?.key, editing: !!cursor?.editing, draft }
  const kirimPres = () => { if (pres.current.groupId) ask('livePresence', pres.current, true) }
  useEffect(() => { if (!openId) return; const t = setTimeout(kirimPres, 350); return () => clearTimeout(t) }, [draft, cursor?.rowId, cursor?.key, cursor?.editing, openId])
  useEffect(() => { if (!openId) return; const h = setInterval(kirimPres, 6000); return () => { clearInterval(h); ask('livePresence', { groupId: openId, clear: true }, true) } }, [openId])
  const changed = Object.keys(draft).length
  const getValue = (r, k) => draft[r.id]?.[k] ?? r[k]

  const change = (id, k, v) => {
    setHistory((h) => [...h, draft])
    setDraft((d) => ({ ...d, [id]: { ...d[id], [k]: v } }))
    setMsg('')
  }
  const changeMany = (list) => { // banyak sel sekaligus (paste, isi bawah, hapus) = satu langkah Undo
    if (!list.length) return
    setHistory((h) => [...h, draft])
    setDraft((d) => { const n = { ...d }; for (const { id, key, v } of list) n[id] = { ...n[id], [key]: v }; return n })
    setMsg('')
  }
  // Tombol packing di tepi baris: dipacking = AREA otomatis "PACKING"; klik lagi = tag dilepas dan tulisan PACKING dihapus (isi AREA lain tidak disentuh)
  const tagPacking = (r) => {
    const area = String(getValue(r, 'area') ?? '').trim(), ch = { packed: r.packed ? '' : '1' }
    if (!r.packed) ch.area = 'PACKING'; else if (area.toUpperCase() === 'PACKING') ch.area = ''
    setDraft((d) => { if (!d[r.id] || !('area' in d[r.id])) return d; const { area: _x, ...sisa } = d[r.id]; const n = { ...d }; Object.keys(sisa).length ? (n[r.id] = sisa) : delete n[r.id]; return n }) // draft AREA baris ini diganti nilai dari server
    return applyChanges({ [r.id]: ch })
  }
  const undo = () => {
    if (!history.length) return
    setDraft(history[history.length - 1])
    setHistory((h) => h.slice(0, -1))
  }
  const reset = () => { setDraft({}); setHistory([]) }
  const submit = async () => {
    if (!changed) return
    const n = changed
    if (await applyChanges(draft)) { setMsg(`Tersimpan: ${n} baris diperbarui.`); reset() }
  }
  const cancel = async () => {
    if (!changed) return reset()
    const ok = await confirm({ title: 'Batalkan perubahan?', message: `${changed} baris yang sudah diisi akan dibuang.`, confirmLabel: 'Buang perubahan', danger: true })
    if (ok) reset()
  }
  const back = async () => {
    if (changed) {
      const ok = await confirm({ title: 'Keluar tanpa menyimpan?', message: `${changed} baris yang sudah diisi belum di-Submit dan akan dibuang.`, confirmLabel: 'Buang perubahan', danger: true })
      if (!ok) return
    }
    reset(); onBack ? onBack() : setOpenId(null); setFi(I0); setMsg('')
  }

  // satu halaman penuh tanpa scroll halaman: hanya tabel yang bisa digulir
  const penuh = !!open
  useEffect(() => { const c = document.querySelector('.content'); if (!penuh || !c) return; c.classList.add('fill'); return () => c.classList.remove('fill') }, [penuh])

  // ---- Isi satu container: edit di sini ----
  if (open) {
    const shown = filterRows(rows.filter((r) => r.groupId === open.id), fi)
    return (
      <div className="fillpage">
        <div className="toolbar wrap">
          <button className="btn" onClick={back}><ArrowLeft size={15} /> Kembali</button>
          <h2 style={{ margin: 0 }}>Input Data · Container {open.container} <small>Buyer {open.buyer || '-'}</small></h2>
          <span className="spacer" />
          <button className="btn" onClick={undo} disabled={!history.length}><Undo2 size={15} /> Undo</button>
          <button className="btn primary" onClick={submit} disabled={!changed}><Save size={15} /> Submit ({changed})</button>
          <button className="btn" onClick={cancel} disabled={!changed}><X size={15} /> Batal</button>
          {msg && <span className="msg ok">{msg}</span>}
        </div>
        {showFilter && <FilterBar fields={ITEM_FIELDS} value={fi} onChange={setFi} onClear={() => setFi(I0)} />}
        <DataTable fileName={`Container-${open.container}`} rows={shown} manage groupId={open.id} editable={editable} editing={editing} compactTools leadExtras={<button className={'btn sm' + (showFilter ? ' on' : '')} aria-pressed={showFilter} onClick={() => setShowFilter((v) => !v)} title="Tampilkan / sembunyikan filter SO, SO Item, Product Code"><Filter size={14} /> Filter{Object.values(fi).some(Boolean) ? ' •' : ''}</button>} getValue={getValue} onChange={change} onChangeMany={changeMany} onCursor={setCursor} onNotulen={(c) => { calcRef.current = c; setNt(true) }} onPack={tagPacking} />
        {nt && <Notulen calc={calcRef.current} group={open} rows={rows.filter((r) => r.groupId === open.id)} onClose={() => setNt(false)} />}
        {dialog}
      </div>
    )
  }

  // ---- Daftar container: cari Container & Buyer ----
  const shown = filterGroups(groups, f)
  return (
    <>
      <h2>Input Data</h2>
      <FilterBar fields={GROUP_FIELDS} value={f} onChange={setF} onClear={() => setF(G0)} />
      <div className="count">{shown.length} packing list {msg && <span className="msg ok"> · {msg}</span>}</div>
      <GroupList
        groups={shown} rows={rows}
        empty={groups.length ? 'Tidak ada packing list yang cocok.' : 'Belum ada data. PPIC perlu upload file Excel dulu.'}
        actions={(g) => <button className="btn sm primary" onClick={() => setOpenId(g.id)}>Input</button>}
      />
      {dialog}
    </>
  )
}
