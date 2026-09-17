import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  envPrefix: ['VITE_', 'GEMINI_'],
  plugins: [react(),
           tailwindcss(),],
  resolve: {
    alias: [
      {
        find: /^react$/,
        replacement: path.resolve(process.cwd(), 'node_modules/react'),
      },
    ],
  },
})
