import { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import { formatDate } from '../format.js';
import Empty from '../components/Empty.jsx';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setUsers(await api.getUsers());
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Mijozlar</h1>
          <p>Jami {users.length} ta mijoz</p>
        </div>
        <button className="btn btn--ghost" onClick={load}>
          🔄 Yangilash
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="table-wrap">
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            Yuklanmoqda...
          </div>
        ) : users.length === 0 ? (
          <Empty icon="👥" title="Mijozlar yo‘q" text="Botga /start bosgan mijozlar shu yerda ko‘rinadi." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Ismi</th>
                  <th>Telefon</th>
                  <th>Telegram ID</th>
                  <th>Buyurtmalar</th>
                  <th>Qo‘shilgan sana</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="cell-muted">#{user.id}</td>
                    <td className="cell-strong">
                      {user.name}
                      {user.isAdmin && <span className="badge badge--warn badge--inline">admin</span>}
                    </td>
                    <td className="cell-nowrap">{user.phone || '—'}</td>
                    <td className="cell-muted cell-nowrap">{user.telegramId}</td>
                    <td className="cell-strong">{user._count?.orders ?? 0}</td>
                    <td className="cell-muted cell-nowrap">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
