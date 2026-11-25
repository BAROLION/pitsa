// Asosiy ishga tushirish fayli: Express API + Telegram bot.
// Lokal (npm start): polling + Vite dev serverlar. Render (production): webhook + build qilingan saytlar.
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import config from './config/default.js';
import bot, { hasMiniApp } from './core/bot.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { errorHandler } from './middlewares/auth.middleware.js';
import ProductModel from './models/Product.js';

import registerBotHandlers from './routes/bot.routes.js';
import clientRoutes from './routes/client.routes.js';
import adminRoutes from './routes/admin.routes.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const miniDist = path.join(root, 'mini-app', 'dist');
const adminDist = path.join(root, 'admin-panel', 'dist');

const app = express();

if (config.production) {
  // Render so'rovlarni proxy orqali uzatadi — haqiqiy IP (login cheklovi uchun) shu yerdan olinadi
  app.set('trust proxy', 1);
} else {
  // Lokal: Vite dev serverlar boshqa portda
  app.use(cors());
}

// Telegram webhook (faqat production). Yo'l va maxfiy kalit bot tokenidan olinadi — begona so'rovlar o'tmaydi.
if (config.bot.enabled && config.bot.webhook) {
  const handleWebhook = bot.webhookCallback(config.bot.webhookPath, { secretToken: config.bot.webhookSecret });
  // Telegram bilan vaqtinchalik xato (tarmoq va h.k.) butun serverni yiqitmasin
  app.use((req, res, next) =>
    Promise.resolve(handleWebhook(req, res, next)).catch((error) => {
      console.error('⚠️  Webhook xatosi:', error.message);
      if (!res.headersSent) res.sendStatus(200);
    }),
  );
}

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/client', clientRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: `Yo‘l topilmadi: ${req.originalUrl}` });
});

// Production: build qilingan Admin Panel (/admin) va Mini App (/) shu serverning o'zidan beriladi.
// index.html keshlanmaydi (yangi versiya darhol ko'rinsin), nomida hash bor fayllar — uzoq keshlanadi.
const staticOptions = {
  setHeaders(res, filePath) {
    res.setHeader('Cache-Control', filePath.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable');
  },
};
const sendIndex = (dir) => (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(dir, 'index.html'));
};
if (config.production && existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist, staticOptions));
  app.get(['/admin', '/admin/*'], sendIndex(adminDist));
}
if (config.production && existsSync(miniDist)) {
  app.use(express.static(miniDist, staticOptions));
  app.get('*', sendIndex(miniDist));
}

app.use(errorHandler);

registerBotHandlers();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sameUrl = (a = '', b = '') => a.replace(/\/+$/, '') === b.replace(/\/+$/, '');

// Chat pastidagi "Menyu" tugmasi Mini App'ni ochadi.
async function applyMenuButton() {
  await bot.telegram.setChatMenuButton({
    menuButton: hasMiniApp()
      ? { type: 'web_app', text: '🍕 Menyu', web_app: { url: config.bot.miniAppUrl } }
      : { type: 'commands' },
  });
}

/**
 * Bot tokeni bilan boshqa joyda (boshqa terminal/kompyuter) server ishga tushsa, u menyu tugmasini
 * o'z tunneliga o'tkazib qo'yadi va keyin o'chsa — tugma o'lik manzilga qoladi.
 * Shuning uchun har daqiqada tekshirib, kerak bo'lsa o'z manzilimizni qayta o'rnatamiz.
 */
const webhookUrl = () => `${config.publicUrl}${config.bot.webhookPath}`;

async function applyWebhook() {
  // drop_pending_updates: false — server uxlab yotganda kelgan xabarlar yo'qolmasin
  await bot.telegram.setWebhook(webhookUrl(), {
    secret_token: config.bot.webhookSecret,
    drop_pending_updates: false,
    allowed_updates: ['message', 'callback_query'],
  });
}

function keepMenuButton() {
  if (!hasMiniApp()) return;
  setInterval(async () => {
    try {
      const current = await bot.telegram.getChatMenuButton();
      if (!(current?.type === 'web_app' && sameUrl(current.web_app?.url, config.bot.miniAppUrl))) {
        await applyMenuButton();
        console.log('🔁 Bot menyu tugmasi qayta shu serverning manziliga ulandi');
      }
      // Production: kimdir webhook'ni o'chirib qo'ysa (masalan, lokal server) — qayta ulaymiz
      if (config.bot.webhook) {
        const info = await bot.telegram.getWebhookInfo();
        if (info.url !== webhookUrl()) {
          await applyWebhook();
          console.log('🔁 Telegram webhook qayta ulandi');
        }
      }
    } catch {
      /* internet vaqtincha uzilgan bo'lishi mumkin — keyingi safar */
    }
  }, 60_000).unref();
}

/**
 * Lokal server: agar bot Render'da (webhook bilan) ishlayotgan bo'lsa, unga tegmaymiz —
 * aks holda lokal polling webhook'ni o'chirib, Render'dagi botni buzadi.
 */
