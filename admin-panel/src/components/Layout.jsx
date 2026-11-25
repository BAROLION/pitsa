const LINKS = [
  { key: 'orders', icon: '📦', label: 'Buyurtmalar' },
  { key: 'products', icon: '🍕', label: 'Mahsulotlar' },
  { key: 'users', icon: '👥', label: 'Mijozlar' },
];

export default function Layout({ page, onNavigate, pendingCount, onLogout, children }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo">🍕</div>
          <div className="sidebar__text">
            <div className="sidebar__name">Pitsa Dostavka</div>
            <div className="sidebar__role">Admin Panel</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {LINKS.map((link) => (
            <button
              key={link.key}
              className={`sidebar__link ${page === link.key ? 'sidebar__link--on' : ''}`}
              onClick={() => onNavigate(link.key)}
              title={link.label}
            >
              <span className="sidebar__icon">{link.icon}</span>
              <span className="sidebar__label">{link.label}</span>
              {link.key === 'orders' && pendingCount > 0 && <span className="sidebar__count">{pendingCount}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar__foot">
          <button className="sidebar__link" onClick={onLogout} title="Chiqish">
            <span className="sidebar__icon">🚪</span>
            <span className="sidebar__label">Chiqish</span>
          </button>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
