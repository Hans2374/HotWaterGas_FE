import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    basicSsl(),
  ],
  server: {
    port: 5173,
    https: true,
    host: 'localhost',
    hmr: {
      protocol: 'wss',
      host: 'localhost',
      port: 5173,
    },
    proxy: {
      '/api': {
        target: 'https://localhost:7140',
        changeOrigin: true,
        secure: true,
        ws: true,
      },
    },
  },
})
