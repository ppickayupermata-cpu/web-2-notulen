import { useState } from 'react'

export default function Login({ onLogin, notice }) {
  const [u, setU] = useState(''); const [p, setP] = useState('')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      })
      const d = await r.json().catch(() => ({}))
      r.ok ? onLogin(d) : setErr(d.error || 'Login gagal.')
    } catch { setErr('Tidak bisa terhubung ke server.') }
    setBusy(false)
  }
  return (
    <div className="login">
      <form className="panel" onSubmit={submit}>
        <h2>Monitoring Packing List</h2>
        <label>Username<input value={u} onChange={(e) => setU(e.target.value)} autoFocus /></label>
        <label>Password<input type="password" value={p} onChange={(e) => setP(e.target.value)} /></label>
        {(err || notice) && <div className="msg err">{err || notice}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Memeriksa...' : 'Masuk'}</button>
        <small>Monitoring By PPIC</small>
      </form>
    </div>
  )
}
