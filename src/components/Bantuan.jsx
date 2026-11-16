import { HelpCircle } from 'lucide-react'
import { useUi } from '../context/UiContext.jsx'

// Tombol "?" kecil di judul halaman: membuka Panduan tepat di topik halaman itu. Tidak menutup apa pun.
export default function Bantuan({ topik = 'mulai', label = 'Panduan halaman ini' }) {
  const { bukaPanduan } = useUi()
  return <button type="button" className="icon-btn help" onClick={() => bukaPanduan(topik)} title={label + ' (F1)'} aria-label={label}><HelpCircle size={16} aria-hidden="true" /></button>
}
