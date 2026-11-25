import config from '../config/default.js';
import { hasMiniApp, openAppMarkup, mainKeyboard, escapeHtml, formatSum } from '../core/bot.js';
import UserModel from '../models/User.js';
import OrderModel, { CANCEL_WINDOW_MS } from '../models/Order.js';
import { cancelOrderByCustomer } from '../services/orderCancel.js';

const cancelButton = (orderId) => ({
  inline_keyboard: [[{ text: `❌ Bekor qilish (${CANCEL_WINDOW_MS / 60_000} daqiqa ichida)`, callback_data: `cancel:${orderId}` }]],
});

/** Tugmalarni olib tashlaydi (xabar o'zgarmagan bo'lsa Telegram xato beradi — e'tiborsiz). */
const clearButtons = (ctx) => ctx.editMessageReplyMarkup(undefined).catch(() => {});

const STATUS_LABEL = {
  KUTILMOQDA: '⏳ Kutilmoqda',
  YOLDA: '🛵 Yo‘lda',
  YETKAZILDI: '✅ Yetkazildi',
  BEKOR_QILINDI: '❌ Bekor qilindi',
};

async function sendOpenButton(ctx, text) {
  if (!hasMiniApp()) {
    return ctx.reply(config.messages.noMiniApp, { parse_mode: 'HTML' });
  }
  return ctx.reply(text, { parse_mode: 'HTML', reply_markup: openAppMarkup() });
}

export const botController = {
  /** /start */
  async start(ctx) {
    const user = await UserModel.upsertFromTelegram(ctx.from);

    await ctx.reply(config.messages.welcome(escapeHtml(user.name)), {
      parse_mode: 'HTML',
      reply_markup: mainKeyboard(),
    });

    await sendOpenButton(ctx, '🍕 Menyuni ochish uchun bosing:');
  },

  /** /menu */
  async menu(ctx) {
    await sendOpenButton(ctx, '🍕 Menyu shu yerda — tanlang va buyurtma bering:');
  },

  /** 📜 Buyurtmalarim, /orders */
  async myOrders(ctx) {
    const user = await UserModel.findByTelegramId(ctx.from.id);
    const orders = user ? await OrderModel.listByUser(user.id) : [];

    if (orders.length === 0) {
      return sendOpenButton(ctx, 'Sizda hali buyurtmalar yo‘q 🍕\nBirinchi buyurtmangizni bering!');
    }

    const text = orders
      .slice(0, 10)
      .map((order) => {
        const items = (Array.isArray(order.items) ? order.items : [])
          .map((item) => `   • ${escapeHtml(item.name)} × ${item.quantity}`)
          .join('\n');
        const date = new Date(order.createdAt).toLocaleDateString('ru-RU');
        const eta =
          order.status === 'YOLDA' && order.etaAt
            ? `\n   🛵 ${escapeHtml(order.courierName || 'Kuryer')} · soat ${new Date(order.etaAt).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Tashkent',
              })} gacha yetib boradi`
            : '';
        return `<b>#${order.id}</b> — ${STATUS_LABEL[order.status]}\n${items}\n   💰 ${formatSum(order.total)}  •  📅 ${date}${eta}`;
      })
      .join('\n\n');

    await ctx.reply(`📜 <b>Mening buyurtmalarim</b>\n\n${text}`, { parse_mode: 'HTML' });
  },

  /** "❌ Bekor qilish" — avval tasdiq so'raymiz (tasodifan bosilmasin) */
  async cancelAsk(ctx) {
    const id = Number(ctx.match[1]);
    await ctx.answerCbQuery();
    await ctx
      .editMessageReplyMarkup({
        inline_keyboard: [
          [
            { text: '✅ Ha, bekor qilish', callback_data: `cancel_yes:${id}` },
            { text: '↩️ Yo‘q', callback_data: `cancel_no:${id}` },
          ],
        ],
      })
      .catch(() => {});
  },

  /** "↩️ Yo'q" — tugmani avvalgi holatiga qaytaramiz */
  async cancelKeep(ctx) {
    await ctx.answerCbQuery('Buyurtma saqlanib qoldi 👍');
    await ctx.editMessageReplyMarkup(cancelButton(Number(ctx.match[1]))).catch(() => {});
  },

  /** "✅ Ha, bekor qilish" */
  async cancelConfirm(ctx) {
    const id = Number(ctx.match[1]);
    const user = await UserModel.findByTelegramId(ctx.from.id);
    if (!user) return ctx.answerCbQuery('Buyurtma topilmadi', { show_alert: true });

    const result = await cancelOrderByCustomer(id, user);
    if (!result.ok) {
      await ctx.answerCbQuery(result.message, { show_alert: true });
      // Endi bekor qilib bo'lmaydi — tugma ham kerak emas
      if (result.error !== 'not_found') await clearButtons(ctx);
      return undefined;
    }

    await ctx.answerCbQuery('Buyurtma bekor qilindi');
    await clearButtons(ctx);
    return undefined;
  },

  /** 📞 Aloqa, /help */
  async contact(ctx) {
    await ctx.reply(
      '📞 <b>Aloqa</b>\n\n' +
        'Telefon: +998 90 123 45 67\n' +
        'Ish vaqti: 10:00 — 23:00\n' +
        'Yetkazib berish: bepul, o‘rtacha 30 daqiqa',
      { parse_mode: 'HTML' },
    );
  },

  /** Boshqa har qanday matn */
  async fallback(ctx) {
    await sendOpenButton(ctx, 'Buyurtma berish uchun pastdagi tugmani bosing 👇');
  },
};

export default botController;
