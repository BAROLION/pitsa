import SafeImage from './SafeImage.jsx';
import Icon from './Icon.jsx';
import { money } from '../format.js';
import { haptic } from '../telegram.js';
import { useCart } from '../CartContext.jsx';

export default function ProductCard({ product, onOpen }) {
  const { add, quantityOf } = useCart();
  const inCart = quantityOf(product.id);
  const hasDiscount = product.oldPrice > product.newPrice;
  const discount = hasDiscount ? Math.round((1 - product.newPrice / product.oldPrice) * 100) : 0;

  const quickAdd = (event) => {
    event.stopPropagation();
    haptic('success');
    add(product, 1);
  };

  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(product)}
      onKeyDown={(event) => event.key === 'Enter' && onOpen(product)}
    >
      <div className="card__media">
        <SafeImage src={product.imageUrl} alt={product.name} />
        {discount > 0 && (
          <span className="card__off">
            <Icon name="tag" size={12} stroke={2.8} />−{discount}%
          </span>
        )}
        <button
          className={`card__add ${inCart ? 'card__add--in' : ''}`}
          onClick={quickAdd}
          aria-label={`${product.name} — savatchaga qo‘shish`}
        >
          {inCart ? (
            <>
              {inCart}
              <Icon name="plus" size={15} stroke={3} />
            </>
          ) : (
            <Icon name="plus" size={20} stroke={3} />
          )}
        </button>
      </div>

      <div className="card__body">
        <div className="card__name">{product.name}</div>
        <div className="card__desc">{product.description}</div>
        <div className="card__prices">
          <span className="price-new">{money(product.newPrice)}</span>
          {hasDiscount && <span className="price-old">{money(product.oldPrice)}</span>}
        </div>
      </div>
    </div>
  );
}
