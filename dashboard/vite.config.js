import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server forwards every /api request to our Node API on port 4000.
// The browser only talks to localhost:5173, so the API stays private.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/api': 'http://127.0.0.1:4000',
    },
  },
});
