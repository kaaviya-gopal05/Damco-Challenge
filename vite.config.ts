import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Tests must be isolated from the developer's local, gitignored .env — otherwise
    // whatever VITE_AI_ENABLED happens to be set to on this machine leaks into
    // ai.service.test.ts's assumptions about the default (unconfigured) state.
    env: { VITE_AI_ENABLED: '' },
  },
})
