import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@api': resolve(__dirname, './src/api'),
        '@assets': resolve(__dirname, './src/assets'),
        '@components': resolve(__dirname, './src/components'),
        '@composables': resolve(__dirname, './src/composables'),
        '@config': resolve(__dirname, './src/config'),
        '@constants': resolve(__dirname, './src/constants'),
        '@layouts': resolve(__dirname, './src/layouts'),
        '@pages': resolve(__dirname, './src/pages'),
        '@router': resolve(__dirname, './src/router'),
        '@services': resolve(__dirname, './src/services'),
        '@stores': resolve(__dirname, './src/stores'),
        '@styles': resolve(__dirname, './src/styles'),
        '@types': resolve(__dirname, './src/types'),
        '@utils': resolve(__dirname, './src/utils'),
      },
    },

    server: {
      host: true,
      port: 3000,
      strictPort: false,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8000',
          changeOrigin: true,
          // Forward WebSocket upgrades too (live job-progress sockets), so the
          // whole API is reachable same-origin — works on localhost and LAN.
          ws: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
        },
      },
    },

    // `vite preview` (serving the production build locally) needs the same
    // same-origin proxy so a loopback API stays reachable there too.
    preview: {
      host: true,
      port: 3001,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8000',
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (['vue', 'vue-router', 'pinia'].some((pkg) => id.includes(`/node_modules/${pkg}/`))) {
              return 'vendor'
            }
            if (['axios', '@vueuse/core'].some((pkg) => id.includes(`/node_modules/${pkg}/`))) {
              return 'utils'
            }
          },
        },
      },
    },
  }
})
