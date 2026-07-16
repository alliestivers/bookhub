import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/manuscript': 'http://localhost:8001',
      '/pass': 'http://localhost:8001',
      '/workspace': 'http://localhost:8001',
    },
  },
});
