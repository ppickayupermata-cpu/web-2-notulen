import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Saat `npm run dev`, semua /api/* dijalankan lokal dari folder api/ dengan ENV dari .env.local
const devApi = (env) => ({
  name: 'dev-api',
  configureServer(server) {
    Object.assign(process.env, env)
    server.middlewares.use('/api', async (req, res) => {
      const name = new URL(req.url, 'http://x').pathname.replace(/[^a-z]/g, '')
      let mod
      try { mod = await server.ssrLoadModule(`/api/${name}.js`) } catch {
        res.statusCode = 404; return res.end(JSON.stringify({ error: 'Not found' }))
      }
      mod.default(req, res)
    })
  },
})

export default defineConfig(({ mode }) => ({
  plugins: [react(), devApi(loadEnv(mode, process.cwd(), ''))],
}))
