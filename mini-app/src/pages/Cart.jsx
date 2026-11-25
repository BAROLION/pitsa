import { useCallback, useEffect, useState } from 'react';
import SafeImage from '../components/SafeImage.jsx';
import Empty from '../components/Empty.jsx';
import Icon from '../components/Icon.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import { money } from '../format.js';
import { haptic, closeApp } from '../telegram.js';
import { loadSavedLocation, saveLocation, mapLink, formatCoords } from '../geo.js';
import { useCart } from '../CartContext.jsx';
import api from '../api.js';

export default function Cart({ user, products, onGoCatalog, onOrdered }) {
  const { items, count, total, setQuantity, add, remove, clear } = useCart();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '+998 ');
  const [place, setPlace] = useState(loadSavedLocation);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (user?.name) setName((value) => value || user.name);
    if (user?.phone) setPhone((value) => (value.trim().length > 4 ? value : user.phone));
  }, [user]);

  // Qo'shimcha taklif: birinchi ichimlik (Cola)
  const upsell = products.find((product) => product.category === 'Ichimlik');
  const upsellOn = upsell ? items.some((item) => item.id === upsell.id) : false;
  const pizzasInCart = items.filter((item) => item.id !== upsell?.id).length;

  const toggleUpsell = () => {
    haptic('light');
    if (upsellOn) remove(upsell.id);
    else add(upsell, 1);
  };

  const pickPlace = (picked) => {
    setPlace(picked);
    saveLocation(picked);
    setPickerOpen(false);
    setError('');
  };

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('Ismingizni kiriting');
    if (phone.replace(/\D/g, '').length < 9) return setError('Telefon raqamingizni to‘liq kiriting');
    if (!place) {
      haptic('warning');
      setPickerOpen(true);
      return setError('Yetkazib berish manzilini xaritadan tanlang');
    }

    const location = [place.address || 'Xaritada belgilangan nuqta', mapLink(place)].join('\n');

    setSending(true);
    try {
      await api.createOrder({
        items: items.map((item) => ({ productId: item.id, quantity: item.quantity })),
        name: name.trim(),
        phone: phone.trim(),
        location,
        comment: comment.trim(),
      });

      haptic('success');
      clear();
      setDone(true);
      onOrdered?.();
      setTimeout(closeApp, 2000);
    } catch (requestError) {
      haptic('error');
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="center">
        <div>
          <div className="center__icon center__icon--ok">
            <Icon name="check" size={56} stroke={3} />
          </div>
          <h2 className="center__title">Buyurtma qabul qilindi!</h2>
          <p className="muted center__text">
            Kuryerimiz tez orada bog‘lanadi 🍕
            <br />
            Fikringiz o‘zgarsa — 5 daqiqa ichida bekor qilishingiz mumkin.
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="screen">
        <div className="page-head">
          <div className="page-head__row">
            <h1 className="page-title">Savatcha</h1>
          </div>
        </div>
        <Empty
          icon="🛒"
          title="Savatcha hozircha bo‘sh"
          text="Menyudan sevimli pizzangizni tanlang — u shu yerda paydo bo‘ladi."
          action={
            <button className="btn btn--primary btn--auto" onClick={onGoCatalog}>
              Menyuni ochish
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="screen screen--cta">
      <div className="page-head">
        <div className="page-head__row">
          <div>
            <h1 className="page-title">Savatcha</h1>
            <div className="page-sub">{count} ta mahsulot</div>
          </div>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => {
              haptic('light');
              clear();
            }}
          >
            <Icon name="trash" size={17} /> Tozalash
          </button>
        </div>
      </div>

      <div className="cart-list">
        {items.map((item) => (
          <div className="cart-item" key={item.id}>
            <SafeImage className="cart-item__img" src={item.imageUrl} alt={item.name} />
            <div className="cart-item__info">
              <div className="cart-item__name">{item.name}</div>
              <div className="cart-item__price">{money(item.price * item.quantity)}</div>
            </div>
            <div className="stepper stepper--sm" role="group" aria-label={`${item.name} miqdori`}>
              <button
                onClick={() => {
                  haptic('light');
                  setQuantity(item.id, item.quantity - 1);
                }}
                aria-label={item.quantity === 1 ? 'O‘chirish' : 'Kamaytirish'}
              >
                <Icon name={item.quantity === 1 ? 'trash' : 'minus'} size={16} stroke={2.6} />
              </button>
              <span>{item.quantity}</span>
              <button
                onClick={() => {
                  haptic('light');
                  setQuantity(item.id, item.quantity + 1);
                }}
                aria-label="Ko‘paytirish"
              >
                <Icon name="plus" size={16} stroke={2.6} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {upsell && pizzasInCart > 0 && (
        <div className="upsell">
          <SafeImage src={upsell.imageUrl} alt={upsell.name} />
          <div className="upsell__text">
            Bunga qo‘shimcha ravishda <b>{upsell.name}</b> ni atigi <b>{money(upsell.newPrice)}</b>ga
            qo‘shasizmi?
          </div>
          <button
            className={`switch ${upsellOn ? 'switch--on' : ''}`}
            onClick={toggleUpsell}
            role="switch"
            aria-checked={upsellOn}
            aria-label="Ichimlik qo‘shish"
          >
            <span className="switch__knob" />
          </button>
        </div>
      )}

      <section className="card-box">
        <h2 className="card-box__title">
          <Icon name="pin" size={20} /> Yetkazib berish
        </h2>

        <div className="field">
          <label htmlFor="f-name">Ismingiz</label>
          <input id="f-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ismingiz" autoComplete="name" />
        </div>

        <div className="field">
          <label htmlFor="f-phone">Telefon raqam</label>
          <input
            id="f-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 90 123 45 67"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>

        <div className="field">
          <span className="field__label">Manzil</span>
          <button
            className={`place ${place ? '' : 'place--empty'}`}
            onClick={() => {
              haptic('light');
              setPickerOpen(true);
            }}
          >
            <span className="place__icon">
              <Icon name={place ? 'pin' : 'locate'} size={20} stroke={2.4} />
            </span>
            <span className="place__body">
              <span className="place__title">
                {place ? place.address || `Xaritadagi nuqta · ${formatCoords(place)}` : 'Xaritadan manzilni tanlang'}
              </span>
              <span className="place__sub">{place ? 'Xaritada belgilangan · o‘zgartirish' : 'Joylashuvingiz yoki xaritadagi nuqta'}</span>
            </span>
            <Icon name="chevronRight" size={20} stroke={2.4} />
          </button>
        </div>

        <div className="field">
          <label htmlFor="f-comment">Xonadon, podyezd, mo‘ljal (ixtiyoriy)</label>
          <textarea
            id="f-comment"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Masalan: 3-podyezd, 5-qavat, 18-xonadon"
          />
        </div>
      </section>

      <section className="card-box">
        <h2 className="card-box__title">
          <Icon name="receipt" size={20} /> To‘lov
        </h2>
        <div className="totals__row">
          <span>Mahsulotlar</span>
          <span>{money(total)}</span>
        </div>
        <div className="totals__row">
          <span>Yetkazib berish</span>
          <span className="totals__free">Bepul</span>
        </div>
        <div className="totals__row totals__row--main">
          <span>Jami</span>
          <span>{money(total)}</span>
        </div>
        <div className="totals__note">
          <Icon name="wallet" size={18} /> Kuryerga naqd yoki karta orqali
        </div>
      </section>

      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      <div className="sticky-cta">
        <button className="btn btn--primary btn--lg btn--split" onClick={submit} disabled={sending}>
          <span className="btn__count">{count}</span>
          {sending ? 'Yuborilmoqda...' : 'Buyurtmani tasdiqlash'}
          <span className="btn__price">{money(total)}</span>
        </button>
      </div>

      {pickerOpen && <LocationPicker initial={place} onPick={pickPlace} onClose={closePicker} />}
    </div>
  );
}
