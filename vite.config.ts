import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { siteAccessPlugin } from './scripts/site-access.ts'

export default defineConfig({
  base: './',
  plugins: [
    siteAccessPlugin(),
    react(),
  ],
  build: {
    chunkSizeWarningLimit: 250,
    reportCompressedSize: true,
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        capabilityMap: fileURLToPath(new URL('./capability-map/index.html', import.meta.url)),
        handling: fileURLToPath(new URL('./waferplt/robots/index.html', import.meta.url)),
      },
      // rolldown only accepts the function form of manualChunks (the object form
      // used by Rollup is rejected). Normalise separators so this also works on
      // Windows. ScrollTrigger is deliberately left out of the shared gsap group
      // so the plugin stays in the lazy HMI chunk instead of the first screen.
      output: {
        manualChunks(id: string) {
          const path = id.replace(/\\/g, '/')
          if (path.includes('/node_modules/react/') || path.includes('/node_modules/react-dom/') || path.includes('/node_modules/scheduler/')) return 'react'
          if (path.includes('/node_modules/react-router') || path.includes('/node_modules/@remix-run/')) return 'router'
          if (path.includes('/node_modules/gsap/') || path.includes('/node_modules/@gsap/')) {
            if (path.includes('ScrollTrigger')) return undefined
            return 'gsap'
          }
          return undefined
        },
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
