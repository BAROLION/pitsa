import OrderModel from '../models/Order.js';
import config from '../config/default.js';
import { sendMessageSafe, escapeHtml, formatSum } from '../core/bot.js';

export const CANCEL_ERRORS = {
  not_found: 'Buyurtma topilmadi',
  already: 'Bu buyurtma allaqachon bekor qilingan',
  status: 'Buyurtma allaqachon kuryerda. Bekor qilish uchun bizga qo‘ng‘iroq qiling.',
  expired: '5 daqiqa o‘tib ketdi — buyurtmangiz tayyorlanmoqda. Bekor qilish uchun bizga qo‘ng‘iroq qiling.',
};

/**
 * Mijoz buyurtmani bekor qiladi (Mini App yoki bot tugmasi orqali).
 * Muvaffaqiyatli bo'lsa mijozga va adminga Telegram'da xabar boradi.
 * → { ok: true, order } yoki { ok: false, error, message }
 */
export async function cancelOrderByCustomer(orderId, user) {
  const result = await OrderModel.cancelByCustomer(orderId, user.id);
  if (result.error) return { ok: false, error: result.error, message: CANCEL_ERRORS[result.error] };

  const { order } = result;

  sendMessageSafe(
    user.telegramId,
    `❌ <b>Buyurtma #${order.id} bekor qilindi.</b>\nIstalgan vaqtda qaytadan buyurtma berishingiz mumkin 🍕`,
  );

  // Oshxona tayyorlashni boshlab yuborgan bo'lishi mumkin — admin darhol bilsin
  const adminId = config.admin.telegramId;
  if (adminId && String(adminId) !== String(user.telegramId)) {
    sendMessageSafe(
      adminId,
      `⚠️ <b>Mijoz buyurtmani bekor qildi</b>\n\n` +
        `Buyurtma #${order.id} · ${formatSum(order.total)}\n` +
        `👤 ${escapeHtml(user.name || '')}${order.phone ? ` · ${escapeHtml(order.phone)}` : ''}`,
    );
  }

  return { ok: true, order };
}
