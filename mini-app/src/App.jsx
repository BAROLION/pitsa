import { useCallback, useEffect, useState } from 'react';

import Onboarding from './components/Onboarding.jsx';
import BottomNav from './components/BottomNav.jsx';
import ProductSheet from './components/ProductSheet.jsx';
import Toast from './components/Toast.jsx';

import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import Cart from './pages/Cart.jsx';
import Profile from './pages/Profile.jsx';

import api from './api.js';
import { storage, sortByCategory, categoryList } from './format.js';
import { setHeaderColor } from './telegram.js';
import { useCart } from './CartContext.jsx';

const ONBOARDING_KEY = 'pizza_onboarding_done';
const YELLOW = '#ffd400';
const WHITE = '#ffffff';

export default function App() {
  const { sync } = useCart();
  const [onboarded, setOnboarded] = useState(() => storage.get(ONBOARDING_KEY, false));

  const [tab, setTab] = useState('home');
  const [catalogCategory, setCatalogCategory] = useState('Barchasi');
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Barchasi']);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sheetProduct, setSheetProduct] = useState(null);
  const [toast, setToast] = useState('');

  // Buyurtmalar tarixi + profil (ism/telefon buyurtmadan keyin yangilanadi)
  const loadOrders = useCallback(async () => {
    try {
      const [orderList, me] = await Promise.all([api.getMyOrders(), api.getMe()]);
      setOrders(orderList);
      setUser(me);
    } catch {
      /* tarix yuklanmasa ham ilova ishlayveradi */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [me, productList] = await Promise.all([api.getMe(), api.getProducts()]);
      const sorted = sortByCategory(productList);
      setUser(me);
      setProducts(sorted);
      setCategories(categoryList(sorted));
      sync(sorted);
      loadOrders();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [loadOrders, sync]);

  useEffect(() => {
    load();
  }, [load]);

  // Faol buyurtma bo'lsa (tayyorlanmoqda / yo'lda) — holatni har 20 soniyada yangilab turamiz,
  // shunda kuryer olgani va qolgan daqiqalar o'zi ko'rinadi.
  const hasActiveOrder = orders.some((order) => order.status === 'KUTILMOQDA' || order.status === 'YOLDA');
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!hasActiveOrder) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadOrders();
      setTick((value) => value + 1);
    }, 20000);
    return () => clearInterval(timer);
  }, [hasActiveOrder, loadOrders]);

  const liveOrder = orders.find((order) => order.status === 'YOLDA');

  // Telegram yuqori paneli sahifa rangiga mos
  useEffect(() => {
    const yellowTop = !onboarded || tab === 'home' || tab === 'profile';
    setHeaderColor(yellowTop ? YELLOW : WHITE);
  }, [onboarded, tab]);

  const changeTab = useCallback(
    (next) => {
      setTab(next);
      if (next === 'profile') loadOrders();
      window.scrollTo(0, 0);
    },
    [loadOrders],
  );

  const openCatalog = (category = 'Barchasi') => {
    setCatalogCategory(category);
    changeTab('catalog');
  };

  const finishOnboarding = () => {
    storage.set(ONBOARDING_KEY, true);
    setOnboarded(true);
  };

  if (!onboarded) return <Onboarding onFinish={finishOnboarding} />;

  if (loading) {
    return (
      <div className="center">
        <div>
          <div className="spinner" />
          <p className="muted">Menyu yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="center">
        <div>
          <div className="center__icon">⚠️</div>
          <h2 className="center__title">Ulanishda xatolik</h2>
          <p className="muted center__text">{error}</p>
          <button className="btn btn--primary btn--auto" onClick={load}>
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {tab === 'home' && (
        <Home
          user={user}
          products={products}
          liveOrder={liveOrder}
          onOpenProfile={() => changeTab('profile')}
          onOpenProduct={setSheetProduct}
          onOpenCatalog={openCatalog}
        />
      )}

      {tab === 'catalog' && (
        <Catalog
          key={catalogCategory}
          products={products}
          categories={categories}
          initialCategory={catalogCategory}
          onOpenProduct={setSheetProduct}
        />
      )}

      {tab === 'cart' && (
        <Cart user={user} products={products} onGoCatalog={() => openCatalog()} onOrdered={loadOrders} />
      )}

      {tab === 'profile' && (
        <Profile
          user={user}
          orders={orders}
          products={products}
          onGoCart={() => changeTab('cart')}
          onGoCatalog={() => openCatalog()}
          onOrdersChanged={loadOrders}
          showToast={setToast}
        />
      )}

      <BottomNav tab={tab} onChange={changeTab} />

      {sheetProduct && (
        <ProductSheet
          product={sheetProduct}
          onClose={() => setSheetProduct(null)}
          onAdded={() => setToast('Savatchaga qo‘shildi')}
        />
      )}

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
