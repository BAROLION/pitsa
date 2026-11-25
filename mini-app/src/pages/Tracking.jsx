import { useEffect, useState } from 'react';
import Empty from '../components/Empty.jsx';
import Icon from '../components/Icon.jsx';
import TrackMap from '../components/TrackMap.jsx';
import { money, formatClock, minutesLeft } from '../format.js';
import { destinationOf, distanceKm } from '../geo.js';
import { haptic } from '../telegram.js';

const STEPS = [
  { key: 'KUTILMOQDA', label: 'Qabul qilindi va tayyorlanmoqda', icon: 'check' },
  { key: 'YOLDA', label: 'Kuryer yo‘lda', icon: 'bike' },
  { key: 'YETKAZILDI', label: 'Yetkazildi', icon: 'home' },
];
const STEP_INDEX = { KUTILMOQDA: 0, YOLDA: 1, YETKAZILDI: 2 };

/** "20 soniya oldin", "3 daqiqa oldin" */
function ago(date) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds} soniya oldin`;
  return `${Math.round(seconds / 60)} daqiqa oldin`;
}

const isActive = (order) => order.status === 'KUTILMOQDA' || order.status === 'YOLDA';

export default function Tracking({ orders, onGoCatalog }) {
  const active = orders.filter(isActive);
  const [selectedId, setSelectedId] = useState(null);
  const order = active.find((item) => item.id === selectedId) || active[0];

  // "N soniya oldin" va qolgan daqiqalar har 5 soniyada yangilansin
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  if (!order) {
    return (
      <div className="screen">
        <div className="page-head">
          <div className="page-head__row">
            <h1 className="page-title">Kuzatish</h1>
          </div>
        </div>
        <Empty
          icon="🛵"
          title="Faol buyurtma yo‘q"
          text="Buyurtma berganingizdan so‘ng kuryer qayerdaligini shu yerda xaritada ko‘rasiz."
          action={
            <button className="btn btn--primary btn--auto" onClick={onGoCatalog}>
              Menyuni ochish
            </button>
          }
        />
      </div>
    );
  }

  const destination = destinationOf(order.location);
  const onTheWay = order.status === 'YOLDA';
  const courier =
    onTheWay && Number.isFinite(order.courierLat) && Number.isFinite(order.courierLng)
      ? { lat: order.courierLat, lng: order.courierLng }
      : null;
  const stale = courier && Date.now() - new Date(order.courierLocAt).getTime() > 3 * 60_000;
  const km = distanceKm(courier, destination);
  const left = onTheWay && order.etaAt ? minutesLeft(order.etaAt) : null;
  const phone = order.courierPhone?.replace(/[^\d+]/g, '');
  const step = STEP_INDEX[order.status] ?? 0;
  const address = String(order.location || '').split('\n')[0];

  return (
    <div className="screen screen--flush track-page">
      <div className="track-page__map">
        <TrackMap key={order.id} destination={destination} courier={courier} />

        {active.length > 1 && (
          <div className="track-page__tabs" role="tablist" aria-label="Faol buyurtmalar">
            {active.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={item.id === order.id}
                className={`chip ${item.id === order.id ? 'chip--on' : ''}`}
                onClick={() => {
                  haptic('light');
                  setSelectedId(item.id);
                }}
              >
                #{item.id}
              </button>
            ))}
          </div>
        )}

        {onTheWay && !courier && (
          <div className="track-page__notice">📡 Kuryer joylashuvini hali ulashmadi — tez orada xaritada paydo bo‘ladi</div>
        )}
        {stale && <div className="track-page__notice">📡 Kuryer joylashuvi {ago(order.courierLocAt)} yangilangan</div>}
      </div>

      <div className="track-sheet">
        <div className="track-sheet__head">
          <div>
            <div className="track-sheet__title">{onTheWay ? 'Kuryer yo‘lda' : 'Buyurtma tayyorlanmoqda'}</div>
            <div className="track-sheet__sub">
              Buyurtma #{order.id} · {money(order.total)}
            </div>
          </div>
          {onTheWay && left !== null && (
            <div className="track-sheet__eta" aria-label={left > 0 ? `${left} daqiqa qoldi` : 'Tez orada'}>
              {left > 0 ? (
                <>
                  <b>{left}</b>
                  <span>daqiqa</span>
                </>
              ) : (
                <span>Hozir yetib boradi</span>
              )}
            </div>
          )}
        </div>

        {onTheWay && (
          <div className="track-facts">
            <div className="track-fact">
              <Icon name="clock" size={18} />
              <span>
                Soat <b>{formatClock(order.etaAt)}</b> gacha
              </span>
            </div>
            {km !== null && (
              <div className="track-fact">
                <Icon name="pin" size={18} />
                <span>
                  <b>{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}</b> qoldi
                </span>
              </div>
            )}
            {courier && !stale && (
              <div className="track-fact track-fact--live">
                <span className="live-dot" aria-hidden="true" />
                <span>Jonli · {ago(order.courierLocAt)}</span>
              </div>
            )}
          </div>
        )}

        {onTheWay && (
          <div className="track-courier">
            <span className="track-courier__avatar" aria-hidden="true">
              🛵
            </span>
            <span className="track-courier__name">
              <span className="track-courier__label">Kuryer</span>
              {order.courierName || 'Kuryer'}
            </span>
            {phone && (
              <a className="btn btn--primary btn--sm" href={`tel:${phone}`}>
                📞 Qo‘ng‘iroq
              </a>
            )}
          </div>
        )}

        <ol className="steps" aria-label="Buyurtma holati">
          {STEPS.map((item, i) => (
            <li key={item.key} className={`step ${i < step ? 'step--done' : ''} ${i === step ? 'step--now' : ''}`}>
              <span className="step__dot">
                <Icon name={i < step ? 'check' : item.icon} size={15} stroke={2.6} />
              </span>
              <span className="step__label">{item.label}</span>
            </li>
          ))}
        </ol>

        {address && (
          <div className="track-address">
            <Icon name="home" size={18} />
            <span>{address}</span>
          </div>
        )}
      </div>
    </div>
  );
}
