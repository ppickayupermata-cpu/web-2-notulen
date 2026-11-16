import { X } from 'lucide-react'
import { PINTASAN as L } from '../data/panduan.js'
export default function Pintasan({ onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Pintasan keyboard" onClick={(e) => e.stopPropagation()}>
        <div className="toolbar"><h3 style={{ margin: 0 }}>Pintasan keyboard</h3><span className="spacer" /><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={18} /></button></div>
        {L.map(([t, rows]) => <div key={t}><h4 className="pin-h">{t}</h4>{rows.map(([k, d]) => <div key={k} className="pin-r"><kbd>{k}</kbd><span>{d}</span></div>)}</div>)}
      </div>
    </div>
  )
}
