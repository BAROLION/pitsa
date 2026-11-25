import { useState } from 'react';

/**
 * Kuryer uchun bot havolasi. Kuryer uni ochib, botga "jonli joylashuv" yuborsa —
 * mijoz Mini App'dagi "Kuzatish" bo'limida uni xaritada ko'radi.
 */
export default function CourierLink({ order, compact = false }) {
  const [copied, setCopied] = useState(false);
  if (!order?.courierLink) return null;

  const text = `🛵 Buyurtma #${order.id}. Havolani oching va botga jonli joylashuvingizni yuboring:`;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(order.courierLink)}&text=${encodeURIComponent(text)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.courierLink);
    } catch {
      window.prompt('Havolani nusxalang:', order.courierLink);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <div className="courier-link courier-link--compact">
        <a className="btn btn--ghost btn--sm" href={shareUrl} target="_blank" rel="noreferrer">
          ✈️ Kuryerga yuborish
        </a>
        <button className="btn btn--ghost btn--sm" onClick={copy}>
          {copied ? '✅' : '📋'}
        </button>
      </div>
    );
  }

  return (
    <div className="courier-link">
      <div className="courier-link__title">📍 Kuryerga shu havolani yuboring</div>
      <div className="courier-link__text">
        Kuryer havolani ochib, botga <b>jonli joylashuv</b> yuborsa — mijoz uni xaritada ko‘rib turadi.
      </div>
      <code className="courier-link__url">{order.courierLink}</code>
      <div className="courier-link__actions">
        <a className="btn btn--primary btn--full" href={shareUrl} target="_blank" rel="noreferrer">
          ✈️ Telegram orqali yuborish
        </a>
        <button className="btn btn--ghost btn--full" onClick={copy}>
          {copied ? '✅ Nusxalandi' : '📋 Nusxalash'}
        </button>
      </div>
    </div>
  );
}
