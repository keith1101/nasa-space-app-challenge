import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('echarts') || id.includes('zrender')) {
              return 'vendor-echarts';
            }
            if (
              id.includes('@deck.gl') ||
              id.includes('maplibre-gl') ||
              id.includes('react-map-gl') ||
              id.includes('@vis.gl') ||
              id.includes('@loaders.gl') ||
              id.includes('@luma.gl')
            ) {
              return 'vendor-deck';
            }
            if (
              id.includes('react-router') ||
              id.includes('zustand') ||
              id.includes('@tanstack')
            ) {
              return 'vendor-router-state';
            }
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: ['**/public/textures/**', '**/public/data/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
