import crypto from 'node:crypto';
import ProductModel from '../models/Product.js';
import OrderModel, { ORDER_STATUSES } from '../models/Order.js';
import UserModel from '../models/User.js';
import config from '../config/default.js';
import bot, { sendMessageSafe, escapeHtml } from '../core/bot.js';
import { createAdminToken, httpError, parseId } from '../middlewares/auth.middleware.js';

const STATUS_TEXT = {
  KUTILMOQDA: '⏳ qabul qilindi va tayyorlanmoqda',
  YOLDA: '🛵 yo‘lda',
  YETKAZILDI: '✅ yetkazildi. Yoqimli ishtaha!',
  BEKOR_QILINDI: '❌ bekor qilindi',
};

/** Soat:daqiqa (Toshkent vaqti). */
const clock = (date) =>
  new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' });

const courierMessage = (order, etaMinutes) =>
  [
    `🛵 <b>Buyurtma #${order.id} yo‘lda!</b>`,
    '',
    `Kuryer buyurtmangizni oldi va sizga qarab yo‘lga chiqdi.`,
    `⏱ Taxminan <b>${etaMinutes} daqiqada</b> — soat <b>${clock(order.etaAt)}</b> gacha yetib boradi.`,
    '',
    `👤 Kuryer: <b>${escapeHtml(order.courierName)}</b>`,
    order.courierPhone ? `📞 ${escapeHtml(order.courierPhone)}` : '',
  ]
    .filter((line, i, all) => line !== '' || all[i - 1] !== '')
    .join('\n')
    .trim();

function validateProduct(body) {
  const data = ProductModel.normalize(body || {});
  if (!data.name) throw httpError(400, 'Mahsulot nomini kiriting');
  if (!/^https?:\/\//i.test(data.imageUrl)) throw httpError(400, 'Rasm uchun to‘g‘ri URL kiriting (https://...)');
  if (data.newPrice <= 0) throw httpError(400, 'Yangi narxni kiriting');
  return body;
}

/** Kuryer uchun bot havolasi: ochganda bot uni shu buyurtmaga bog'laydi. */
function courierLink(order) {
  const username = config.bot.username || bot.botInfo?.username;
  if (!order.courierToken || !username || order.status !== 'YOLDA') return null;
  return `https://t.me/${username}?start=c_${order.courierToken}`;
}

const withCourierLink = (order) => ({ ...order, courierLink: courierLink(order) });

export const adminController = {
  /** POST /api/admin/login */
  async login(req, res) {
    const password = String(req.body?.password || '');
    const expected = config.admin.password;

    const valid =
      password.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected));

    if (!valid) throw httpError(401, 'Parol noto‘g‘ri');
    res.json({ ok: true, data: { token: createAdminToken() } });
  },

  /** GET /api/admin/stats */
  async getStats(req, res) {
    const [orders, products, users] = await Promise.all([
      OrderModel.stats(),
      ProductModel.count(),
      UserModel.count(),
    ]);
    res.json({ ok: true, data: { ...orders, products, users } });
  },

  // ---------- BUYURTMALAR ----------

  /** GET /api/admin/orders?status=KUTILMOQDA */
  async getOrders(req, res) {
    const orders = await OrderModel.listAll(req.query.status);
    res.json({ ok: true, data: orders.map(withCourierLink) });
  },

  /** PATCH /api/admin/orders/:id/status */
  async updateOrderStatus(req, res) {
    const id = parseId(req.params.id);
    const { status } = req.body || {};
    if (!ORDER_STATUSES.includes(status)) throw httpError(400, 'Noto‘g‘ri holat');
    if (status === 'YOLDA') throw httpError(400, 'Kuryerga berish uchun «Kuryerga berish» tugmasidan foydalaning');

    const order = await OrderModel.updateStatus(id, status);

    if (order.user?.telegramId) {
      const late =
        status === 'YETKAZILDI' && order.pickedUpAt
          ? ` (${Math.max(1, Math.round((order.deliveredAt - order.pickedUpAt) / 60_000))} daqiqada)`
          : '';
      sendMessageSafe(order.user.telegramId, `📦 <b>Buyurtma #${order.id}</b> ${STATUS_TEXT[status]}${late}`);
    }

    // Kuryerga: buyurtma yopildi — jonli joylashuvni to'xtatsa bo'ladi
    if (order.courierChatId && (status === 'YETKAZILDI' || status === 'BEKOR_QILINDI')) {
      sendMessageSafe(
        order.courierChatId,
        `${status === 'YETKAZILDI' ? '✅' : '❌'} <b>Buyurtma #${order.id}</b> ${status === 'YETKAZILDI' ? 'yetkazildi' : 'bekor qilindi'}. ` +
          'Jonli joylashuvni ulashishni to‘xtatishingiz mumkin. Rahmat! 🛵',
      );
    }

    res.json({ ok: true, data: withCourierLink(order) });
  },

  /**
   * POST /api/admin/orders/:id/courier
   * Body: { courierName, courierPhone?, etaMinutes }
   * Kuryer buyurtmani oldi → holat "Yo'lda", mijozga yetib borish vaqti yuboriladi.
   */
  async assignCourier(req, res) {
    const id = parseId(req.params.id);
    const courierName = String(req.body?.courierName || '').trim().slice(0, 60);
    const courierPhone = String(req.body?.courierPhone || '').trim().slice(0, 30);
    const etaMinutes = Math.round(Number(req.body?.etaMinutes));

    if (!courierName) throw httpError(400, 'Kuryer ismini kiriting');
    if (courierPhone && courierPhone.replace(/\D/g, '').length < 7) throw httpError(400, 'Kuryer telefonini to‘g‘ri kiriting');
    if (!Number.isFinite(etaMinutes) || etaMinutes < 5 || etaMinutes > 180) {
      throw httpError(400, 'Yetib borish vaqti 5–180 daqiqa oralig‘ida bo‘lsin');
    }

    const order = await OrderModel.assignCourier(id, { courierName, courierPhone, etaMinutes });

    if (order.user?.telegramId) sendMessageSafe(order.user.telegramId, courierMessage(order, etaMinutes));

    res.json({ ok: true, data: withCourierLink(order) });
  },

  /** DELETE /api/admin/orders/:id */
  async deleteOrder(req, res) {
    await OrderModel.remove(parseId(req.params.id));
    res.json({ ok: true });
  },

  // ---------- MAHSULOTLAR (CRUD) ----------

  /** GET /api/admin/products */
  async getProducts(req, res) {
    res.json({ ok: true, data: await ProductModel.listAll() });
  },

  /** POST /api/admin/products */
  async createProduct(req, res) {
    const product = await ProductModel.create(validateProduct(req.body));
    res.status(201).json({ ok: true, data: product });
  },

  /** PUT /api/admin/products/:id */
  async updateProduct(req, res) {
    const product = await ProductModel.update(parseId(req.params.id), validateProduct(req.body));
    res.json({ ok: true, data: product });
  },

  /** DELETE /api/admin/products/:id */
  async deleteProduct(req, res) {
    await ProductModel.remove(parseId(req.params.id));
    res.json({ ok: true });
  },

  // ---------- MIJOZLAR ----------

  /** GET /api/admin/users */
  async getUsers(req, res) {
    res.json({ ok: true, data: await UserModel.list() });
  },
};

export default adminController;
