import crypto from 'node:crypto';
import config from '../config/default.js';
import UserModel from '../models/User.js';

/** Xato obyekti + HTTP status. */
export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/** Async controller xatolarini errorHandler'ga uzatadi. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** URL'dagi :id ni butun songa aylantiradi. */
export function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw httpError(400, 'Noto‘g‘ri ID');
  return id;
}

/**
 * Telegram initData imzosini tekshiradi.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secret = crypto.createHmac('sha256', 'WebAppData').update(config.bot.token).digest();
    const computed = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

    if (computed.length !== hash.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))) return null;

    // initData 24 soatdan eski bo'lmasin
    const authDate = Number(params.get('auth_date')) * 1000;
    if (!authDate || Date.now() - authDate > 24 * 60 * 60 * 1000) return null;

    const user = params.get('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

/** So'rov to'g'ridan-to'g'ri kompyuterning o'zidan keldimi (tunnel/ngrok orqali emas). */
export function isLocalRequest(req) {
  const host = String(req.get('host') || '').split(':')[0];
  const viaTunnel =
    req.get('cf-connecting-ip') || // Cloudflare tunnel
    req.get('x-forwarded-for') || // ngrok va boshqa proxy'lar
    req.get('x-forwarded-host');
  return !viaTunnel && ['localhost', '127.0.0.1', '[::1]'].includes(host);
}

/** Mini App so'rovlarini himoyalaydi va req.user ni to'ldiradi. */
export async function telegramAuth(req, res, next) {
  try {
    const initData = req.get('x-telegram-init-data') || '';
    let tgUser = initData ? verifyInitData(initData) : null;

    if (!tgUser && config.dev.allowDevAuth && isLocalRequest(req)) {
      tgUser = { id: config.dev.telegramId, first_name: config.dev.userName };
    }

    if (!tgUser?.id) {
      return res.status(401).json({
        ok: false,
        error: 'Avtorizatsiya muvaffaqiyatsiz. Ilovani Telegram bot orqali oching.',
      });
    }

    req.user = await UserModel.upsertFromTelegram(tgUser);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Lokal: Admin Panel faqat shu kompyuterdan ochiladi — tunnel orqali internetga chiqmaydi.
 * Production (Render): internetdan ochiladi, lekin faqat kuchli ADMIN_PASSWORD o'rnatilgan bo'lsa.
 */
export function localOnly(req, res, next) {
  // Production'da "localhost" ga ishonilmaydi — faqat kuchli parol hal qiladi
  if (config.admin.allowRemote || (!config.production && isLocalRequest(req))) return next();

  const error = config.production
    ? 'Admin Panel yopiq: Render’da ADMIN_PASSWORD kamida 10 belgili kuchli parol bo‘lishi kerak'
    : 'Admin Panel faqat localhost’dan ochiladi';
  return res.status(403).json({ ok: false, error });
}

/** Parolni taxmin qilishdan himoya: bitta IP'dan 15 daqiqada 8 ta noto'g'ri urinish. */
const loginFailures = new Map(); // ip → { count, resetAt }
const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 15 * 60_000;

export function loginRateLimit(req, res, next) {
  const now = Date.now();
  const entry = loginFailures.get(req.ip);
  if (entry && entry.resetAt < now) loginFailures.delete(req.ip);
  if ((loginFailures.get(req.ip)?.count || 0) >= LOGIN_LIMIT) {
    return res.status(429).json({ ok: false, error: 'Juda ko‘p urinish. 15 daqiqadan so‘ng qayta urinib ko‘ring.' });
  }
  // Javob 401 bo'lsa — urinish hisoblanadi
  res.on('finish', () => {
    if (res.statusCode !== 401) return;
    const current = loginFailures.get(req.ip) || { count: 0, resetAt: Date.now() + LOGIN_WINDOW_MS };
    current.count += 1;
    loginFailures.set(req.ip, current);
  });
  next();
}

/** Admin token = parol + bot tokenidan olingan HMAC (parolning o'zi saqlanmaydi). */
export function createAdminToken() {
  return crypto
    .createHmac('sha256', config.bot.token)
    .update(`admin:${config.admin.password}`)
    .digest('hex');
}

/** Admin Panel so'rovlarini himoyalaydi. */
export function adminAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const expected = createAdminToken();

  const valid =
    token.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));

  if (!valid) {
    return res.status(401).json({ ok: false, error: 'Sessiya tugagan. Qaytadan kiring.' });
  }
  next();
}

/** Barcha xatolarni ushlovchi middleware. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, _next) {
  // Prisma: yozuv topilmadi
  if (error.code === 'P2025') {
    return res.status(404).json({ ok: false, error: 'Maʼlumot topilmadi' });
  }

  const status = error.status || 500;
  if (status >= 500) console.error('❌ API xatosi:', error);

  res.status(status).json({
    ok: false,
    error: status >= 500 ? 'Serverda xatolik yuz berdi. Birozdan so‘ng qayta urinib ko‘ring.' : error.message,
  });
}
