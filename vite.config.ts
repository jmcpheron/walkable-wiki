import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_PATH is set by CI for GitHub Pages subpath deploys (/walkable-wiki/).
// Local dev and Vercel use the default root path.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? '/',
})
