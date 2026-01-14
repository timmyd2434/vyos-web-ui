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
      // Proxy API requests to bypass CORS during development
      // Frontend can use /vyos-api/* instead of https://192.168.0.29/*
      '/vyos-api': {
        target: 'https://192.168.0.29',
        changeOrigin: true,
        secure: false, // Allow self-signed certs
        rewrite: (path) => path.replace(/^\/vyos-api/, ''),
        configure: (proxy, options) => {
          // Log proxy requests for debugging
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[Proxy]', req.method, req.url, '->', options.target + req.url.replace('/vyos-api', ''));
          });
        }
      },
    }
  }
})
