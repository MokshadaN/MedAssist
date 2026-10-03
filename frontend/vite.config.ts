import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// HTTPS is intentionally disabled for local development:
// - `localhost` is a secure context even over plain HTTP, so microphone /
//   speech-recognition features keep working.
// - The previous `basicSsl()` self-signed cert triggered
//   ERR_CERT_AUTHORITY_INVALID warnings in Chrome on every launch.
// For production, serve the built assets behind a real TLS certificate
// (reverse proxy / managed load balancer) — never the dev server.
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        // Use 127.0.0.1 explicitly — on Windows, 'localhost' resolves to
        // ::1 (IPv6) but uvicorn binds to 127.0.0.1 (IPv4), causing ECONNREFUSED.
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});