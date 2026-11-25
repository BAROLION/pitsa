import { useCallback, useEffect, useState } from 'react';

import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Orders from './pages/Orders.jsx';
import Products from './pages/Products.jsx';
import Users from './pages/Users.jsx';

import api, { auth, onUnauthorized } from './api.js';

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(auth.get()));
  const [page, setPage] = useState('orders');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    onUnauthorized.handler = () => setAuthed(false);
    return () => {
      onUnauthorized.handler = null;
    };
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      setStats(await api.getStats());
    } catch {
      /* 401 bo'lsa login sahifasiga qaytadi */
    }
  }, []);

  useEffect(() => {
    if (authed) refreshStats();
  }, [authed, refreshStats]);

  // Brauzer tab nomida kutilayotgan buyurtmalar soni
  useEffect(() => {
    const pending = stats?.pending || 0;
    document.title = pending > 0 ? `(${pending}) Admin Panel` : 'Admin Panel — Pitsa Dostavka';
  }, [stats]);

  const logout = () => {
    auth.clear();
    setAuthed(false);
    setStats(null);
  };

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  return (
    <Layout page={page} onNavigate={setPage} pendingCount={stats?.pending || 0} onLogout={logout}>
      {page === 'orders' && <Orders stats={stats} onRefreshStats={refreshStats} />}
      {page === 'products' && <Products onRefreshStats={refreshStats} />}
      {page === 'users' && <Users />}
    </Layout>
  );
}
