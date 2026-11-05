import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRightLeft } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { bandingkan, rencanaPindah } from '../utils/diffRows.js'

// Masukkan data lama (container asal) ke data baru (container tujuan) dengan memilih baris.
// Baris yang sudah ada di tujuan (SO + SO Item sama): isiannya (AREA, TARGET, KETERANGAN, TANGGAL PENGIRIMAN, tag packing) disalin.
// Baris yang belum ada di tujuan: ditambahkan dan diberi label OLD; isi tujuan sebelumnya berlabel NEW.
export default function PindahData({ groupId, onBack }) {
  const { groups, rows, moveRows } = useData()
  const { confirm, dialog } = useConfirm()
  const asal = groups.find((g) => g.id === groupId)
  const lain = groups.filter((g) => g.id !== groupId)
  const [toId, setToId] = useState(() => lain[lain.length - 1]?.id || '')
  const [pick, setPick] = useState(new Set())
  const [timpa, setTimpa] = useState(false), [hapusAsal, setHapusAsal] = useState(false)
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(null)

  const src = useMemo(() => rows.filter((r) => r.groupId === groupId), [rows, groupId])
  const tujuan = useMemo(() => rows.filter((r) => r.groupId === toId), [rows, toId])
  const diff = useMemo(() => (toId ? bandingkan(src, tujuan) : src.map(() => ({ kind: 'baru' }))), [src, tujuan, toId])
  if (!asal) return <><div className="toolbar"><button className="btn" onClick={onBack}><ArrowLeft size={15} /> Kembali</button></div><div className="empty">Container tidak ditemukan.</div></>

  const isi = (r) => ['area', 'target', 'ket', 'kirim'].some((k) => String(r[k] ?? '').trim()) || !!r.packed
  const ada = (i) => diff[i].kind !== 'baru'
  const set = (fn) => setPick(new Set(src.flatMap((r, i) => (fn(r, i) ? [r.id] : []))))
  const toggle = (id) => setPick((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const dipilih = src.filter((r) => pick.has(r.id))
  const rencana = toId ? rencanaPindah(dipilih, tujuan, { timpa }) : { insert: [], fill: [] }
  const tujuanG = groups.find((g) => g.id === toId)

  const jalan = async () => {
    const ok = await confirm({
      title: 'Masukkan data lama ke container baru?',
      message: `${rencana.insert.length} baris ditambahkan ke Container ${tujuanG.container} (label OLD) dan ${rencana.fill.length} baris yang sudah ada diisi dari data lama. Baris lama di Container ${tujuanG.container} berlabel NEW.${hapusAsal ? ` ${dipilih.length} baris dihapus dari Container ${asal.container}.` : ` Container ${asal.container} tidak diubah.`} Cadangan dibuat otomatis sebelum perubahan.`,
      confirmLabel: 'Masukkan', danger: hapusAsal,
    })
    if (!ok) return
    setBusy(true)
    const done = await moveRows({ fromId: groupId, toId, insert: rencana.insert, fill: rencana.fill, removeFrom: hapusAsal ? dipilih.map((r) => r.id) : [] })
    setBusy(false)
    if (done) { setPick(new Set()); setMsg({ type: 'ok', text: `Selesai: ${rencana.insert.length} baris ditambahkan (OLD), ${rencana.fill.length} baris diisi di Container ${tujuanG.container}.` }) }
    else setMsg({ type: 'err', text: 'Gagal memindahkan data. Tidak ada yang diubah, coba lagi.' })
  }

  return (
    <>
      <div className="toolbar wrap">
        <button className="btn" onClick={onBack}><ArrowLeft size={15} /> Kembali</button>
        <h2 style={{ margin: 0 }}>Pindah data lama <small>dari Container {asal.container}</small></h2>
      </div>
      {!lain.length ? <div className="empty">Belum ada container lain sebagai tujuan. Upload file yang sama lalu pilih <b>Buat container baru</b>.</div> : (
        <>
          <div className="panel wide">
            <div className="toolbar wrap">
              <label className="inline">Container tujuan (data baru)
                <select value={toId} onChange={(e) => { setToId(e.target.value); setMsg(null) }}>
                  {lain.map((g) => <option key={g.id} value={g.id}>{g.container}{g.buyer ? ` · ${g.buyer}` : ''} ({rows.filter((r) => r.groupId === g.id).length} baris)</option>)}
                </select></label>
              <label className="inline"><input type="checkbox" className="chk" checked={timpa} onChange={(e) => setTimpa(e.target.checked)} /> Timpa isian yang sudah terisi di tujuan</label>
              <label className="inline"><input type="checkbox" className="chk" checked={hapusAsal} onChange={(e) => setHapusAsal(e.target.checked)} /> Hapus dari container lama setelah dipindah</label>
            </div>
            <div className="toolbar wrap">
              <button className="btn sm" onClick={() => set(() => true)}>Pilih semua</button>
              <button className="btn sm" onClick={() => set((r) => isi(r))}>Hanya yang sudah terisi</button>
              <button className="btn sm" onClick={() => set((_, i) => !ada(i))}>Hanya yang belum ada di tujuan</button>
              <button className="btn sm" onClick={() => setPick(new Set())}>Kosongkan</button>
              <span className="spacer" />
              <button className="btn primary" disabled={busy || !toId || !dipilih.length || !(rencana.insert.length || rencana.fill.length || hapusAsal)} onClick={jalan}>
                <ArrowRightLeft size={15} /> {busy ? 'Memproses...' : `Masukkan ${dipilih.length} baris ke data baru`}</button>
            </div>
            {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
            <p className="hint">Baris dicocokkan lewat SO + SO Item. Sudah ada di tujuan = hanya isian (AREA, TARGET, KETERANGAN, TANGGAL PENGIRIMAN, tag packing) yang disalin ke kolom yang masih kosong. Belum ada = ditambahkan utuh dengan label OLD.</p>
          </div>
          <div className="tablewrap">
            <table className="grid">
              <thead><tr><th><input type="checkbox" className="chk" checked={!!src.length && pick.size === src.length} onChange={() => (pick.size === src.length ? setPick(new Set()) : set(() => true))} aria-label="Pilih semua" /></th>
                <th>Di tujuan</th><th>SO</th><th>SO Item</th><th>PO</th><th>Product Name</th><th>Qty</th><th>AREA</th><th>TARGET</th><th>KETERANGAN</th><th>KIRIM</th><th>Packing</th></tr></thead>
              <tbody>{src.map((r, i) => (
                <tr key={r.id} className={pick.has(r.id) ? 'picked' : ''}>
                  <td><input type="checkbox" className="chk" checked={pick.has(r.id)} onChange={() => toggle(r.id)} aria-label={'Pilih baris ' + (i + 1)} /></td>
                  <td><span className={'chip-st ' + (ada(i) ? 'up-sama' : 'up-baru')}>{ada(i) ? 'Sudah ada' : 'Belum ada'}</span></td>
                  <td>{r.so}</td><td>{r.soItem}</td><td>{r.po}</td><td>{r.productName}</td><td>{r.qty}</td>
                  <td>{r.area}</td><td>{r.target}</td><td>{r.ket}</td><td>{r.kirim}</td><td>{r.packed ? '✓' : ''}</td>
                </tr>))}</tbody>
            </table>
          </div>
        </>
      )}
      {dialog}
    </>
  )
}
