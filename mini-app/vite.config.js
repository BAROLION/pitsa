import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Backend hali ishga tushmagan bo'lsa — terminalni xato bilan to'ldirmay, tushunarli javob qaytaradi. */
function quietProxy(proxy) {
  proxy.on('error', (error, req, res) => {
    if (!res.headersSent) {
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ ok: false, error: 'Server ishga tushmoqda, birozdan so‘ng qayta urinib ko‘ring.' }));
  });
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Tunnel domeni (trycloudflare / ngrok) orqali ochilishiga ruxsat
    allowedHosts: true,
    // /api so'rovlari backend'ga uzatiladi — bitta tunnel yetarli
    proxy: {
      '/api': { target: 'http://localhost:3000', configure: quietProxy },
    },
  },
});
