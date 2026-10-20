// Pemanggil API server. Semua request membawa token login.
export async function api(path, { token, body } = {}) {
  const r = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined,
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error(d.error || 'Terjadi kesalahan.'); e.status = r.status; throw e }
  return d
}