async function productionBotIsLive() {
  if (config.bot.webhook || String(process.env.FORCE_LOCAL_BOT).toLowerCase() === 'true') return false;
  const info = await bot.telegram.getWebhookInfo();
  return Boolean(info.url);
}

async function setupBot() {
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Botni ishga tushirish' },
    { command: 'menu', description: 'Menyuni ochish' },
    { command: 'orders', description: 'Mening buyurtmalarim' },
    { command: 'help', description: 'Aloqa' },
  ]);

  await applyMenuButton();

  if (config.bot.webhook) {
    // botInfo oldindan saqlanadi — aks holda Telegraf har bir xabarda getMe chaqiradi
    bot.botInfo = await bot.telegram.getMe();
    await applyWebhook();
    return bot.botInfo;
  }

  // Agar oldin webhook o'rnatilgan bo'lsa, polling ishlamaydi.
  await bot.telegram.deleteWebhook({ drop_pending_updates: true });

  bot
    .launch({ dropPendingUpdates: true })
    .catch((error) => {
      const conflict = error?.response?.error_code === 409;
      console.error(
        conflict
          ? '❌ Bot allaqachon boshqa joyda ishlayapti (409). Boshqa terminaldagi serverni to‘xtating.'
          : `❌ Bot ishga tushmadi: ${error.message}`,
      );
    });

  return bot.telegram.getMe();
}

/** Telegram bilan aloqa vaqtincha uzilsa ham bot ulanguncha qayta urinadi. */
async function startBotWithRetry() {
  if (!config.bot.enabled) {
    console.log('  🤖  Bot o‘chirilgan (DISABLE_BOT=true)');
    return;
  }
  for (let attempt = 1; ; attempt += 1) {
    try {
      if (await productionBotIsLive()) {
        console.log('');
        console.log('  ⚠️  Bot hozir Render’da (webhook orqali) ishlayapti — lokal bot ishga tushirilmadi.');
        console.log('      Lokal Mini App va Admin Panel ishlayveradi. Botni shu yerda sinash kerak bo‘lsa:');
        console.log('      .env ga FORCE_LOCAL_BOT=true yozing (Render’dagi bot vaqtincha to‘xtaydi).');
        console.log('');
        return;
      }
      const me = await setupBot();
      console.log(`  🤖  Bot ishga tushdi: @${me.username}${config.bot.webhook ? ' (webhook)' : ''}`);
      keepMenuButton();
      return;
    } catch (error) {
      if (error?.response?.error_code === 401) {
        console.error('❌ BOT_TOKEN noto‘g‘ri. .env faylini tekshiring.');
        return;
      }
      const wait = Math.min(30, attempt * 5);
      console.error(`⚠️  Telegram'ga ulanib bo‘lmadi (${error.message}). ${wait} soniyadan so‘ng qayta urinamiz...`);
      await sleep(wait * 1000);
    }
  }
}

async function bootstrap() {
  await connectDatabase();

  const seeded = await ProductModel.seedIfEmpty();
  if (seeded) console.log(`🍕 Baza bo‘sh edi — ${seeded} ta mahsulot qo‘shildi`);

  const server = app.listen(config.port, () => {
    console.log('');
    console.log('  🍕  PITSA DOSTAVKA — SERVER ISHGA TUSHDI');
    console.log('  ──────────────────────────────────────────────');
    if (config.production) {
      const base = config.publicUrl || `http://localhost:${config.port}`;
      console.log(`  📱  Mini App     : ${base}`);
      console.log(`  🛠   Admin Panel  : ${base}/admin`);
      console.log(`  🌐  API          : ${base}/api`);
      if (!config.admin.allowRemote) {
        console.log('  ⚠️  Admin Panel YOPIQ: ADMIN_PASSWORD kamida 10 belgili kuchli parol bo‘lishi kerak');
      }
      if (!config.publicUrl) console.log('  ⚠️  PUBLIC_URL topilmadi — bot webhook ulanmaydi');
    } else {
      console.log(`  🌐  API          : http://localhost:${config.port}/api`);
      console.log('  📱  Mini App     : http://localhost:5173');
      console.log('  🛠   Admin Panel  : http://localhost:5174');
      console.log(`  🔗  Mini App URL : ${hasMiniApp() ? config.bot.miniAppUrl : 'ulanmagan (ngrok kerak, README.md ga qarang)'}`);
    }
    console.log('  ──────────────────────────────────────────────');
    console.log('');
    startBotWithRetry();
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ ${config.port}-port band. Boshqa oynada server ochiq qolgan bo‘lishi mumkin.`);
      process.exit(1);
    }
    throw error;
  });
}

bootstrap().catch((error) => {
  console.error('❌ Server ishga tushmadi:', error.message);
  process.exit(1);
});

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  try {
    bot.stop(signal);
  } catch {
    /* bot ishga tushmagan bo'lishi mumkin */
  }
  await disconnectDatabase().catch(() => {});
  process.exit(0);
}

// Kutilmagan async xato server ishini to'xtatmasin (Render'da qayta ishga tushish ~1 daqiqa oladi)
process.on('unhandledRejection', (error) => {
  console.error('⚠️  Kutilmagan xato:', error?.message || error);
});

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
