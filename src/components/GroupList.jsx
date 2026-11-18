import { useState } from 'react'

const F = [['container', 'Container'], ['buyer', 'Buyer'], ['packingListNo', 'Packing List No'], ['shipDate', 'Ship Date'], ['status', 'Status']]

// Daftar parent group. Header (Container, Buyer, Packing List No, Ship Date, Status) langsung bisa diedit: klik 2x selnya,
// ketik, lalu Enter / klik di luar untuk menyimpan, Esc untuk membatalkan (tanpa tombol Edit).
export default function GroupList({ groups, rows, actions, empty, canEdit, onSave }) {
  const [ed, setEd] = useState(null) // { id, k, v }
  if (!groups.length) return <div className="empty">{empty}</div>
  const countOf = (id) => rows.filter((r) => r.groupId === id).length
  const simpan = async (g) => { const e = ed; setEd(null); if (e && e.v !== (g[e.k] ?? '')) await onSave(g.id, { ...g, [e.k]: e.v }) }
  return (
    <>
      {canEdit && <p className="hint" style={{ margin: '0 0 6px' }}>Klik 2x pada Container, Buyer, Packing List No, Ship Date, atau Status untuk mengubahnya langsung.</p>}
      <div className="tablewrap">
        <table className="grid">
          <thead><tr>{F.map(([, l]) => <th key={l}>{l}</th>)}<th>Baris</th><th>Aksi</th></tr></thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id}>
                {F.map(([k]) => { const on = ed && ed.id === g.id && ed.k === k
                  return (
                    <td key={k} className={on ? 'edit ing' : ''} style={canEdit && !on ? { cursor: 'cell' } : undefined} onDoubleClick={() => canEdit && setEd({ id: g.id, k, v: g[k] ?? '' })}>
                      {on ? <input autoFocus value={ed.v} onChange={(e) => setEd({ ...ed, v: e.target.value })} onBlur={() => simpan(g)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } else if (e.key === 'Escape') { e.preventDefault(); setEd(null) } }} /> : <>{g[k]}{k === 'container' && g.kind === 'coads' && <span className="chip-st kind-coads">CO ADS</span>}</>}
                    </td>) })}
                <td>{countOf(g.id)}</td>
                <td className="actions">{actions(g)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
