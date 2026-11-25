import { useState } from 'react';
import Modal from './Modal.jsx';
import CourierLink from './CourierLink.jsx';
import api from '../api.js';

const COURIERS_KEY = 'pizza_couriers';
const ETA_PRESETS = [15, 20, 30, 45, 60];

/** Oldin kiritilgan kuryerlar — keyingi safar bitta bosish bilan tanlash uchun. */
function loadCouriers() {
  try {
    const list = JSON.parse(localStorage.getItem(COURIERS_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function rememberCourier(courier) {
  try {
    const rest = loadCouriers().filter((item) => item.name.toLowerCase() !== courier.name.toLowerCase());
    localStorage.setItem(COURIERS_KEY, JSON.stringify([courier, ...rest].slice(0, 12)));
  } catch {
    /* ignore */
  }
}

export default function CourierModal({ order, onClose, onDone }) {
  const [couriers] = useState(loadCouriers);
  const [name, setName] = useState(couriers[0]?.name || '');
  const [phone, setPhone] = useState(couriers[0]?.phone || '');
  const [eta, setEta] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [assigned, setAssigned] = useState(null); // kuryerga berilgan buyurtma (havola bilan)

  const pickCourier = (courier) => {
    setName(courier.name);
    setPhone(courier.phone || '');
  };

  const onNameChange = (value) => {
    setName(value);
    const known = couriers.find((item) => item.name.toLowerCase() === value.trim().toLowerCase());
    if (known) setPhone(known.phone || '');
  };

  const arrival = new Date(Date.now() + (Number(eta) || 0) * 60_000).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const save = async (event) => {
    event?.preventDefault();
    setError('');
    if (!name.trim()) return setError('Kuryer ismini kiriting');
    const minutes = Number(eta);
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 180) {
      return setError('Yetib borish vaqti 5–180 daqiqa oralig‘ida bo‘lsin');
    }

    setSaving(true);
    try {
      const result = await api.assignCourier(order.id, { courierName: name.trim(), courierPhone: phone.trim(), etaMinutes: minutes });
      rememberCourier({ name: name.trim(), phone: phone.trim() });
      // Havola bo'lsa — kuryerga yuborish uchun ko'rsatamiz, bo'lmasa darhol yopamiz
      if (result?.courierLink) setAssigned(result);
      else onDone();
    } catch (requestError) {
      setError(requestError.message);
      setSaving(false);
    }
  };

  if (assigned) {
    return (
      <Modal
        title={`✅ Buyurtma #${order.id} — ${assigned.courierName}`}
        onClose={onDone}
        footer={
          <button className="btn btn--ghost btn--full" onClick={onDone}>
            Tayyor
          </button>
        }
      >
        <div className="courier-done">Mijozga yetib borish vaqti yuborildi.</div>
        <CourierLink order={assigned} />
      </Modal>
    );
  }

  return (
    <Modal
      title={`🛵 Buyurtma #${order.id} — kuryerga berish`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost btn--full" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn btn--primary btn--full" onClick={save} disabled={saving}>
            {saving ? 'Yuborilmoqda...' : 'Kuryer oldi — mijozga xabar berish'}
          </button>
        </>
      }
    >
      <form onSubmit={save}>
        {error && <div className="error-box">{error}</div>}

        {couriers.length > 0 && (
          <div className="field">
            <label>Kuryerlar</label>
            <div className="chips">
              {couriers.map((courier) => (
                <button
                  type="button"
                  key={courier.name}
                  className={`chip ${courier.name === name ? 'chip--on' : ''}`}
                  onClick={() => pickCourier(courier)}
                >
                  {courier.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="c-name">Kuryer ismi *</label>
          <input
            id="c-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Masalan: Jasur"
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="c-phone">Kuryer telefoni</label>
          <input
            id="c-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 90 123 45 67"
            inputMode="tel"
          />
          <div className="field__hint">Mijoz kuryerga to‘g‘ridan-to‘g‘ri qo‘ng‘iroq qila oladi</div>
        </div>

        <div className="field">
          <label htmlFor="c-eta">Qancha vaqtda yetib boradi?</label>
          <div className="chips">
            {ETA_PRESETS.map((minutes) => (
              <button
                type="button"
                key={minutes}
                className={`chip ${Number(eta) === minutes ? 'chip--on' : ''}`}
                onClick={() => setEta(minutes)}
              >
                {minutes} daq
              </button>
            ))}
            <input
              id="c-eta"
              className="chip-input"
              type="number"
              min={5}
              max={180}
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              aria-label="Daqiqa"
            />
          </div>
          <div className="eta-preview">
            Mijozga yuboriladi: <b>taxminan {Number(eta) || 0} daqiqada — soat {arrival} gacha</b>
          </div>
        </div>
      </form>
    </Modal>
  );
}
