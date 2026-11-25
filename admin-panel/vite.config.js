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

export default defineConfig(({ command }) => ({
  // Production'da Admin Panel serverning /admin/ manzilida turadi (lokal dev — localhost:5174)
  base: command === 'build' ? '/admin/' : '/',
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:3000', configure: quietProxy },
    },
  },
}));
