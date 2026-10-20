import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'

const F = [['container', 'Container'], ['buyer', 'Buyer'], ['packingListNo', 'Packing List No'], ['shipDate', 'Ship Date'], ['status', 'Status']]

// Daftar parent group; PPIC bisa mengedit header (Container, Buyer, Packing List No, Ship Date, Status) langsung di baris.
export default function GroupList({ groups, rows, actions, empty, canEdit, onSave }) {
  const [eid, setEid] = useState(null)
  const [d, setD] = useState({})
  if (!groups.length) return <div className="empty">{empty}</div>
  const countOf = (id) => rows.filter((r) => r.groupId === id).length
  const save = async () => { if (await onSave(eid, d)) setEid(null) }
  return (
    <div className="tablewrap">
      <table className="grid">
        <thead><tr>{F.map(([, l]) => <th key={l}>{l}</th>)}<th>Baris</th><th>Aksi</th></tr></thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.id}>
              {F.map(([k]) => (
                <td key={k} className={eid === g.id ? 'edit' : ''}>
                  {eid === g.id ? <input value={d[k] ?? ''} onChange={(e) => setD({ ...d, [k]: e.target.value })} /> : g[k]}
                </td>
              ))}
              <td>{countOf(g.id)}</td>
              <td className="actions">
                {eid === g.id ? (
                  <>
                    <button className="btn sm primary" onClick={save}><Check size={14} /> Simpan</button>
                    <button className="btn sm" onClick={() => setEid(null)}><X size={14} /> Batal</button>
                  </>
                ) : (
                  <>
                    {actions(g)}
                    {canEdit && <button className="btn sm" title="Edit header" onClick={() => { setEid(g.id); setD({ ...g }) }}><Pencil size={14} /> Edit</button>}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
