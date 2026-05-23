import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    port: 5173,
    host: 'localhost',
    // Frontend runs on plain HTTP
    // API calls are proxied to backend HTTPS
    // NOTE: Do NOT proxy /auth or /auth/google/* - these are frontend routes handled by React Router
    proxy: {
      '/api': {
        target: 'https://localhost:7140',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
