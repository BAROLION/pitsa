import { Telegraf } from 'telegraf';
import config from '../config/default.js';

if (!config.bot.token) {
  throw new Error('❌ BOT_TOKEN topilmadi. .env faylini tekshiring.');
}

export const bot = new Telegraf(config.bot.token);

/** Telegram Mini App faqat HTTPS manzil bilan ochiladi. */
export function hasMiniApp() {
  return config.bot.miniAppUrl.startsWith('https://');
}

/** HTML parse_mode uchun matnni xavfsiz qiladi. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatSum(value) {
  return `${Number(value || 0).toLocaleString('ru-RU').replace(/[\s  ]/g, ' ')} so‘m`;
}

/** Mini App'ni ochuvchi inline tugma (initData shu orqali to'liq keladi). */
export function openAppMarkup(text = '🍕 Buyurtma berish') {
  if (!hasMiniApp()) return undefined;
  return {
    inline_keyboard: [[{ text, web_app: { url: config.bot.miniAppUrl } }]],
  };
}

/** Pastki doimiy klaviatura. */
export function mainKeyboard() {
  return {
    keyboard: [[{ text: '📜 Buyurtmalarim' }, { text: '📞 Aloqa' }]],
    resize_keyboard: true,
  };
}

/** Xabar yuborish — xato bo'lsa dastur to'xtamaydi. */
export async function sendMessageSafe(chatId, text, extra = {}) {
  try {
    await bot.telegram.sendMessage(chatId, text, { parse_mode: 'HTML', ...extra });
    return true;
  } catch (error) {
    console.error(`⚠️  Xabar yuborilmadi (${chatId}):`, error.message);
    return false;
  }
}

export default bot;
