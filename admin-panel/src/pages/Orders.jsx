import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api.js';
import { money, formatDate, formatClock, minutesLeft, STATUS } from '../format.js';
import Empty from '../components/Empty.jsx';
import CourierModal from '../components/CourierModal.jsx';

const FILTERS = [
  { key: '', label: 'Barchasi' },
  { key: 'KUTILMOQDA', label: 'Kutilmoqda' },
  { key: 'YOLDA', label: 'Yo‘lda' },
  { key: 'YETKAZILDI', label: 'Yetkazildi' },
  { key: 'BEKOR_QILINDI', label: 'Bekor qilingan' },
];

const REFRESH_MS = 5000;

/** Yangi buyurtma kelganda qisqa ovoz. */
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    /* ovoz o'chirilgan bo'lishi mumkin */
  }
}

/** "...?q=41.31,69.24" ko'rinishidagi havoladan koordinata. */
function coordsFrom(url) {
  const match = url.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  return match ? { lat: match[1], lng: match[2] } : null;
}

function Location({ text }) {
  return (
    <>
      {String(text || '')
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          if (!/^https?:\/\//.test(line)) return <div key={line}>{line}</div>;
          const c = coordsFrom(line);
          return (
            <div key={line} className="map-links">
              <a href={line} target="_blank" rel="noreferrer" className="map-link">
                📍 Google
              </a>
              {c && (
                <a
                  href={`https://yandex.uz/maps/?pt=${c.lng},${c.lat}&z=17&l=map`}
                  target="_blank"
                  rel="noreferrer"
                  className="map-link"
                >
                  📍 Yandex
                </a>
              )}
            </div>
          );
        })}
    </>
  );
}

/** Kuryer va yetib borish vaqti (holat "Yo'lda" bo'lganda). */
function CourierInfo({ order }) {
  if (!order.courierName) return null;
  const left = order.etaAt ? minutesLeft(order.etaAt) : null;
  const delivered = order.status === 'YETKAZILDI' && order.deliveredAt && order.pickedUpAt;

  return (
    <div className="courier">
      <div className="courier__name">
        🛵 {order.courierName}
        {order.courierPhone && (
          <a href={`tel:${order.courierPhone.replace(/[^\d+]/g, '')}`} className="courier__phone">
            {order.courierPhone}
          </a>
        )}
      </div>
      {order.status === 'YOLDA' && order.etaAt && (
        <div className={`courier__eta ${left < 0 ? 'courier__eta--late' : ''}`}>
          ⏱ {formatClock(order.etaAt)} gacha ·{' '}
          {left > 0 ? `${left} daq qoldi` : left === 0 ? 'hozir yetib boradi' : `${-left} daq kechikmoqda`}
        </div>
      )}
      {delivered && (
        <div className="courier__eta">
          ✅ {Math.max(1, Math.round((new Date(order.deliveredAt) - new Date(order.pickedUpAt)) / 60_000))} daqiqada
          yetkazildi
        </div>
      )}
    </div>
  );
}

