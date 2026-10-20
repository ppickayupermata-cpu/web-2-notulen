import { useEffect, useRef, useState } from 'react'

// Pemakaian: const { confirm, dialog } = useConfirm()
//   if (!(await confirm({ title, message, confirmLabel, cancelLabel, danger: true }))) return
//   ... render {dialog} di dalam komponen
// Hasil: true = tombol konfirmasi, false = tombol batal / Escape / klik di luar.
export function useConfirm() {
  const [st, setSt] = useState(null)
  const cur = useRef(null)
  const confirm = (opts) => new Promise((res) => { cur.current?.(false); cur.current = res; setSt(opts) })
  const close = (v) => { cur.current?.(v); cur.current = null; setSt(null) }

  useEffect(() => {
    if (!st) return
    const onKey = (e) => e.key === 'Escape' && close(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const dialog = st && (
    <div className="overlay" onClick={() => close(false)}>
      <div className="modal" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{st.title}</h3>
        <p>{st.message}</p>
        <div className="modal-actions">
          <button className="btn" autoFocus onClick={() => close(false)}>{st.cancelLabel || 'Batal'}</button>
          <button className={'btn ' + (st.danger ? 'danger' : 'primary')} onClick={() => close(true)}>{st.confirmLabel || 'Ya'}</button>
        </div>
      </div>
    </div>
  )
  return { confirm, dialog }
}
