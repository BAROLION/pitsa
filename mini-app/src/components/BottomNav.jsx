import Icon from './Icon.jsx';
import { haptic } from '../telegram.js';
import { useCart } from '../CartContext.jsx';

const TABS = [
  { key: 'home', icon: 'home', label: 'Bosh sahifa' },
  { key: 'catalog', icon: 'search', label: 'Katalog' },
  { key: 'cart', icon: 'bag', label: 'Savatcha' },
  { key: 'profile', icon: 'user', label: 'Profil' },
  { key: 'track', icon: 'bike', label: 'Kuzatish' },
];

export default function BottomNav({ tab, onChange, live = false }) {
  const { count } = useCart();

  return (
    <nav className="nav" aria-label="Asosiy menyu">
      {TABS.map((item) => {
        const active = tab === item.key;
        return (
          <button
            key={item.key}
            className={`nav__item ${active ? 'nav__item--on' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              haptic('light');
              onChange(item.key);
            }}
          >
            <span className="nav__pill">
              <Icon name={item.icon} size={22} stroke={active ? 2.4 : 2} />
            </span>
            <span className="nav__label">{item.label}</span>
            {item.key === 'track' && live && <span className="nav__live" aria-label="Kuryer yo‘lda" />}
            {item.key === 'cart' && count > 0 && (
              <span className="nav__badge" aria-label={`${count} ta mahsulot`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
