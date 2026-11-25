import prisma from '../database/connection.js';
import config from '../config/default.js';

// Har bir so'rovda bazaga bormaslik uchun qisqa muddatli xotira (kesh).
const CACHE_TTL = 60 * 1000;
const cache = new Map();

const remember = (user) => {
  cache.set(user.telegramId, { user, at: Date.now() });
  return user;
};

const UserModel = {
  findByTelegramId(telegramId) {
    return prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
  },

  /**
   * Telegram foydalanuvchisini topadi yoki yangisini yaratadi (bor bo'lsa o'zgartirmaydi).
   * Ism faqat birinchi marta olinadi — keyin mijoz kiritgan ism saqlanib qoladi.
   */
  async upsertFromTelegram(tgUser) {
    const telegramId = String(tgUser.id);

    const cached = cache.get(telegramId);
    if (cached && Date.now() - cached.at < CACHE_TTL) return cached.user;

    const name =
      [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim() ||
      tgUser.username ||
      'Mehmon';

    const existing = await prisma.user.findUnique({ where: { telegramId } });
    if (existing) {
      // Brauzerdagi test rejimida "Mehmon" bo'lib yozilgan bo'lsa — haqiqiy ism bilan almashtiramiz.
      if (existing.name === 'Mehmon' && name !== 'Mehmon') {
        return remember(await prisma.user.update({ where: { telegramId }, data: { name } }));
      }
      return remember(existing);
    }

    try {
      return remember(
        await prisma.user.create({
          data: {
            telegramId,
            name,
            isAdmin: Boolean(config.admin.telegramId) && telegramId === config.admin.telegramId,
          },
        }),
      );
    } catch (error) {
      // Bir vaqtda ikki so'rov kelib qolsa — ikkinchisi tayyor yozuvni oladi.
      if (error.code === 'P2002') return remember(await prisma.user.findUnique({ where: { telegramId } }));
      throw error;
    }
  },

  async updateProfile(telegramId, data) {
    const payload = {};
    if (data.name && String(data.name).trim()) payload.name = String(data.name).trim().slice(0, 80);
    if (data.phone && String(data.phone).trim()) payload.phone = String(data.phone).trim().slice(0, 30);

    const user = await prisma.user.update({ where: { telegramId: String(telegramId) }, data: payload });
    return remember(user);
  },

  list() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } },
    });
  },

  count() {
    return prisma.user.count();
  },
};

export default UserModel;
