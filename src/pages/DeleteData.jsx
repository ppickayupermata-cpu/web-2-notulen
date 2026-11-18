import { useState } from 'react'
import ByContainer from './delete/ByContainer.jsx'
import ByRows from './delete/ByRows.jsx'
import Schedules from './delete/Schedules.jsx'

const TABS = [
  { id: 'container', text: 'Per Container' },
  { id: 'rows', text: 'Per SO / Baris' },
  { id: 'jadwal', text: 'Jadwal & Otomatis' },
]

export default function DeleteData({ by }) {
  const [tab, setTab] = useState('container')
  return (
    <>
      <h2>Hapus Data</h2>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>{t.text}</button>
        ))}
      </div>
      {tab === 'container' && <ByContainer by={by} />}
      {tab === 'rows' && <ByRows by={by} />}
      {tab === 'jadwal' && <Schedules by={by} />}
    </>
  )
}
