import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Run `npm run dev:https` to test on phones: browsers only allow GPS location on HTTPS pages.
const https = process.env.HTTPS === '1';
export default defineConfig({
  plugins: [react(), ...(https ? [basicSsl()] : [])],
  server: {
    port: 5173,
    host: true,
    proxy: { '/api': 'http://127.0.0.1:5000' },
  },
});
