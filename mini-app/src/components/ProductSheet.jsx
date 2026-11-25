import { useEffect, useState } from 'react';
import SafeImage from './SafeImage.jsx';
import Icon from './Icon.jsx';
import { money } from '../format.js';
import { haptic } from '../telegram.js';
import { useCart } from '../CartContext.jsx';

export default function ProductSheet({ product, onClose, onAdded }) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const submit = () => {
    haptic('success');
    add(product, quantity);
    onAdded?.();
    onClose();
  };

  const change = (delta) => {
    haptic('light');
    setQuantity((value) => Math.min(20, Math.max(1, value + delta)));
  };

  const hasDiscount = product.oldPrice > product.newPrice;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={product.name}>
        <div className="sheet__scroll">
          <div className="sheet__media">
            <span className="sheet__grip" />
            <SafeImage src={product.imageUrl} alt={product.name} />
            <button className="sheet__close" onClick={onClose} aria-label="Yopish">
              <Icon name="close" size={20} stroke={2.6} />
            </button>
          </div>

          <div className="sheet__content">
            <span className="sheet__cat">{product.category}</span>
            <h2 className="sheet__title">{product.name}</h2>
            {product.description && <p className="sheet__desc">{product.description}</p>}

            <div className="sheet__price">
              <span className="price-new price-new--lg">{money(product.newPrice)}</span>
              {hasDiscount && <span className="price-old">{money(product.oldPrice)}</span>}
            </div>

            {product.ingredients?.length > 0 && (
              <>
                <h3 className="sheet__label">Tarkibi</h3>
                <ul className="ing">
                  {product.ingredients.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}

            <div className="sheet__qty">
              <span>Miqdori</span>
              <div className="stepper" role="group" aria-label="Miqdori">
                <button onClick={() => change(-1)} aria-label="Kamaytirish" disabled={quantity <= 1}>
                  <Icon name="minus" size={18} stroke={2.8} />
                </button>
                <span aria-live="polite">{quantity}</span>
                <button onClick={() => change(1)} aria-label="Ko‘paytirish">
                  <Icon name="plus" size={18} stroke={2.8} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="sheet__cta">
          <button className="btn btn--primary btn--lg" onClick={submit}>
            Savatchaga qo‘shish — {money(product.newPrice * quantity)}
          </button>
        </div>
      </div>
    </>
  );
}