export default function Orders({ stats, onRefreshStats }) {
  const [orders, setOrders] = useState([]);
  const [courierOrder, setCourierOrder] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fresh, setFresh] = useState(() => new Set());
  const [cancelledAlerts, setCancelledAlerts] = useState([]);
  const knownIds = useRef(null);
  const knownStatus = useRef(new Map());
  const changedByAdmin = useRef(new Map()); // id → vaqt (admin o'zi o'zgartirgan buyurtmalar)

  const load = useCallback(async () => {
    try {
      const list = await api.getOrders(filter);
      setOrders(list);
      setError('');

      // Yangi kelgan buyurtmalarni aniqlash
      const ids = new Set(list.map((order) => order.id));
      if (knownIds.current) {
        const added = list.filter((order) => !knownIds.current.has(order.id)).map((order) => order.id);
        if (added.length > 0) {
          beep();
          setFresh(new Set(added));
          setTimeout(() => setFresh(new Set()), 8000);
        }
      }
      knownIds.current = ids;

      // Mijozning o'zi bekor qilgan buyurtmalar (admin oxirgi 30 soniyada o'zgartirganlari hisobga olinmaydi)
      for (const [id, at] of changedByAdmin.current) {
        if (Date.now() - at > 30_000) changedByAdmin.current.delete(id);
      }
      const cancelled = list.filter(
        (order) =>
          order.status === 'BEKOR_QILINDI' &&
          knownStatus.current.has(order.id) &&
          knownStatus.current.get(order.id) !== 'BEKOR_QILINDI' &&
          !changedByAdmin.current.has(order.id),
      );
      if (cancelled.length > 0) {
        beep();
        setCancelledAlerts((current) => [...cancelled.filter((o) => !current.some((c) => c.id === o.id)), ...current]);
      }
      knownStatus.current = new Map(list.map((order) => [order.id, order.status]));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    knownIds.current = null;
    knownStatus.current = new Map();
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      load();
      onRefreshStats();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load, onRefreshStats]);

  const refresh = () => {
    load();
    onRefreshStats();
  };

  const changeStatus = async (id, status) => {
    if (status === 'YOLDA') {
      setCourierOrder(orders.find((order) => order.id === id) || null);
      return;
    }
    changedByAdmin.current.set(id, Date.now());
    try {
      await api.updateOrderStatus(id, status);
      refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeOrder = async (id) => {
    if (!window.confirm(`#${id} buyurtma butunlay o‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi.`)) return;
    try {
      await api.deleteOrder(id);
      refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Buyurtmalar</h1>
          <p>
            <span className="live-dot" /> Har {REFRESH_MS / 1000} soniyada avtomatik yangilanadi
          </p>
        </div>
        <button className="btn btn--ghost" onClick={refresh}>
          🔄 Yangilash
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat__label">🆕 Bugun</div>
          <div className="stat__value">{stats?.today ?? 0}</div>
        </div>
        <div className="stat">
          <div className="stat__label">⏳ Kutilmoqda</div>
          <div className="stat__value stat__value--warn">{stats?.pending ?? 0}</div>
        </div>
        <div className="stat">
          <div className="stat__label">🛵 Yo‘lda</div>
          <div className="stat__value stat__value--info">{stats?.onTheWay ?? 0}</div>
        </div>
        <div className="stat">
          <div className="stat__label">✅ Yetkazilgan</div>
          <div className="stat__value">{stats?.delivered ?? 0}</div>
        </div>
        <div className="stat">
          <div className="stat__label">💰 Tushum (yetkazilgan)</div>
          <div className="stat__value">{money(stats?.revenue ?? 0)}</div>
        </div>
      </div>

      <div className="filters">
        {FILTERS.map((item) => (
          <button
            key={item.key || 'all'}
            className={`filter ${filter === item.key ? 'filter--on' : ''}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <div className="error-box">{error}</div>}

      {cancelledAlerts.map((order) => (
        <div className="cancel-alert" key={order.id} role="alert">
          <span>
            ⚠️ <b>Mijoz #{order.id} buyurtmani bekor qildi</b> — {order.user?.name || 'mijoz'}, {money(order.total)}.
            Tayyorlanayotgan bo‘lsa, to‘xtating.
          </span>
          <button
            className="icon-btn"
            aria-label="Yopish"
            onClick={() => setCancelledAlerts((current) => current.filter((item) => item.id !== order.id))}
          >
            ✕
          </button>
        </div>
      ))}

      <div className="table-wrap">
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            Yuklanmoqda...
          </div>
        ) : orders.length === 0 ? (
          <Empty icon="📭" title="Buyurtmalar yo‘q" text="Mijozlar Mini App orqali buyurtma berganda shu yerda paydo bo‘ladi." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Mijoz</th>
                  <th>Telefon</th>
                  <th>Mahsulotlar</th>
                  <th>Manzil</th>
                  <th>Jami</th>
                  <th>Sana</th>
                  <th>Holati</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const status = STATUS[order.status] || STATUS.KUTILMOQDA;
                  const phone = order.phone || order.user?.phone;
                  return (
                    <tr key={order.id} className={fresh.has(order.id) ? 'row--new' : ''}>
                      <td className="cell-strong cell-id">#{order.id}</td>
                      <td className="cell-strong cell-title">{order.user?.name || '—'}</td>
                      <td className="cell-nowrap" data-label="Telefon">
                        {phone ? <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a> : '—'}
                      </td>
                      <td className="cell-block" data-label="Mahsulotlar">
                        <div className="items-list">
                          {(order.items || []).map((item) => (
                            <span key={`${order.id}-${item.productId}`}>
                              {item.name} <b>× {item.quantity}</b>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="cell-muted cell-address cell-block" data-label="Manzil">
                        <Location text={order.location} />
                        {order.comment && <div className="cell-comment">💬 {order.comment}</div>}
                      </td>
                      <td className="cell-strong cell-nowrap" data-label="Jami">{money(order.total)}</td>
                      <td className="cell-muted cell-nowrap" data-label="Sana">{formatDate(order.createdAt)}</td>
                      <td className="cell-status cell-block" data-label="Holati">
                        <select
                          className={`status-select status-select--${status.tone}`}
                          value={order.status}
                          onChange={(event) => changeStatus(order.id, event.target.value)}
                          aria-label="Holatni o‘zgartirish"
                        >
                          <option value="KUTILMOQDA">⏳ Kutilmoqda</option>
                          <option value="YOLDA">🛵 Yo‘lda</option>
                          <option value="YETKAZILDI">✅ Yetkazildi</option>
                          <option value="BEKOR_QILINDI">❌ Bekor qilingan</option>
                        </select>

                        {order.status === 'KUTILMOQDA' && (
                          <button className="btn btn--primary btn--sm courier-btn" onClick={() => setCourierOrder(order)}>
                            🛵 Kuryerga berish
                          </button>
                        )}

                        {order.status === 'YOLDA' && (
                          <button
                            className="btn btn--ghost btn--sm courier-btn"
                            onClick={() => changeStatus(order.id, 'YETKAZILDI')}
                          >
                            ✅ Yetkazildi
                          </button>
                        )}

                        <CourierInfo order={order} />
                      </td>
                      <td className="cell-del">
                        <button
                          className="icon-btn icon-btn--danger"
                          title="O‘chirish"
                          aria-label="O‘chirish"
                          onClick={() => removeOrder(order.id)}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {courierOrder && (
        <CourierModal
          order={courierOrder}
          onClose={() => setCourierOrder(null)}
          onDone={() => {
            setCourierOrder(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
