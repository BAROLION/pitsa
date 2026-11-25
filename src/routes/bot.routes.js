import bot from '../core/bot.js';
import botController from '../controllers/botController.js';

/** Bot buyruqlari va tugmalarini ro'yxatdan o'tkazadi. */
export function registerBotHandlers() {
  bot.start(botController.start);

  bot.command('menu', botController.menu);
  bot.command('orders', botController.myOrders);
  bot.command('help', botController.contact);

  bot.hears('📜 Buyurtmalarim', botController.myOrders);
  bot.hears('📞 Aloqa', botController.contact);

  // Buyurtma tasdig'i ostidagi "Bekor qilish" tugmasi
  bot.action(/^cancel:(\d+)$/, botController.cancelAsk);
  bot.action(/^cancel_yes:(\d+)$/, botController.cancelConfirm);
  bot.action(/^cancel_no:(\d+)$/, botController.cancelKeep);

  bot.on('text', botController.fallback);

  bot.catch((error, ctx) => {
    console.error(`⚠️  Bot xatosi (${ctx.updateType}):`, error.message);
  });
}

export default registerBotHandlers;
