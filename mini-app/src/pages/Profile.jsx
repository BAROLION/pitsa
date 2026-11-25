import { useEffect, useState } from 'react';
import Empty from '../components/Empty.jsx';
import Icon from '../components/Icon.jsx';
import SafeImage from '../components/SafeImage.jsx';
import OrderTracking from '../components/OrderTracking.jsx';
import { money, formatDate, STATUS, cancelSecondsLeft, formatCountdown } from '../format.js';
import { haptic, getTelegramUser, confirmAction } from '../telegram.js';
import { useCart } from '../CartContext.jsx';
import api from '../api.js';

export default function Profile({ user, orders, products, onGoCart, onGoCatalog, onOrdersChanged, showToast }) {
  const { add } = useCart();
  const [cancelling, setCancelling] = useState(null);

  // Bekor qilish muddati sanog'i — faqat bekor qilsa bo'ladigan buyurtma bo'lsa, har soniyada
  const [, setTick] = useState(0);
  const anyCancellable = orders.some((order) => cancelSecondsLeft(order) > 0);
  useEffect(() => {
    if (!anyCancellable) return undefined;
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [anyCancellable]);

  const cancelOrder = async (order) => {
    haptic('warning');
    const ok = await confirmAction(`Buyurtma #${order.id} bekor qilinsinmi?`);
    if (!ok) return;

    setCancelling(order.id);
    try {
      await api.cancelOrder(order.id);
      haptic('success');
      showToast('Buyurtma bekor qilindi');
    } catch (requestError) {
      haptic('error');
      showToast(requestError.message);
    } finally {
      setCancelling(null);
      onOrdersChanged?.();
    }
  };
  const name = user?.name || getTelegramUser()?.first_name || 'Mehmon';
  const initial = name.trim().charAt(0).toUpperCase();

  const reorder = (order) => {
    let added = 0;
    for (const item of order.items || []) {
      const product = products.find((entry) => entry.id === item.productId);
      if (product) {
        add(product, item.quantity);
        added += 1;
      }
    }

    if (added === 0) {
      haptic('error');
      showToast('Bu mahsulotlar hozir mavjud emas');
      return;
    }

    haptic('success');
    showToast('Savatchaga qo‘shildi');
    onGoCart();
  };

  const spent = orders
    .filter((order) => order.status !== 'BEKOR_QILINDI')
    .reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="screen screen--flush">
      <header className="top">
        <div className="profile-top">
          <div className="avatar">{initial}</div>
          <div style={{ minWidth: 0 }}>
            <div className="profile-top__name">
              <bdi>{name}</bdi>
            </div>
            <div className="profile-top__phone">{user?.phone || 'Telefon hali kiritilmagan'}</div>
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat__value">{orders.length}</div>
            <div className="stat__label">buyurtma</div>
          </div>
          <div className="stat">
            <div className="stat__value">{money(spent)}</div>
            <div className="stat__label">jami xarid</div>
          </div>
        </div>
      </header>

      <div className="pad">
        <div className="section-head">
          <h2 className="section-title">📜 Mening buyurtmalarim</h2>
        </div>

        {orders.length === 0 ? (
          <Empty
            icon="📭"
            title="Buyurtmalar yo‘q"
            text="Birinchi buyurtmangizni bering — tarix shu yerda saqlanadi."
            action={
              <button className="btn btn--primary btn--auto" onClick={onGoCatalog}>
                Menyuni ochish
              </button>
            }
          />
        ) : (
          orders.map((order) => {
            const status = STATUS[order.status] || STATUS.KUTILMOQDA;
            const list = order.items || [];
            return (
              <article className="order" key={order.id}>
                <div className="order__head">
                  <div>
                    <div className="order__id">Buyurtma #{order.id}</div>
                    <div className="order__date">{formatDate(order.createdAt)}</div>
                  </div>
                  <span className={`badge badge--${status.tone}`}>{status.label}</span>
                </div>

                <OrderTracking order={order} />

                {order.status === 'KUTILMOQDA' && (
                  <div className="order__note">🍳 Tayyorlanmoqda — kuryer olishi bilan yetib borish vaqtini yozamiz</div>
                )}

                {cancelSecondsLeft(order) > 0 && (
                  <button
                    className="cancel-btn"
                    onClick={() => cancelOrder(order)}
                    disabled={cancelling === order.id}
                  >
                    <Icon name="close" size={17} stroke={2.6} />
                    <span>{cancelling === order.id ? 'Bekor qilinmoqda...' : 'Buyurtmani bekor qilish'}</span>
                    <span className="cancel-btn__timer">{formatCountdown(cancelSecondsLeft(order))}</span>
                  </button>
                )}

                {order.status === 'YETKAZILDI' && order.deliveredAt && order.pickedUpAt && (
                  <div className="order__note order__note--ok">
                    ✅ {Math.max(1, Math.round((new Date(order.deliveredAt) - new Date(order.pickedUpAt)) / 60_000))}{' '}
                    daqiqada yetkazildi{order.courierName ? ` · ${order.courierName}` : ''}
                  </div>
                )}

                <div className="order__thumbs" aria-hidden="true">
                  {list.slice(0, 5).map((item) => (
                    <SafeImage key={item.productId} src={item.imageUrl} alt="" />
                  ))}
                </div>

                {list.map((item) => (
                  <div className="order__line" key={`${order.id}-${item.productId}`}>
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span>{money(item.sum)}</span>
                  </div>
                ))}

                <div className="order__foot">
                  <span className="order__total">{money(order.total)}</span>
                  <button className="btn btn--primary btn--sm" onClick={() => reorder(order)}>
                    <Icon name="repeat" size={17} stroke={2.4} /> Yana shundan buyurtma qilish
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
