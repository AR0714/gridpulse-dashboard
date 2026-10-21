import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Dev only: serve /api/chat with the real Netlify Function, so `npm run dev` behaves like the
 * deployed site. GROQ_API_KEY is read from .env into the server process only (it has no VITE_
 * prefix, so Vite never exposes it to the browser bundle).
 */
function netlifyFunctionInDev(): Plugin {
  return {
    name: 'netlify-function-in-dev',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      if (env.GROQ_API_KEY && !process.env.GROQ_API_KEY) process.env.GROQ_API_KEY = env.GROQ_API_KEY
      server.middlewares.use('/api/chat', async (req, res) => {
        try {
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const mod = await server.ssrLoadModule('/netlify/functions/chat.ts')
          const request = new Request(`http://localhost${req.originalUrl ?? '/api/chat'}`, {
            method: req.method,
            headers: { 'content-type': req.headers['content-type'] ?? 'application/json' },
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
          })
          const response: Response = await mod.default(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(await response.text())
        } catch (e) {
          server.config.logger.error(`[api/chat] ${e instanceof Error ? e.message : String(e)}`)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Function failed.' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), netlifyFunctionInDev()],
  server: { port: 5173, host: true },
  build: {
    // three.js alone is ~700 kB minified; it is split out and loaded lazily with the scene.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // React (and the scheduler) get their own chunk, otherwise Rollup folds them into the
          // r3f chunk and the entry has to load the 3D code up front.
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          if (/\/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion'
          if (/\/node_modules\/(zustand|use-sync-external-store)\//.test(id)) return 'state' // shared with r3f
          if (id.includes('/three/')) return 'three'
          if (id.includes('postprocessing')) return 'postfx'
          if (id.includes('@react-three')) return 'r3f'
        },
      },
    },
  },
})
