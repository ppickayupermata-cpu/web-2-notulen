import { useState } from 'react'
import { UploadCloud, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { bacaFileCoAds } from '../utils/parseCoAds.js'
import { bandingkan } from '../utils/diffRows.js'
import { CO_ADS_COLS } from '../config.js'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { useData } from '../context/DataContext.jsx'

const AKSI = { baru: 'Buat container baru', gabung: 'Gabungkan (baris baru saja, label old/new)', ganti: 'Ganti semua (cadangan otomatis)' }
const BATAS_PRATINJAU = 150

// Upload CO ADS: menyaring file DRAFT PL (kop surat, Total, daftar PO, catatan dibuang), tiap sheet = satu container berjenis CO ADS.
export default function UploadCoAds({ by }) {
  const { groups, rows: allRows, addGroup, mergeRows } = useData()
  const { confirm, dialog } = useConfirm()
  const [data, setData] = useState(null)       // { base, sheets: [{ ..., pilih, aksi, nama }], kosong, fileName }
  const [lihat, setLihat] = useState(0)        // indeks sheet yang dipratinjau
  const [msg, setMsg] = useState(null), [busy, setBusy] = useState(false), [over, setOver] = useState(false), [fileKey, setFileKey] = useState(0)

  const ada = (nama) => groups.find((g) => g.container.trim().toLowerCase() === String(nama).trim().toLowerCase())
  const namaBebas = (nama, pakai = new Set()) => { // nama + "-2", "-3", ... yang belum dipakai container lain
    const dipakai = new Set([...groups.map((g) => g.container.trim().toLowerCase()), ...pakai]); let i = 2, n = nama
    while (dipakai.has(n.trim().toLowerCase())) n = `${nama}-${i++}`
    return n
  }
  const reset = () => { setData(null); setLihat(0); setFileKey((k) => k + 1) }

  const terima = async (file) => {
    if (!file) return
    if (!/\.(xlsx|xls)$/i.test(file.name)) return setMsg({ type: 'err', text: 'File harus berformat .xlsx atau .xls.' })
    setBusy(true); setMsg(null)
    try {
      const r = await bacaFileCoAds(file)
      if (!r.sheets.length) throw new Error('Tidak ada tabel packing list yang ditemukan. Pastikan ada kolom "KP SO Number" dan "Product Description".')
      const sheets = r.sheets.map((s) => ({ ...s, pilih: !s.tanpaHeader, aksi: 'baru', nama: s.container }))
      setData({ ...r, sheets, fileName: file.name }); setLihat(0)
      setMsg({ type: 'ok', text: `${r.sheets.length} sheet terbaca dari ${file.name}. Periksa total Qty dan peringatan, lalu klik Simpan.` })
    } catch (e) { setData(null); setMsg({ type: 'err', text: e.message || 'File tidak bisa dibaca.' }) }
    setBusy(false)
  }
  const ubah = (i, p) => setData((d) => ({ ...d, sheets: d.sheets.map((s, j) => (j === i ? { ...s, ...p } : s)) }))

  const simpan = async () => {
    const pilih = data.sheets.filter((s) => s.pilih)
    if (!pilih.length) return setMsg({ type: 'err', text: 'Pilih minimal satu sheet.' })
    // nama container akhir: sheet yang "Buat container baru" dan namanya sudah dipakai diberi akhiran -2, -3 (unik juga antar sheet)
    const rencana = [], pakai = new Set()
    for (const s of pilih) {
      const nama = s.nama.trim() || s.container, tujuan = ada(nama)
      if (!tujuan) { const n = namaBebas(nama, pakai); pakai.add(n.toLowerCase()); rencana.push({ s, aksi: 'baru', nama: n }); continue }
      if (s.aksi === 'baru') { const n = namaBebas(nama, pakai); pakai.add(n.toLowerCase()); rencana.push({ s, aksi: 'baru', nama: n }) }
      else if (s.aksi === 'gabung' && tujuan.kind !== 'coads') return setMsg({ type: 'err', text: `Container ${tujuan.container} bukan packing list CO ADS, jadi tidak bisa digabung. Pilih "Buat container baru" atau ganti nama.` })
      else rencana.push({ s, aksi: s.aksi, nama: tujuan.container, tujuan })
    }
    const ringkas = rencana.map((x) => `• ${x.nama}: ${x.aksi === 'baru' ? 'dibuat baru' : x.aksi === 'ganti' ? 'DIGANTI (cadangan otomatis)' : 'digabung'} (${x.s.rows.length} baris)`).join('\n')
    const risiko = rencana.some((x) => x.aksi === 'ganti')
    if (!(await confirm({ title: `Simpan ${rencana.length} packing list CO ADS?`, message: ringkas, confirmLabel: 'Simpan', danger: risiko }))) return
    setBusy(true)
    const hasil = []
    for (const x of rencana) {
      const baris = x.s.rows.map(({ _baris, ...r }) => r)
      const header = { container: x.nama, buyer: x.s.buyer, packingListNo: data.base, shipDate: '', status: '', kind: 'coads' }
      let ok = false, info = ''
      if (x.aksi === 'gabung') {
        const lama = allRows.filter((r) => r.groupId === x.tujuan.id)
        const diff = bandingkan(baris, lama), baru = baris.filter((_, i) => diff[i].kind === 'baru')
        ok = baru.length ? await mergeRows(x.tujuan.id, baru, [], data.fileName) : true
        info = `${baru.length} baris baru ditambahkan (label NEW), ${lama.length} baris lama dipertahankan (label OLD)`
      } else {
        ok = await addGroup(header, baris, by, data.fileName, x.aksi === 'baru' ? 'baru' : undefined)
        info = `${baris.length} baris`
      }
      hasil.push({ nama: x.nama, ok, info })
      if (!ok) break
    }
    setBusy(false)
    const gagal = hasil.find((h) => !h.ok)
    if (gagal) setMsg({ type: 'err', text: `Gagal menyimpan ${gagal.nama}. ${hasil.length > 1 ? 'Sheet sebelumnya sudah tersimpan: ' + hasil.filter((h) => h.ok).map((h) => h.nama).join(', ') + '. ' : ''}Coba lagi.` })
    else { setMsg({ type: 'ok', text: 'Tersimpan: ' + hasil.map((h) => `${h.nama} (${h.info})`).join('; ') + '. Lihat di Monitoring, tab Packlist CO ADS.' }); reset() }
  }

  const s = data?.sheets[lihat]
  return (
    <>
      <div className="panel wide">
        <label className={'dropzone' + (over ? ' over' : '')} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); terima(e.dataTransfer.files[0]) }}>
          <UploadCloud size={22} /><span><b>Seret file DRAFT PL (CO ADS) ke sini</b> atau klik untuk memilih (.xlsx, .xls)</span>
          <input key={fileKey} type="file" accept=".xlsx,.xls" onChange={(e) => terima(e.target.files[0])} />
        </label>
        <p className="hint">Hanya tabel packing list yang diambil: NO, DSA PO Number, KP SO Number, Product Description, Type, Size, Wood Species, Qty, UoM. Kop surat, baris Total, daftar PO di bawahnya, dan catatan tidak ikut. NO, PO, dan SO yang kosong di baris lanjutan diisi dari baris di atasnya. Tiap sheet menjadi satu container. AREA, TARGET SELESAI, KETERANGAN, dan TANGGAL PENGIRIMAN dimulai kosong.</p>
        {busy && !data && <div className="msg">Membaca file...</div>}
        {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
        {data?.kosong?.length > 0 && <div className="hint">Sheet tanpa tabel dilewati: {data.kosong.join(', ')}.</div>}
      </div>

      {data && (
        <>
          <div className="tablewrap">
            <table className="grid">
              <thead><tr><th>Pakai</th><th>Sheet</th><th>Nama container</th><th>Buyer</th><th>Baris</th><th>SO</th><th>Total Qty</th><th>Jika nama sudah ada</th><th></th></tr></thead>
              <tbody>{data.sheets.map((x, i) => {
                const t = ada(x.nama), cocok = x.totalFile === null || x.totalFile === x.totalHitung
                return (
                  <tr key={x.sheet} className={i === lihat ? 'picked' : ''}>
                    <td><input type="checkbox" className="chk" checked={x.pilih} onChange={(e) => ubah(i, { pilih: e.target.checked })} aria-label={'Pakai sheet ' + x.sheet} /></td>
                    <td>{x.sheet}{x.tanpaHeader && <span className="chip-st up-berubah">tanpa judul</span>}</td>
                    <td><input style={{ minWidth: 220, width: '100%' }} value={x.nama} onChange={(e) => ubah(i, { nama: e.target.value })} aria-label={'Nama container ' + x.sheet} /></td>
                    <td>{x.buyer || '-'}</td><td>{x.rows.length}</td><td>{new Set(x.rows.map((r) => r.so)).size}</td>
                    <td>{x.totalHitung}{x.totalFile !== null && (cocok ? <span title="Sama dengan baris Total di file" className="ok-ic"> <CheckCircle2 size={14} /></span> : <span title={`Total di file: ${x.totalFile}`} className="warn-ic"> <AlertTriangle size={14} /> file {x.totalFile}</span>)}</td>
                    <td>{t ? <select value={x.aksi} onChange={(e) => ubah(i, { aksi: e.target.value })} aria-label="Tindakan"><option value="baru">{AKSI.baru}</option><option value="gabung">{AKSI.gabung}</option><option value="ganti">{AKSI.ganti}</option></select> : <span className="chip-st up-baru">Baru</span>}</td>
                    <td><button className="btn sm" onClick={() => setLihat(i)}>Pratinjau</button></td>
                  </tr>)
              })}</tbody>
            </table>
          </div>
          <div className="toolbar wrap">
            <button className="btn primary" disabled={busy} onClick={simpan}>{busy ? 'Menyimpan...' : `Simpan ${data.sheets.filter((x) => x.pilih).length} sheet`}</button>
            <button className="btn" disabled={busy} onClick={reset}>Batal</button>
          </div>

          {s && (
            <div className="panel wide">
              <h3 style={{ marginTop: 0 }}>Pratinjau sheet {s.sheet} <small>{s.rows.length} baris{s.rows.length > BATAS_PRATINJAU ? `, ${BATAS_PRATINJAU} pertama` : ''}</small></h3>
              {s.warnings.length > 0 && <div className="msg warn"><b>Perlu dicek:</b>{s.warnings.slice(0, 8).map((w, i) => <div key={i}>{w}</div>)}{s.warnings.length > 8 && <div>+{s.warnings.length - 8} peringatan lain</div>}</div>}
              {s.catatan.length > 0 && <div className="hint">Catatan di file (tidak diimpor): {s.catatan.join(' | ')}</div>}
              <div className="tablewrap">
                <table className="grid">
                  <thead><tr>{CO_ADS_COLS.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
                  <tbody>{s.rows.slice(0, BATAS_PRATINJAU).map((r, i) => <tr key={i}>{CO_ADS_COLS.map((c) => <td key={c.key}>{r[c.key] ?? ''}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      {dialog}
    </>
  )
}
