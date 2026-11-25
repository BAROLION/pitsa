import 'dotenv/config';
import crypto from 'node:crypto';

const clean = (value) => String(value || '').trim().replace(/\/+$/, '');
const flag = (value, fallback) => String(value ?? fallback).toLowerCase() === 'true';

// Render (yoki boshqa hosting) — production rejimi: bitta server, webhook, /admin internetda.
// Render RENDER va RENDER_EXTERNAL_URL o'zgaruvchilarini o'zi beradi.
const production = Boolean(process.env.RENDER) || process.env.NODE_ENV === 'production';
const publicUrl = clean(process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL);

const botToken = String(process.env.BOT_TOKEN || '').trim();
const adminPassword = String(process.env.ADMIN_PASSWORD || 'admin123');
const weakPassword = adminPassword.length < 10 || ['admin123', 'password', '12345678'].includes(adminPassword);

const config = {
  production,
  publicUrl,

  // Lokal: Mini App va Admin Panel'ning vite.config.js fayllari shu portga ulanadi.
  // Render: portni PORT orqali o'zi beradi.
  port: production ? Number(process.env.PORT) || 3000 : Number(process.env.API_PORT) || 3000,

  bot: {
    token: botToken,
    username: String(process.env.BOT_USERNAME || '').replace('@', '').trim(),
    miniAppUrl: clean(process.env.MINI_APP_URL) || publicUrl,
    enabled: !flag(process.env.DISABLE_BOT, 'false'),
    // Production'da webhook: Telegram xabarni serverga o'zi yuboradi (uxlab qolgan serverni ham uyg'otadi).
    webhook: production && Boolean(publicUrl),
    webhookPath: `/telegram/${crypto.createHash('sha256').update(`hook:${botToken}`).digest('hex').slice(0, 32)}`,
    webhookSecret: crypto.createHash('sha256').update(`secret:${botToken}`).digest('hex').slice(0, 48),
  },

  admin: {
    password: adminPassword,
    weakPassword,
    // Internetdan (Render) Admin Panel faqat kuchli parol bilan ochiladi.
    allowRemote: production && !weakPassword,
    telegramId: String(process.env.ADMIN_TELEGRAM_ID || '').trim(),
  },

  dev: {
    // Mini App'ni oddiy brauzerda sinash uchun (faqat localhost so'rovlari). Production'da hech qachon.
    allowDevAuth: !production && flag(process.env.ALLOW_DEV_AUTH, 'true'),
    telegramId: String(process.env.DEV_TELEGRAM_ID || '1').trim(),
    userName: 'Mehmon',
  },

  messages: {
    welcome: (name) =>
      `Assalomu alaykum, <b>${name}</b>! 👋\n\n` +
      '🍕 <b>Pitsa Dostavka</b> — issiqqina pizzalar 30 daqiqada eshigingizgacha.\n\n' +
      'Buyurtma berish uchun pastdagi tugmani bosing 👇',
    orderAccepted: 'Buyurtmangiz muvaffaqiyatli qabul qilindi! Kuryerimiz tez orada bog‘lanadi 🍕',
    noMiniApp:
      '⚠️ Mini App hali ulanmagan.\n\n' +
      '<code>.env</code> faylidagi <code>MINI_APP_URL</code> ga ngrok bergan HTTPS manzilni yozing va serverni qayta ishga tushiring.',
  },
};

export default config;
