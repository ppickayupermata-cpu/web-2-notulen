import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

const Ctx = createContext()
export const useData = () => useContext(Ctx)

const EMPTY = { groups: [], rows: [], schedules: [], logs: [], backups: [], snapshots: [], finished: [], settings: { autoDelete: true, months: 1 } }

// Data disimpan di database server, jadi PPIC, Warehouse, dan Read Only melihat data yang sama.
// Data dimuat ulang tiap 15 detik dan setiap tab dibuka kembali.
export function DataProvider({ token, onUnauthorized, children }) {
  const [db, setDb] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const seq = useRef(0) // hanya hasil request terbaru yang dipakai
  const last = useRef('')   // data server terakhir (JSON): bila sama persis, tampilan tidak perlu digambar ulang (scroll & seleksi tetap)
  const pend = useRef(0)    // jumlah penyimpanan yang sedang berjalan
  const mine = useRef({})   // sel yang baru saya ubah { 'idBaris|kolom': { v, at } } untuk mendeteksi bentrok dengan pengguna lain
  const [saving, setSaving] = useState(0)
  const [lastSaved, setLastSaved] = useState(null)
  const [notice, setNotice] = useState('')

  const fail = useCallback((e) => { e.status === 401 ? onUnauthorized() : setError(e.message || 'Terjadi kesalahan.') }, [onUnauthorized])

  const refresh = useCallback(async (force = false) => {
    const my = ++seq.current
    try {
      const d = await api('/api/data', { token })
      if (my === seq.current) {
        const j = JSON.stringify(d)
        if (force === true || j !== last.current) {
          last.current = j; setDb(d)
          if (pend.current === 0) { // bentrok: sel yang saya ubah ternyata sudah diubah pengguna lain
            const now = Date.now(), byId = new Map(d.rows.map((r) => [r.id, r])), bentrok = []
            for (const [k, m] of Object.entries(mine.current)) {
              const [id, key] = k.split('|'), row = byId.get(id)
              if (now - m.at > 60000) delete mine.current[k]
              else if (row && String(row[key] ?? '') !== String(m.v ?? '')) { bentrok.push(`SO ${row.so || '-'} / PO ${row.po || '-'} kolom ${key}: sekarang "${row[key] ?? ''}"`); delete mine.current[k] }
            }
            if (bentrok.length) setNotice(`Pengguna lain mengubah sel yang baru Anda edit (nilai terbaru dari server dipakai): ${bentrok.slice(0, 3).join('; ')}${bentrok.length > 3 ? ` (+${bentrok.length - 3} lainnya)` : ''}.`)
          }
        }
        setError('')
      }
    } catch (e) { fail(e.status ? e : new Error('Tidak bisa terhubung ke server.')) }
    finally { setLoading(false) }
  }, [token, fail])

  useEffect(() => { // peringatan bila menutup halaman saat masih ada yang menyimpan
    const h = (e) => { if (pend.current > 0) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h)
  }, [])
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 15000)
    const onVis = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [refresh])

  // kirim aksi ke server, lalu muat ulang. Mengembalikan true bila berhasil.
  const act = async (action, payload = {}) => {
    pend.current++; setSaving(pend.current)
    try {
      try { await api('/api/act', { token, body: { action, ...payload } }) }
      catch (e) {
        await refresh(true) // kembalikan tampilan ke data server
        fail(e.status ? e : new Error('Tidak bisa terhubung ke server. Perubahan terakhir BELUM tersimpan.'))
        return false
      }
      setLastSaved(new Date())
      await refresh(true)
      return true
    } finally { pend.current--; setSaving(pend.current) }
  }
  const local = (fn) => { seq.current++; last.current = ''; setDb(fn) } // tampilkan dulu, server menyusul

  const applyChanges = (changes) => {
    local((d) => ({ ...d, rows: d.rows.map((x) => (changes[x.id] ? { ...x, ...changes[x.id] } : x)) }))
    const now = Date.now(); Object.entries(changes).forEach(([id, p]) => Object.entries(p).forEach(([k, v]) => { if (k !== 'packed') mine.current[id + '|' + k] = { v, at: now } }))
    return act('applyChanges', { changes })
  }
  const addGroup = (group, rows, by, fileName, mode) => act('addGroup', { group, rows, fileName, mode })
  const updateGroup = (id, patch) => {
    local((d) => ({ ...d, groups: d.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
    return act('updateGroup', { id, ...patch })
  }
  const mergeRows = (groupId, insert, update, fileName, remove = []) => act('mergeRows', { groupId, insert, update, fileName, remove })
  // aksi yang mengembalikan data (bukan hanya true/false), mis. riwayat sel
  const ask = async (action, payload = {}, quiet = false) => { try { return await api('/api/act', { token, body: { action, ...payload } }) } catch (e) { if (!quiet) fail(e.status ? e : new Error('Tidak bisa terhubung ke server.')); return null } }
  const cellHistory = async (rowId, key) => (await ask('cellHistory', { rowId, key }))?.history || []
  const snapshotNow = () => act('snapshotNow')
  const dropSnapshot = (id) => act('dropSnapshot', { id })
  const restoreSnapshot = (id) => act('restoreSnapshot', { id })
  const restoreBackup = (id) => act('restoreBackup', { id })
  const moveRows = (p) => act('moveRows', p)
  const finishRows = (groupId, ids) => act('finishRows', { groupId, ids })
  const unfinishRows = (container, ids) => act('unfinishRows', { container, ids })
  const finishedRows = (container) => ask('finishedRows', { container }, true)
  const backupInfo = (id) => ask('backupInfo', { id }), snapshotInfo = (id) => ask('snapshotInfo', { id })
  const clearLabels = (groupId) => act('clearLabels', { groupId })
  const dropBackup = (id) => act('dropBackup', { id })
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
      ...db, token, loading, error, clearError: () => setError(''), refresh, ask, saving, lastSaved, notice, clearNotice: () => setNotice(''),
      applyChanges, updateGroup, addRows, mergeRows, moveRows, finishRows, unfinishRows, finishedRows, clearLabels, backupInfo, snapshotInfo, restoreBackup, dropBackup, cellHistory, snapshotNow, dropSnapshot, restoreSnapshot, addGroup, removeGroup, removeRows, addSchedules, removeSchedule, setSettings, removeLogs,
    }}>
      {children}
    </Ctx.Provider>
  )
}
