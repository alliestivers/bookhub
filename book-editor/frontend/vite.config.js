import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: '127.0.0.1',
    proxy: {
      '/manuscript': 'http://127.0.0.1:8001',
      '/pass': 'http://127.0.0.1:8001',
      '/workspace': 'http://127.0.0.1:8001',
    },
  },
});
