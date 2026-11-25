import crypto from 'node:crypto';
import prisma from '../database/connection.js';

export const ORDER_STATUSES = ['KUTILMOQDA', 'YOLDA', 'YETKAZILDI', 'BEKOR_QILINDI'];

/** Mijozga qaytariladigan buyurtma: kuryer havolasi kaliti va kuryer chat ID'si olib tashlanadi. */
export function publicOrder(order) {
  if (!order) return order;
  const { courierToken, courierChatId, ...rest } = order; // eslint-disable-line no-unused-vars
  return rest;
}

/** Mijoz buyurtmani shu vaqt ichida o'zi bekor qila oladi. */
export const CANCEL_WINDOW_MS = 5 * 60_000;

const OrderModel = {
  create({ userId, items, total, location, phone, comment }) {
    return prisma.order.create({ data: { userId, items, total, location, phone, comment } });
  },

  /** Mijozning buyurtmalari. Kuryer havolasining kaliti va kuryerning Telegram ID'si mijozga berilmaydi. */
  listByUser(userId) {
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      omit: { courierToken: true, courierChatId: true },
    });
  },

  /** Kuryer bot havolasini ochdi: uning chatini buyurtmaga bog'laymiz (faqat "Yo'lda" bo'lsa). */
  async bindCourier(token, chatId) {
    const order = await prisma.order.findUnique({ where: { courierToken: token } });
    if (!order || order.status !== 'YOLDA') return null;
    return prisma.order.update({ where: { id: order.id }, data: { courierChatId: String(chatId) } });
  },

  /** Kuryerning jonli joylashuvi: unga biriktirilgan barcha "Yo'lda" buyurtmalarga yoziladi. */
  async updateCourierLocation(chatId, lat, lng) {
    const { count } = await prisma.order.updateMany({
      where: { courierChatId: String(chatId), status: 'YOLDA' },
      data: { courierLat: lat, courierLng: lng, courierLocAt: new Date() },
    });
    return count;
  },

  listAll(status) {
    return prisma.order.findMany({
      where: ORDER_STATUSES.includes(status) ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  },

  updateStatus(id, status) {
    const data = { status };
    if (status === 'YETKAZILDI') data.deliveredAt = new Date();
    if (status === 'KUTILMOQDA') {
      Object.assign(data, {
        deliveredAt: null,
        pickedUpAt: null,
        etaAt: null,
        courierToken: null,
        courierChatId: null,
        courierLat: null,
        courierLng: null,
        courierLocAt: null,
      });
    }
    return prisma.order.update({ where: { id }, data, include: { user: true } });
  },

  /** Kuryer buyurtmani oldi: holat → YOLDA, yetib borish vaqti hisoblanadi. */
  assignCourier(id, { courierName, courierPhone, etaMinutes }) {
    const now = new Date();
    return prisma.order.update({
      where: { id },
      data: {
        status: 'YOLDA',
        courierName,
        courierPhone: courierPhone || null,
        pickedUpAt: now,
        etaAt: new Date(now.getTime() + etaMinutes * 60_000),
        deliveredAt: null,
        // Har safar yangi havola: eski kuryer bu buyurtmani kuzata olmaydi
        courierToken: crypto.randomBytes(16).toString('base64url'),
        courierChatId: null,
        courierLat: null,
        courierLng: null,
        courierLocAt: null,
      },
      include: { user: true },
    });
  },

  /**
   * Mijozning o'zi bekor qilishi: faqat o'z buyurtmasi, hali "Kutilmoqda" va 5 daqiqa ichida.
   * Shart bitta so'rovda tekshiriladi — ikki marta bosilsa ham bir marta bekor bo'ladi.
   * → { order } yoki { error: 'not_found' | 'already' | 'status' | 'expired', order? }
   */
  async cancelByCustomer(id, userId) {
    const since = new Date(Date.now() - CANCEL_WINDOW_MS);
    const { count } = await prisma.order.updateMany({
      where: { id, userId, status: 'KUTILMOQDA', createdAt: { gte: since } },
      data: { status: 'BEKOR_QILINDI' },
    });
    const order = await prisma.order.findFirst({ where: { id, userId } });

    if (!order) return { error: 'not_found' };
    if (count === 1) return { order };
    if (order.status === 'BEKOR_QILINDI') return { error: 'already', order };
    if (order.status !== 'KUTILMOQDA') return { error: 'status', order };
    return { error: 'expired', order };
  },

  remove(id) {
    return prisma.order.delete({ where: { id } });
  },

  async stats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [total, pending, onTheWay, delivered, today, revenue] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'KUTILMOQDA' } }),
      prisma.order.count({ where: { status: 'YOLDA' } }),
      prisma.order.count({ where: { status: 'YETKAZILDI' } }),
      prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { status: 'YETKAZILDI' } }),
    ]);

    return { total, pending, onTheWay, delivered, today, revenue: revenue._sum.total || 0 };
  },
};

export default OrderModel;
