import { useConfirm } from '../../components/ConfirmDialog.jsx'
import { useData } from '../../context/DataContext.jsx'
import { addMonths, showDate, today } from '../../utils/date.js'

export default function Schedules({ by }) {
  const { groups, schedules, settings, setSettings, removeSchedule } = useData()
  const { confirm, dialog } = useConfirm()
  const own = new Set(schedules.filter((s) => s.kind === 'container').map((s) => s.groupId))
  const overdue = settings.autoDelete ? groups.filter((g) => !own.has(g.id) && today() >= addMonths(g.addedAt, settings.months)).length : 0

  const cancel = async (s) => {
    const ok = await confirm({
      title: 'Batalkan jadwal hapus?',
      message: `${s.label} tidak jadi dihapus pada ${showDate(s.date)}.`,
      confirmLabel: 'Batalkan jadwal',
    })
    if (ok) removeSchedule(s.id, by)
  }
  const sorted = [...schedules].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      <div className="panel">
        <h3 style={{ margin: 0 }}>Hapus otomatis data lama</h3>
        <label className="inline">
          <input type="checkbox" className="chk" checked={settings.autoDelete} onChange={(e) => setSettings({ autoDelete: e.target.checked })} /> Aktif
        </label>
        <label className="inline">
          Hapus container yang diupload lebih dari
          <input type="number" min="1" max="12" style={{ minWidth: 0, width: 64 }} value={settings.months}
            onChange={(e) => setSettings({ months: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} /> bulan
        </label>
        <p className="hint" style={{ margin: 0 }}>
          Dijalankan otomatis oleh server setiap hari (dan saat ada yang membuka aplikasi). Container yang punya jadwal sendiri memakai tanggal jadwalnya.
        </p>
        {overdue > 0 && <div className="msg err">{overdue} container sudah melewati batas dan akan terhapus pada pengecekan berikutnya.</div>}
      </div>
      <h3>Jadwal hapus</h3>
      {!sorted.length ? <div className="empty">Belum ada jadwal hapus.</div> : (
        <div className="tablewrap">
          <table className="grid">
            <thead><tr><th>Data</th><th>Tanggal hapus</th><th>Dibuat oleh</th><th>Dibuat pada</th><th>Aksi</th></tr></thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id}>
                  <td>{s.label}</td><td>{showDate(s.date)}</td><td>{s.by}</td><td>{showDate(s.createdAt)}</td>
                  <td><button className="btn sm" onClick={() => cancel(s)}>Batalkan</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog}
    </>
  )
}
