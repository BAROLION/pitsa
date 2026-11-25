import { useState } from 'react';
import api, { auth } from '../api.js';

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!password) return setError('Parolni kiriting');

    setError('');
    setLoading(true);
    try {
      const { token } = await api.login(password);
      auth.set(token);
      onSuccess();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__logo">🍕</div>
        <h1 className="login__title">Admin Panel</h1>
        <p className="login__sub">Boshqaruv paneliga kirish uchun parolni kiriting.</p>

        {error && <div className="error-box">{error}</div>}

        <div className="field">
          <label htmlFor="password">Parol</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoFocus
          />
        </div>

        <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
          {loading ? 'Tekshirilmoqda...' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}
