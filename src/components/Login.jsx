import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function Login({ onLogin, notice }) {
  const [u, setU] = useState(''); const [p, setP] = useState('')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false), [caps, setCaps] = useState(false)

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
        <label>Username<input value={u} onChange={(e) => setU(e.target.value)} autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false} /></label>
        <label>Password
          <span className="pwrap">
            <input type={show ? 'text' : 'password'} value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') || false)} onBlur={() => setCaps(false)} />
            <button type="button" className="eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={show} title={show ? 'Sembunyikan password' : 'Tampilkan password'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </span>
          {caps && <small className="capslock">Caps Lock sedang aktif</small>}
        </label>
        {(err || notice) && <div className="msg err">{err || notice}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Memeriksa...' : 'Masuk'}</button>
        <small>Monitoring By PPIC</small>
      </form>
    </div>
  )
}
