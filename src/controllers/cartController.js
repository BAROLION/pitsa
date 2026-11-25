import ProductModel from '../models/Product.js';
import OrderModel from '../models/Order.js';
import UserModel from '../models/User.js';
import config from '../config/default.js';
import { sendMessageSafe, escapeHtml, formatSum } from '../core/bot.js';
import { httpError, parseId } from '../middlewares/auth.middleware.js';
import { cancelOrderByCustomer } from '../services/orderCancel.js';
import { CANCEL_WINDOW_MS } from '../models/Order.js';

const publicUser = (user) => ({
  id: user.id,
  telegramId: user.telegramId,
  name: user.name,
  phone: user.phone,
});

export const cartController = {
  /** GET /api/client/me */
  async getMe(req, res) {
    res.json({ ok: true, data: publicUser(req.user) });
  },

  /** POST /api/client/profile */
  async updateProfile(req, res) {
    const user = await UserModel.updateProfile(req.user.telegramId, req.body || {});
    res.json({ ok: true, data: publicUser(user) });
  },

  /** GET /api/client/categories */
  async getCategories(req, res) {
    const categories = await ProductModel.categories();
    res.json({ ok: true, data: ['Barchasi', ...categories] });
  },

  /** GET /api/client/products */
  async getProducts(req, res) {
    res.json({ ok: true, data: await ProductModel.listActive() });
  },

  /** GET /api/client/orders */
  async getMyOrders(req, res) {
    res.json({ ok: true, data: await OrderModel.listByUser(req.user.id) });
  },

  /**
   * POST /api/client/orders
   * Body: { items: [{ productId, quantity }], name, phone, location, comment }
   */
  async createOrder(req, res) {
    const { items, name = '', phone = '', location = '', comment = '' } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) throw httpError(400, 'Savatcha bo‘sh');
    if (!String(name).trim()) throw httpError(400, 'Ismingizni kiriting');
    if (String(phone).replace(/\D/g, '').length < 7) throw httpError(400, 'Telefon raqamingizni to‘g‘ri kiriting');
    if (!String(location).trim()) throw httpError(400, 'Yetkazib berish manzilini kiriting');

    // Narxlar har doim bazadan olinadi — frontend'dan kelgan narxga ishonilmaydi.
    const ids = [...new Set(items.map((item) => Number(item.productId)).filter(Number.isInteger))];
    const products = await ProductModel.findManyByIds(ids);
    const productMap = new Map(products.map((product) => [product.id, product]));

    const orderItems = [];
    for (const item of items) {
      const product = productMap.get(Number(item.productId));
      if (!product || !product.isActive) continue;

      const quantity = Math.max(1, Math.min(50, Math.floor(Number(item.quantity) || 1)));
      orderItems.push({
        productId: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        price: product.newPrice,
        quantity,
        sum: product.newPrice * quantity,
      });
    }

    if (orderItems.length === 0) throw httpError(400, 'Tanlangan mahsulotlar hozir mavjud emas');

    const total = orderItems.reduce((sum, item) => sum + item.sum, 0);

    const [, order] = await Promise.all([
      UserModel.updateProfile(req.user.telegramId, { name, phone }),
      OrderModel.create({
        userId: req.user.id,
        items: orderItems,
        total,
        location: String(location).trim().slice(0, 500),
        phone: String(phone).trim().slice(0, 30),
        comment: String(comment).trim().slice(0, 500) || null,
      }),
    ]);

    // Bot mijozga to'g'ridan-to'g'ri tasdiq yuboradi (fonda — javobni kechiktirmaydi).
    const lines = orderItems
      .map((item) => `• ${escapeHtml(item.name)} × ${item.quantity} — ${formatSum(item.sum)}`)
      .join('\n');

    // Manzil: matn qatorlari + xarita havolasi (Mini App xaritadan tanlangan nuqtani yuboradi)
    const locationLines = order.location.split('\n').filter(Boolean);
    const mapUrl = locationLines.find((line) => /^https:\/\//.test(line));
    const addressText = locationLines.filter((line) => line !== mapUrl).join(', ');
    const locationHtml =
      `📍 ${escapeHtml(addressText || 'Xaritada belgilangan nuqta')}` +
      (mapUrl ? ` — <a href="${escapeHtml(mapUrl)}">xaritada</a>` : '');

    sendMessageSafe(
      req.user.telegramId,
      `✅ ${config.messages.orderAccepted}\n\n` +
        `<b>Buyurtma #${order.id}</b>\n${lines}\n\n` +
        `<b>Jami: ${formatSum(total)}</b>\n` +
        locationHtml +
        (order.comment ? `\n🏠 ${escapeHtml(order.comment)}` : ''),
      {
        // Mini App buyurtmadan keyin yopiladi — shuning uchun bekor qilish tugmasi shu xabarda ham bor
        reply_markup: {
          inline_keyboard: [
            [{ text: `❌ Bekor qilish (${CANCEL_WINDOW_MS / 60_000} daqiqa ichida)`, callback_data: `cancel:${order.id}` }],
          ],
        },
        link_preview_options: { is_disabled: true },
      },
    );

    res.status(201).json({ ok: true, data: order });
  },

  /** POST /api/client/orders/:id/cancel — mijoz 5 daqiqa ichida bekor qiladi */
  async cancelOrder(req, res) {
    const result = await cancelOrderByCustomer(parseId(req.params.id), req.user);
    if (!result.ok) throw httpError(result.error === 'not_found' ? 404 : 409, result.message);
    res.json({ ok: true, data: result.order });
  },
};

export default cartController;
