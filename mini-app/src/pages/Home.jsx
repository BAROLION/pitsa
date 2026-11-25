import { useRef, useState } from 'react';
import Stories from '../components/Stories.jsx';
import ProductCard from '../components/ProductCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import Empty from '../components/Empty.jsx';
import Icon from '../components/Icon.jsx';
import { haptic, getTelegramUser } from '../telegram.js';
import { categoryEmoji, categoryList, isPizza, matchesQuery, formatClock, minutesLeft } from '../format.js';
import { savedAddressLabel } from '../geo.js';

export default function Home({ user, products, liveOrder, onOpenProfile, onOpenProduct, onOpenCatalog }) {
  const [query, setQuery] = useState('');
  const [slide, setSlide] = useState(0);
  const bannersRef = useRef(null);

  const name = user?.name || getTelegramUser()?.first_name || 'Mehmon';
  const firstName = name.trim().split(/\s+/)[0];
  const initial = name.trim().charAt(0).toUpperCase();
  const address = savedAddressLabel();

  const pizzas = products.filter(isPizza);
  const inCategory = (...names) => products.filter((product) => names.includes(product.category));
  const categories = categoryList(products).slice(1);
  const image = (i) => pizzas[i % Math.max(pizzas.length, 1)]?.imageUrl;
  const imageOf = (category) => inCategory(category)[0]?.imageUrl;
  const results = query.trim() ? products.filter((product) => matchesQuery(product, query)) : null;

  const stories = [
    { id: 's1', label: 'Chegirma', emoji: '🔥', image: image(0), tag: 'Aksiya', title: '−20% barcha pizzalarga', text: 'Narxlar allaqachon chegirma bilan. Kupon shart emas.' },
    { id: 's2', label: 'Burgerlar', emoji: '🍔', image: imageOf('Burger') || image(1), tag: 'Yangilik', title: 'Burgerlar menyuda!', text: 'Klassik, chizburger va dabl burger — hammasi yangi.' },
    { id: 's3', label: '30 daqiqa', emoji: '🛵', image: image(1), tag: 'Tezkor', title: '30 daqiqada yetkazamiz', text: 'Issiqqina taom eshigingizgacha — bepul yetkazib berish.' },
    { id: 's4', label: 'Milliy', emoji: '✨', image: image(2), tag: 'Hit', title: 'Qazi pizza', text: 'Milliy ta’m va Italiya uslubi bir joyda.' },
    { id: 's5', label: 'Combo', emoji: '🥤', image: imageOf('Ichimlik') || image(3), tag: 'Combo', title: 'Pizza + Cola', text: 'Har qanday pizzaga Coca-Cola atigi 5 000 so‘m.' },
  ];

  const banners = [
    { tone: 'dark', kicker: 'Pitsa Dostavka', title: 'Yangi buyurtma berish', cta: 'Menyuni ochish', img: image(0), action: () => onOpenCatalog() },
    { tone: 'yellow', kicker: 'Faqat bugun', title: '−20% barcha pizzalarga', cta: 'Tanlash', emoji: '🍕', action: () => onOpenCatalog() },
    { tone: 'red', kicker: 'Yangi', title: 'Burger kombo + fri', cta: 'Ko‘rish', emoji: '🍔', action: () => onOpenCatalog('Burger') },
  ];

  const rails = [
    { title: 'Ommabop pizzalar 🔥', items: pizzas, category: 'Barchasi' },
    { title: 'Burger va hot-dog', items: inCategory('Burger', 'Hot-dog'), category: 'Burger' },
    { title: 'Lavash va gazaklar', items: inCategory('Lavash', 'Gazaklar'), category: 'Gazaklar' },
    { title: 'Shirinliklar', items: inCategory('Desert'), category: 'Desert' },
  ].filter((rail) => rail.items.length > 0);

  const onBannerScroll = () => {
    const el = bannersRef.current;
    if (!el) return;
    const width = el.firstElementChild?.offsetWidth || 1;
    setSlide(Math.round(el.scrollLeft / (width + 12)));
  };

  return (
    <div className="screen screen--flush">
      <header className="top">
        <div className="top__row">
          <div className="addr">
            <span className="addr__pin">
              <Icon name="pin" size={20} />
            </span>
            <span>
              <span className="addr__label">Yetkazish manzili</span>
              <span className="addr__value">
                <span>{address || 'Toshkent shahri'}</span>
                <Icon name="chevronDown" size={18} stroke={2.6} />
              </span>
            </span>
          </div>
          <div className="avatar" aria-label={name}>
            {initial}
          </div>
        </div>

        <h1 className="top__hello">
          Salom, <bdi>{firstName}</bdi>! 👋
          <br />
          Bugun nima yeymiz?
        </h1>

        <SearchBar value={query} onChange={setQuery} placeholder="Pizza, burger, lavash qidiring" />
      </header>

      {liveOrder && !results && (
        <button className="live-order" onClick={onOpenProfile}>
          <span className="track__icon" aria-hidden="true">
            <Icon name="bike" size={20} stroke={2.4} />
          </span>
          <span className="track__text">
            <span className="track__title" style={{ display: 'block' }}>
              Buyurtma #{liveOrder.id} yo‘lda
            </span>
            <span className="track__sub" style={{ display: 'block' }}>
              Soat {formatClock(liveOrder.etaAt)} gacha yetib boradi
              {minutesLeft(liveOrder.etaAt) > 0 ? ` · ${minutesLeft(liveOrder.etaAt)} daq` : ''}
            </span>
          </span>
          <Icon name="chevronRight" size={20} stroke={2.6} />
        </button>
      )}

      {results ? (
        <div className="pad">
          <div className="section-head">
            <h2 className="section-title">Qidiruv natijalari</h2>
            <span className="page-sub">{results.length} ta</span>
          </div>
          {results.length === 0 ? (
            <Empty icon="🔍" title="Hech narsa topilmadi" text="Boshqa so‘z bilan qidirib ko‘ring." />
          ) : (
            <div className="grid">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} onOpen={onOpenProduct} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <Stories items={stories} />

          <div className="banners" ref={bannersRef} onScroll={onBannerScroll}>
            {banners.map((banner) => (
              <button
                key={banner.title}
                className={`banner banner--${banner.tone}`}
                onClick={() => {
                  haptic('medium');
                  banner.action();
                }}
              >
                {banner.img && <img className="banner__art" src={banner.img} alt="" />}
                {banner.emoji && <span className="banner__emoji" aria-hidden="true">{banner.emoji}</span>}
                <span>
                  <span className="banner__kicker">{banner.kicker}</span>
                  <span className="banner__title" style={{ display: 'block' }}>
                    {banner.title}
                  </span>
                </span>
                <span className="banner__cta">
                  {banner.cta} <Icon name="chevronRight" size={16} stroke={3} />
                </span>
              </button>
            ))}
          </div>
          <div className="banner-dots" aria-hidden="true">
            {banners.map((banner, i) => (
              <span key={banner.title} className={i === slide ? 'on' : ''} />
            ))}
          </div>

          <div className="perks">
            <span className="perk">
              <Icon name="clock" size={17} /> 30 daqiqa
            </span>
            <span className="perk">
              <Icon name="bike" size={17} /> Bepul yetkazish
            </span>
            <span className="perk">
              <Icon name="wallet" size={17} /> Naqd yoki karta
            </span>
          </div>

          <div className="pad section-head">
            <h2 className="section-title">Kategoriyalar</h2>
          </div>
          <div className="cats">
            {categories.map((category) => (
              <button
                key={category}
                className="cat"
                onClick={() => {
                  haptic('light');
                  onOpenCatalog(category);
                }}
              >
                <div className="cat__tile" aria-hidden="true">
                  {categoryEmoji(category)}
                </div>
                <div className="cat__label">{category}</div>
              </button>
            ))}
          </div>

          {rails.map((rail) => (
            <section key={rail.title}>
              <div className="pad section-head">
                <h2 className="section-title">{rail.title}</h2>
                <button className="section-link" onClick={() => onOpenCatalog(rail.category)}>
                  Hammasi <Icon name="chevronRight" size={18} stroke={2.6} />
                </button>
              </div>
              <div className="rail">
                {rail.items.map((product) => (
                  <ProductCard key={product.id} product={product} onOpen={onOpenProduct} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
