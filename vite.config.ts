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

