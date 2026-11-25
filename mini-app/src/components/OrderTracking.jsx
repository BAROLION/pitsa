import Icon from './Icon.jsx';
import { formatClock, minutesLeft } from '../format.js';

/** "Yo'lda" holatidagi buyurtma: kuryer, yetib borish vaqti va jarayon chizig'i. */
export default function OrderTracking({ order }) {
  if (order.status !== 'YOLDA' || !order.etaAt) return null;

  const left = minutesLeft(order.etaAt);
  const start = new Date(order.pickedUpAt || order.updatedAt).getTime();
  const end = new Date(order.etaAt).getTime();
  const progress = Math.min(100, Math.max(6, ((Date.now() - start) / Math.max(1, end - start)) * 100));
  const phone = order.courierPhone?.replace(/[^\d+]/g, '');

  return (
    <div className="track">
      <div className="track__top">
        <span className="track__icon" aria-hidden="true">
          <Icon name="bike" size={22} stroke={2.4} />
        </span>
        <div className="track__text">
          <div className="track__title">Kuryer yo‘lda</div>
          <div className="track__sub">Soat {formatClock(order.etaAt)} gacha yetib boradi</div>
        </div>
        <div className="track__mins" aria-label={left > 0 ? `${left} daqiqa qoldi` : 'Tez orada'}>
          {left > 0 ? (
            <>
              <b>{left}</b>
              <span>daqiqa</span>
            </>
          ) : (
            <span>Hozir yetib<br />boradi</span>
          )}
        </div>
      </div>

      <div className="track__bar" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="track__courier">
        <span>👤 {order.courierName || 'Kuryer'}</span>
        {phone && (
          <a className="track__call" href={`tel:${phone}`}>
            📞 Qo‘ng‘iroq
          </a>
        )}
      </div>
    </div>
  );
}
