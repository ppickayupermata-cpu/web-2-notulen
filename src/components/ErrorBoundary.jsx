import { Component } from 'react'
// Bila ada bagian aplikasi yang error, tampilkan pesan ramah (bukan layar putih). Data aman di server; error dilaporkan otomatis.
export default class ErrorBoundary extends Component {
  state = { err: null, detail: false }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err, info) { this.props.onError?.(err, info?.componentStack?.split('\n')[1]?.trim() || 'render') }
  render() {
    const { err, detail } = this.state
    if (!err) return this.props.children
    return (
      <div className="empty" role="alert" style={{ maxWidth: 560, margin: '60px auto' }}>
        <h3>Terjadi kesalahan tak terduga</h3>
        <p>Data Anda aman di server. Kesalahan ini sudah dilaporkan otomatis. Silakan muat ulang halaman.</p>
        <button className="btn primary" onClick={() => location.reload()}>Muat ulang</button>{' '}
        <button className="btn" onClick={() => this.setState({ err: null })}>Coba lanjut</button>{' '}
        <button className="btn ghost" onClick={() => this.setState({ detail: !detail })}>{detail ? 'Sembunyikan' : 'Rincian'}</button>
        {detail && <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', fontSize: 12, marginTop: 10 }}>{String(err?.stack || err).slice(0, 1200)}</pre>}
      </div>
    )
  }
}
