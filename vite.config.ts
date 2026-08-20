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
    // ai.service.test.ts's assumptions about the default (unconfigured) state. Likewise,
    // src/lib/supabase.ts throws at import time if the Supabase env vars are missing — fine for
    // the real app (a real project must be configured), but no test here actually makes a real
    // Supabase call, so a well-formed placeholder is enough to let modules that import it load in
    // an environment with no .env at all (e.g. CI), instead of every such test crashing at
    // import time before it even runs.
    env: {
      VITE_AI_ENABLED: '',
      VITE_SUPABASE_URL: 'https://placeholder.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'placeholder-anon-key',
    },
  },
})
