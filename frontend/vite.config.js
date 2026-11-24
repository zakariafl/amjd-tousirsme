import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    watch: { usePolling: process.env.CHOKIDAR_USEPOLLING === 'true' },
    proxy: {
      '/api': {
        // Local Windows/XAMPP: 127.0.0.1:8000. Docker: http://api:8000.
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
