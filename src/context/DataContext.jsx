import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

const Ctx = createContext()
export const useData = () => useContext(Ctx)

const EMPTY = { groups: [], rows: [], schedules: [], logs: [], settings: { autoDelete: true, months: 1 } }

// Data disimpan di database server, jadi PPIC, Warehouse, dan Read Only melihat data yang sama.
// Data dimuat ulang tiap 15 detik dan setiap tab dibuka kembali.
export function DataProvider({ token, onUnauthorized, children }) {
  const [db, setDb] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const seq = useRef(0) // hanya hasil request terbaru yang dipakai

  const fail = useCallback((e) => { e.status === 401 ? onUnauthorized() : setError(e.message || 'Terjadi kesalahan.') }, [onUnauthorized])

  const refresh = useCallback(async () => {
    const my = ++seq.current
    try {
      const d = await api('/api/data', { token })
      if (my === seq.current) { setDb(d); setError('') }
    } catch (e) { fail(e.status ? e : new Error('Tidak bisa terhubung ke server.')) }
    finally { setLoading(false) }
  }, [token, fail])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 15000)
    const onVis = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [refresh])

  // kirim aksi ke server, lalu muat ulang. Mengembalikan true bila berhasil.
  const act = async (action, payload = {}) => {
    try { await api('/api/act', { token, body: { action, ...payload } }) }
    catch (e) {
      await refresh() // kembalikan tampilan ke data server
      fail(e.status ? e : new Error('Tidak bisa terhubung ke server.'))
      return false
    }
    await refresh()
    return true
  }
  const local = (fn) => { seq.current++; setDb(fn) } // tampilkan dulu, server menyusul

  const applyChanges = (changes) => {
    local((d) => ({ ...d, rows: d.rows.map((x) => (changes[x.id] ? { ...x, ...changes[x.id] } : x)) }))
    return act('applyChanges', { changes })
  }
  const addGroup = (group, rows, by, fileName) => act('addGroup', { group, rows, fileName })
  const updateGroup = (id, patch) => {
    local((d) => ({ ...d, groups: d.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
    return act('updateGroup', { id, ...patch })
  }
  const addRows = (groupId, count = 1) => act('addRows', { groupId, count })
  const removeGroup = (id, by, reason) => act('removeGroup', { id, reason })
  const removeRows = (ids, by, reason) => act('removeRows', { ids, reason })
  const addSchedules = (list) => act('addSchedules', { list })
  const removeSchedule = (id) => act('removeSchedule', { id })
  const setSettings = (patch) => {
    local((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
    return act('setSettings', { patch })
  }
  const removeLogs = (ids) => act('removeLogs', { ids })

  return (
    <Ctx.Provider value={{
      ...db, token, loading, error, clearError: () => setError(''), refresh,
      applyChanges, updateGroup, addRows, addGroup, removeGroup, removeRows, addSchedules, removeSchedule, setSettings, removeLogs,
    }}>
      {children}
    </Ctx.Provider>
  )
}
