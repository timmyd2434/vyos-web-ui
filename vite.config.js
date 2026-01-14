import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  // Get router IP from environment variable, default to 192.168.0.29
  const routerIP = env.VITE_VYOS_ROUTER_IP || '192.168.0.29'

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    server: {
      host: true, // Listen on all local IPs
      allowedHosts: true, // Allow any host
      proxy: {
        // Proxy API requests to bypass CORS during development
        // Frontend can use /vyos-api/* instead of https://<router-ip>/*
        '/vyos-api': {
          target: `https://${routerIP}`,
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
  }
})
