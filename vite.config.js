import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: true, // Listen on all local IPs
    allowedHosts: true, // Allow any host
    proxy: {
      '/vyos': {
        target: 'https://192.168.0.22', // Proxy to your Router IP
        changeOrigin: true,
        secure: false, // Allow self-signed certs
        rewrite: (path) => path.replace(/^\/vyos/, ''),
      },
    }
  }
})
