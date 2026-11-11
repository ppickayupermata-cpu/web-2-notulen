import { useState } from 'react'
import { ListChecks, GitMerge, Replace, X, Undo2, UploadCloud, Columns3, FolderPlus } from 'lucide-react'
import { parseExcel } from '../utils/parseExcel.js'
import { bandingkan, cariGrup } from '../utils/diffRows.js'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { useData } from '../context/DataContext.jsx'
import { INFO_COLS } from '../config.js'
import UploadCoAds from './UploadCoAds.jsx'

const TAG = { baru: 'Baru', sama: 'Sudah ada', berubah: 'Berubah' }
const KIND = { ganti: 'sebelum diganti', hapus: 'sebelum dihapus', gabung: 'sebelum digabung', pindah: 'sebelum dipindah ke Barang Jadi', 'sebelum-pulih': 'sebelum pemulihan' }
const LBL = Object.fromEntries(INFO_COLS.map((c) => [c.key, c.label]))

function UploadBiasa({ by }) {
  const { groups, rows: allRows, backups, addGroup, mergeRows, restoreBackup, dropBackup } = useData()
  const { confirm, dialog } = useConfirm()
  const [parsed, setParsed] = useState(null) // { header, rows, fileName }
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [fileKey, setFileKey] = useState(0)
  const [custom, setCustom] = useState(false)
  const [pick, setPick] = useState(new Set())  // indeks baris upload yang diterapkan (mode custom)
  const [hapus, setHapus] = useState(new Set()) // id baris lama (tidak ada di file baru) yang dipilih untuk dihapus
  const [src, setSrc] = useState(null)        // file yang sedang dibaca (untuk baca ulang saat pemetaan kolom diubah)
  const [ovr, setOvr] = useState({})          // pemetaan kolom manual { indeksKolom: field }
  const [over, setOver] = useState(false)     // sedang menyeret file di atas area upload
  const [baruOpen, setBaruOpen] = useState(false), [namaBaru, setNamaBaru] = useState('')  // form "Buat container baru"

  const reset = () => { setParsed(null); setSrc(null); setOvr({}); setCustom(false); setPick(new Set()); setHapus(new Set()); setBaruOpen(false); setNamaBaru(''); setFileKey((k) => k + 1) }
  const baca = async (file, override = {}) => {
    try {
      const p = await parseExcel(file, override)
      if (!p.header.container) throw new Error('Nomor Container tidak ditemukan di bagian atas file.')
      setParsed({ ...p, fileName: file.name }); setCustom(false); setPick(new Set()); setHapus(new Set())
      setMsg(p.missing.length
        ? { type: 'err', text: `Kolom ${p.missing.map((f) => (f === 'so' ? 'SO' : 'Qty')).join(' dan ')} belum terpetakan. Atur di panel "Pemetaan kolom" di bawah.` }
        : { type: 'ok', text: `${p.rows.length} baris terbaca di ${new Set(p.rows.map((r) => r.so)).size} SO. Tiap SO ditampilkan di tabel terpisah. Periksa lalu klik Import.` })
    } catch (err) { setParsed(null); setMsg({ type: 'err', text: err.message }) }
  }
  const terimaFile = (file) => { if (!file) return; if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return setMsg({ type: 'err', text: 'File harus berformat .xlsx, .xls, atau .csv.' }); setSrc(file); setOvr({}); baca(file) }
  const onFile = (e) => terimaFile(e.target.files[0])
  const onDrop = (e) => { e.preventDefault(); setOver(false); terimaFile(e.dataTransfer.files[0]) }
  const petakan = (i, field) => { const o = { ...ovr, [i]: field }; setOvr(o); baca(src, o) }

  // container yang sama / SO yang sama sudah tersimpan? -> bandingkan baris
  const target = parsed ? cariGrup(parsed.header, parsed.rows, groups, allRows) : null
  const lama = target ? allRows.filter((r) => r.groupId === target.id) : []
  const byId = new Map(lama.map((r) => [r.id, r]))
  const diff = parsed && target ? bandingkan(parsed.rows, lama) : null
  const cnt = (k) => (diff ? diff.filter((d) => d.kind === k).length : 0)
  const nBaru = cnt('baru'), nUbah = cnt('berubah'), nSama = cnt('sama'), hilang = diff?.hilang || []
  // SO di file ini yang ternyata juga ada di container LAIN
  const lain = (() => {
    if (!parsed) return []
    const so = new Set(parsed.rows.map((r) => String(r.so).trim())), m = new Map(), cn = new Map(groups.map((g) => [g.id, g.container]))
    allRows.forEach((r) => { if (r.groupId !== target?.id && so.has(String(r.so).trim()) && cn.get(r.groupId) !== parsed.header.container) m.set(r.so, new Set([...(m.get(r.so) || []), cn.get(r.groupId)])) })
    return [...m].map(([s, c]) => `SO ${s} di container ${[...c].join(', ')}`)
  })()

  const finish = (ok, text) => { setBusy(false); if (!ok) return setMsg({ type: 'err', text: 'Upload gagal, data belum tersimpan. Coba lagi.' }); setMsg({ type: 'ok', text }); reset() }
  const info = (i) => { const { area, target: t, ket, kirim, ...rest } = parsed.rows[i]; return rest }

  const gabung = async () => { // hanya menambah baris baru (kolom input kosong); data lama dan isiannya tidak disentuh
    setBusy(true)
    const list = parsed.rows.map((_, i) => i).filter((i) => diff[i].kind === 'baru').map(info)
    finish(await mergeRows(target.id, list, [], parsed.fileName), `Container ${target.container}: ${list.length} baris baru ditambahkan (label NEW), ${lama.length} baris lama dipertahankan utuh (label OLD), termasuk ${hilang.length} baris yang tidak ada di file ini.`)
  }
  const bukaBaru = () => { // usulkan nama container baru yang belum dipakai
    const pakai = new Set(groups.map((g) => g.container)); let i = 2
    while (pakai.has(`${target.container}-${i}`)) i++
    setNamaBaru(`${target.container}-${i}`); setBaruOpen(true)
  }
  const buatBaru = async () => {
    const nama = namaBaru.trim()
    if (!nama) return setMsg({ type: 'err', text: 'Nama container baru tidak boleh kosong.' })
    if (groups.some((g) => g.container.trim().toLowerCase() === nama.toLowerCase())) return setMsg({ type: 'err', text: `Container ${nama} sudah ada. Pakai nama lain.` })
    setBusy(true)
    finish(await addGroup({ ...parsed.header, container: nama }, parsed.rows, by, parsed.fileName, 'baru'), `Container baru ${nama} dibuat (${parsed.rows.length} baris). Container ${target.container} tidak diubah; data lama bisa dimasukkan lewat tombol Pindah data di kolom Aksi Monitoring.`)
  }
  const terapkan = async () => {
    setBusy(true)
    const ins = [], upd = []
    ;[...pick].forEach((i) => (diff[i].kind === 'baru' ? ins.push(info(i)) : upd.push({ ...info(i), id: diff[i].exId })))
    finish(await mergeRows(target.id, ins, upd, parsed.fileName, [...hapus]), `Container ${target.container}: ${ins.length} baris baru, ${upd.length} diperbarui (isian dipertahankan), ${hapus.size} dihapus.`)
  }
  const gantiSemua = async () => {
    const { header, rows, fileName } = parsed
    if (target) {
      const ok = await confirm({ title: 'Ganti semua data?', message: `Data container ${target.container} yang lama akan diganti ${rows.length} baris dari file ini, termasuk semua isian AREA, TARGET SELESAI, KETERANGAN, TANGGAL PENGIRIMAN dan tag packing. Cadangan otomatis disimpan di server sehingga penggantian bisa dibatalkan dari komputer mana pun.`, confirmLabel: 'Ganti semua', danger: true })
      if (!ok) return
    }
    setBusy(true)
    finish(await addGroup(target ? { ...header, container: target.container } : header, rows, by, fileName), `Container ${target?.container || header.container}: ${rows.length} baris berhasil diimport${target ? ' (data lama diganti)' : ''}.`)
  }
  const pulihkan = async (b) => {
    const ada = groups.find((g) => g.container === b.container), nAda = ada ? allRows.filter((r) => r.groupId === ada.id).length : 0
    const msgC = ada
      ? `Container ${b.container} yang sekarang (${nAda} baris) akan dicadangkan dulu, lalu diganti isi cadangan ini (${b.count} baris, lengkap dengan isian dan tag packing). Cadangan ini tetap tersimpan.`
      : `Container ${b.container} dibuat kembali dari cadangan ini (${b.count} baris, lengkap dengan isian dan tag packing). Cadangan ini tetap tersimpan.`
    if (!(await confirm({ title: 'Pulihkan data container?', message: msgC, confirmLabel: 'Pulihkan', danger: !!ada }))) return
    setBusy(true); const ok = await restoreBackup(b.id); setBusy(false)
    setMsg(ok ? { type: 'ok', text: `Container ${b.container} berhasil dipulihkan (${b.count} baris).${ada ? ' Isi sebelumnya tersimpan di daftar cadangan.' : ''}` } : { type: 'err', text: 'Pemulihan gagal. Cadangan masih tersimpan, coba lagi.' })
  }
  const flip = (set, setter) => (k) => setter((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const toggle = flip(pick, setPick), toggleDel = flip(hapus, setHapus)
  const barus = () => new Set(diff.flatMap((d, i) => (d.kind === 'baru' ? [i] : [])))

  const h = parsed?.header
  return (
    <>
      <h2>Upload Excel Packing List</h2>
      {!parsed && backups?.length > 0 && (
        <div className="msg warn"><b>Cadangan container di server</b> (dibuat otomatis sebelum data diganti, dihapus, atau digabung):
          {backups.slice(0, 6).map((b) => (
            <div key={b.id} className="bkrow">Container {b.container} · {b.count} baris · {KIND[b.kind] || b.kind || 'cadangan'} · {new Date(b.at).toLocaleString('id-ID')}{b.by ? ' · ' + b.by : ''}{' '}
              <button className="btn sm" disabled={busy} onClick={() => pulihkan(b)}><Undo2 size={14} /> Pulihkan</button>{' '}
              <button className="btn sm" onClick={() => dropBackup(b.id)}>Buang cadangan</button></div>
          ))}</div>
      )}
      <div className="panel wide">
        <label className={'dropzone' + (over ? ' over' : '')} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
          <UploadCloud size={22} /><span><b>Seret file Excel ke sini</b> atau klik untuk memilih (.xlsx, .xls, .csv)</span>
          <input key={fileKey} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
        </label>
        <p className="hint">Bagian atas file dibaca sebagai parent group: Container dan Buyer (juga Packing List No, Ship Date, Status). Kolom AREA sampai TANGGAL PENGIRIMAN di Excel tidak dibaca.</p>
        {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
        {parsed && (
          <>
            <div className="hint">Container <b>{h.container}</b> · Buyer <b>{h.buyer || '-'}</b> · {h.packingListNo} · {h.shipDate}</div>
            {lain.length > 0 && <div className="msg warn">Perhatian, SO berikut juga ada di container lain: {lain.slice(0, 6).join('; ')}{lain.length > 6 ? ` (+${lain.length - 6} lainnya)` : ''}. Pastikan file ini diupload ke container yang benar.</div>}
            <details className="pemetaan" open={parsed.missing.length > 0 || parsed.tebak}>
              <summary><Columns3 size={14} /> Pemetaan kolom {parsed.tebak ? '(header ditebak, mohon periksa)' : ''}</summary>
              <p className="hint">Tiap kolom Excel dipetakan ke kolom aplikasi. Pilih "Abaikan" untuk kolom yang tidak dipakai. Kolom wajib: SO dan Qty.</p>
              <div className="pgrid">{parsed.cols.map((c) => (
                <label key={c.i}><span title={c.label}>{c.label}</span>
                  <select value={c.field} onChange={(e) => petakan(c.i, e.target.value)}>
                    <option value="">Abaikan</option>{INFO_COLS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select></label>))}</div>
            </details>
            {!target && <button className="btn primary" disabled={busy || !parsed.rows.length} onClick={gantiSemua}>{busy ? 'Menyimpan...' : `Import ${parsed.rows.length} baris`}</button>}
            {target && (
              <div className="updiff">
                <div className="msg warn"><b>Container {target.container}</b> sudah tersimpan ({lama.length} baris). Perbandingan dengan file ini: <b>{nBaru} baris baru</b>, {nUbah} berubah, {nSama} sama{hilang.length ? `, ${hilang.length} tidak ada di file ini` : ''}.</div>
                <div className="toolbar wrap">
                  <button className="btn primary" disabled={busy || !nBaru} onClick={gabung} title="Tambahkan baris baru dengan kolom input kosong; data lama dan isiannya dipertahankan"><GitMerge size={15} /> Gabungkan &amp; pertahankan data lama ({nBaru} baris baru)</button>
                  <button className="btn" disabled={busy} onClick={custom ? () => setCustom(false) : () => { setPick(barus()); setCustom(true) }}>{custom ? <><X size={15} /> Tutup pilihan</> : <><ListChecks size={15} /> Custom select</>}</button>
                  <button className="btn" disabled={busy} onClick={bukaBaru} title="Simpan file ini sebagai container terpisah; container lama tidak diubah"><FolderPlus size={15} /> Buat container baru</button>
                  <button className="btn danger" disabled={busy} onClick={gantiSemua}><Replace size={15} /> Ganti semua</button>
                </div>
                {baruOpen && (
                  <div className="toolbar wrap">
                    <label className="inline">Nama container baru <input value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buatBaru()} autoFocus /></label>
                    <button className="btn primary" disabled={busy} onClick={buatBaru}>{busy ? 'Menyimpan...' : `Buat (${parsed.rows.length} baris)`}</button>
                    <button className="btn" disabled={busy} onClick={() => setBaruOpen(false)}>Batal</button>
                  </div>
                )}
                {hilang.length > 0 && (
                  <details className="pemetaan">
                    <summary>{hilang.length} baris lama tidak ada di file ini (tetap dipertahankan bila Gabungkan)</summary>
                    <div className="tablewrap" style={{ padding: 0 }}><table className="grid"><thead><tr><th>Status</th><th>SO</th><th>SO Item</th><th>PO</th><th>Product Name</th><th>Qty</th></tr></thead>
                      <tbody>{hilang.map((r) => <tr key={r.id} className="up-hilang"><td><span className="chip-st up-hilang">OLD</span></td><td>{r.so}</td><td>{r.soItem}</td><td>{r.po}</td><td>{r.productName}</td><td>{r.qty}</td></tr>)}</tbody></table></div>
                  </details>
                )}
                {!nBaru && !nUbah && !hilang.length && <p className="hint">Tidak ada baris baru maupun perubahan: isi file sama dengan data tersimpan.</p>}
              </div>
            )}
          </>
        )}
      </div>
      {parsed && target && custom && (
        <div className="panel wide">
          <div className="toolbar wrap"><b>Pilih baris yang diterapkan</b><span className="hint">Baru = ditambahkan. Berubah / Sudah ada = hanya kolom identitas diperbarui; AREA, TARGET, KETERANGAN, TANGGAL PENGIRIMAN dan tag packing tetap.</span></div>
          <div className="toolbar wrap">
            <button className="btn sm" onClick={() => setPick(new Set(diff.map((_, i) => i)))}>Pilih semua</button>
            <button className="btn sm" onClick={() => setPick(barus())}>Hanya baru</button>
            <button className="btn sm" onClick={() => setPick(new Set(diff.flatMap((d, i) => (d.kind !== 'sama' ? [i] : []))))}>Baru + berubah</button>
            <button className="btn sm" onClick={() => { setPick(new Set()); setHapus(new Set()) }}>Kosongkan</button>
            <button className="btn primary" disabled={busy || !(pick.size || hapus.size)} onClick={terapkan}>Terapkan ({pick.size} baris{hapus.size ? `, hapus ${hapus.size}` : ''})</button>
          </div>
          <div className="tablewrap" style={{ padding: 0 }}>
            <table className="grid">
              <thead><tr><th /><th>Status</th><th>SO</th><th>SO Item</th><th>PO</th><th>Product Name</th><th>Qty</th><th>Perbedaan (lama → baru)</th></tr></thead>
              <tbody>
                {parsed.rows.map((r, i) => { const d = diff[i], ex = byId.get(d.exId); return (
                  <tr key={i} className={'up-' + d.kind}>
                    <td><input type="checkbox" className="chk" checked={pick.has(i)} onChange={() => toggle(i)} aria-label={'Pilih baris ' + (i + 1)} /></td>
                    <td><span className={'chip-st up-' + d.kind}>{TAG[d.kind]}</span></td>
                    <td>{r.so}</td><td>{r.soItem}</td><td>{r.po}</td><td>{r.productName}</td><td>{r.qty}</td>
                    <td>{d.beda?.map((k) => `${LBL[k]}: ${ex?.[k] || '(kosong)'} → ${r[k] || '(kosong)'}`).join(' · ')}</td>
                  </tr>) })}
                {hilang.map((r) => (
                  <tr key={r.id} className="up-hilang">
                    <td><input type="checkbox" className="chk" checked={hapus.has(r.id)} onChange={() => toggleDel(r.id)} aria-label="Hapus baris ini dari container" /></td>
                    <td><span className="chip-st up-hilang">Tidak ada di file</span></td>
                    <td>{r.so}</td><td>{r.soItem}</td><td>{r.po}</td><td>{r.productName}</td><td>{r.qty}</td>
                    <td>{hapus.has(r.id) ? 'Akan DIHAPUS' : 'Dipertahankan (centang untuk menghapus)'}</td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {parsed && (() => {
        const bySo = new Map(); parsed.rows.forEach((r, i) => bySo.set(r.so, [...(bySo.get(r.so) || []), i]))
        const cols = INFO_COLS
        const W = 140, tw = W * cols.length + (diff ? 90 : 0)
        return [...bySo].map(([so, list]) => (
          <div key={so} className="sobox">
            <div className="sotitle">SO {so}<small> · {list.length} baris{diff ? ` · ${list.filter((i) => diff[i].kind === 'baru').length} baru` : ''}</small></div>
            <div className="tablewrap" style={{ padding: 0 }}>
              <table className="grid fx" style={{ width: tw }}>
                <colgroup>{diff && <col style={{ width: 90 }} />}{cols.map((c) => <col key={c.key} style={{ width: W }} />)}</colgroup>
                <thead><tr>{diff && <th>Status</th>}{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
                <tbody>{list.map((i) => <tr key={i} className={diff ? 'up-' + diff[i].kind : ''}>{diff && <td><span className={'chip-st up-' + diff[i].kind}>{TAG[diff[i].kind]}</span></td>}{cols.map((c) => <td key={c.key}>{parsed.rows[i][c.key]}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </div>
        ))
      })()}
      {dialog}
    </>
  )
}

// Dua pilihan upload: biasa (format packing list standar) dan CO ADS (menyaring file DRAFT PL). Keduanya tetap terpasang agar isian tidak hilang saat berpindah pilihan.
export default function UploadExcel({ by }) {
  const [mode, setMode] = useState('biasa')
  return (
    <>
      <div className="upmode" role="tablist" aria-label="Jenis upload">
        <button role="tab" aria-selected={mode === 'biasa'} className={mode === 'biasa' ? 'on' : ''} onClick={() => setMode('biasa')}>Upload biasa</button>
        <button role="tab" aria-selected={mode === 'coads'} className={mode === 'coads' ? 'on' : ''} onClick={() => setMode('coads')}>Upload CO ADS</button>
      </div>
      <div style={{ display: mode === 'biasa' ? 'block' : 'none' }}><UploadBiasa by={by} /></div>
      <div style={{ display: mode === 'coads' ? 'block' : 'none' }}><h2>Upload CO ADS</h2><UploadCoAds by={by} /></div>
    </>
  )
}
