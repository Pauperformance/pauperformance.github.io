import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // The data dirs hold ~700k files, which exceeds the inotify watch limit.
      ignored: ['**/assets/**', '**/docs/**', '**/arena/**', '**/public/data/**'],
    },
  },
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})
