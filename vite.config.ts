import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'device-subpage-index',
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          const url = new URL(request.url ?? '/', 'http://vite.local')
          if (['/stretch-bender', '/stretch-bender/', '/waferplt', '/waferplt/'].includes(url.pathname)) {
            request.url = `${url.pathname.replace(/\/$/, '')}/index.html${url.search}`
          }
          next()
        })
      },
    },
    react(),
  ],
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        handling: fileURLToPath(new URL('./waferplt/robots/index.html', import.meta.url)),
      },
    },
  },
  server: {
    host: '127.0.0.1',
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: false,
  },
})

