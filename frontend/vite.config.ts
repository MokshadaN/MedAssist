import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// HTTPS is intentionally disabled for local development:
// - `localhost` is a secure context even over plain HTTP, so microphone /
//   speech-recognition features keep working.
// - The previous `basicSsl()` self-signed cert triggered
//   ERR_CERT_AUTHORITY_INVALID warnings in Chrome on every launch.
// For production, serve the built assets behind a real TLS certificate
// (reverse proxy / managed load balancer) — never the dev server.
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});