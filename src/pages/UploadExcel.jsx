import { useState } from 'react'
import { parseExcel } from '../utils/parseExcel.js'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { useData } from '../context/DataContext.jsx'
import { INFO_COLS } from '../config.js'

export default function UploadExcel({ by }) {
  const { groups, addGroup } = useData()
  const { confirm, dialog } = useConfirm()
  const [parsed, setParsed] = useState(null) // { header, rows, fileName }
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [fileKey, setFileKey] = useState(0)

  const pick = async (e) => {
    const file = e.target.files[0]; if (!file) return
    try {
      const p = await parseExcel(file)
      if (!p.header.container) p.header.container = p.rows[0]?.so || ''
      if (!p.header.container) throw new Error('Nomor Container tidak ditemukan di bagian atas file.')
      setParsed({ ...p, fileName: file.name })
      setMsg({ type: 'ok', text: `${p.rows.length} baris terbaca di ${new Set(p.rows.map((r) => r.so)).size} SO. Tiap SO ditampilkan di tabel terpisah. Periksa lalu klik Import.` })
    } catch (err) { setParsed(null); setMsg({ type: 'err', text: err.message }) }
  }

  const doImport = async () => {
    const { header, rows, fileName } = parsed
    if (groups.some((g) => g.container === header.container)) {
      const ok = await confirm({
        title: 'Container sudah ada',
        message: `Container ${header.container} sudah tersimpan. Import akan MENGGANTI data lama beserta isian RM sampai WH-nya.`,
        confirmLabel: 'Ganti data', danger: true,
      })
      if (!ok) return
    }
    setBusy(true)
    const done = await addGroup(header, rows, by, fileName) // server mengganti container lama bila ada
    setBusy(false)
    if (!done) return setMsg({ type: 'err', text: 'Upload gagal, data belum tersimpan. Coba lagi.' })
    setMsg({ type: 'ok', text: `Container ${header.container}: ${rows.length} baris berhasil diimport.` })
    setParsed(null); setFileKey((k) => k + 1)
  }

  const h = parsed?.header
  return (
    <>
      <h2>Upload Excel Packing List</h2>
      <div className="panel">
        <input key={fileKey} type="file" accept=".xlsx,.xls,.csv" onChange={pick} />
        <p className="hint">Bagian atas file dibaca sebagai parent group: Container dan Buyer (juga Packing List No, Ship Date, Status). Kolom RM sampai WH di Excel tidak dibaca.</p>
        {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
        {parsed && (
          <>
            <div className="hint">Container <b>{h.container}</b> · Buyer <b>{h.buyer || '-'}</b> · {h.packingListNo} · {h.shipDate}</div>
            <button className="btn primary" disabled={busy} onClick={doImport}>{busy ? 'Menyimpan...' : `Import ${parsed.rows.length} baris`}</button>
          </>
        )}
      </div>
      {parsed && (() => {
        const by = new Map(); parsed.rows.forEach((r) => by.set(r.so, [...(by.get(r.so) || []), r]))
        const W = 140, tw = W * INFO_COLS.length
        return [...by].map(([so, list]) => (
          <div key={so} className="sobox">
            <div className="sotitle">SO {so}<small> · {list.length} baris</small></div>
            <div className="tablewrap" style={{ padding: 0 }}>
              <table className="grid fx" style={{ width: tw }}>
                <colgroup>{INFO_COLS.map((c) => <col key={c.key} style={{ width: W }} />)}</colgroup>
                <thead><tr>{INFO_COLS.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
                <tbody>{list.map((r, i) => <tr key={i}>{INFO_COLS.map((c) => <td key={c.key}>{r[c.key]}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </div>
        ))
      })()}
      {dialog}
    </>
  )
}
