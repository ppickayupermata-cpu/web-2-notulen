import { FileSpreadsheet, LayoutGrid, Upload, Trash2, History } from 'lucide-react'
import { ROLES } from '../config.js'

export default function Sidebar({ role, page, setPage, open }) {
  const r = ROLES[role]
  const items = [
    { id: 'monitoring', Icon: LayoutGrid, text: 'Monitoring' },
    r.upload && { id: 'sheet', Icon: FileSpreadsheet, text: 'Lembar Excel (Preview)' },
    r.upload && { id: 'upload', Icon: Upload, text: 'Upload Excel' },
    r.remove && { id: 'delete', Icon: Trash2, text: 'Hapus Data' },
    { id: 'log', Icon: History, text: 'Riwayat' },
  ].filter(Boolean)
  return (
    <nav className={'sidebar' + (open ? '' : ' closed')}>
      {items.map(({ id, Icon, text }) => (
        <button key={id} className={page === id ? 'nav active' : 'nav'} onClick={() => setPage(id)}>
          <Icon size={18} strokeWidth={1.9} />{text}
        </button>
      ))}
    </nav>
  )
}
