import { LayoutGrid, Upload, Trash2, History, Archive } from 'lucide-react'

export default function Sidebar({ page, setPage, open }) {
  const items = [
    { id: 'monitoring', Icon: LayoutGrid, text: 'Monitoring' },
    { id: 'upload', Icon: Upload, text: 'Upload Excel' },
    { id: 'delete', Icon: Trash2, text: 'Hapus Data' },
    { id: 'log', Icon: History, text: 'Riwayat' },
    { id: 'cadangan', Icon: Archive, text: 'Cadangan Data' },
  ]
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
