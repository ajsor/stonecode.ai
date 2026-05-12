import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Split Supabase into its own chunk — it's the largest vendor (~170kB),
        // never changes between deploys, and is shared across landing + every
        // portal page. Splitting it isolates the long-cache win without paying
        // the boundary tax we'd incur splitting framer-motion / react too.
        manualChunks: {
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
