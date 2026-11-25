import { getInitData } from './telegram.js';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api/client${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': getInitData(),
        'ngrok-skip-browser-warning': '1',
      },
    });
  } catch {
    throw new Error('Internet yoki server bilan aloqa yo‘q');
  }

  const payload = await response.json().catch(() => null);
  if (!payload) throw new Error('Server javob bermadi. Backend ishga tushganini tekshiring.');
  if (!response.ok || !payload.ok) throw new Error(payload.error || 'Nomaʼlum xatolik');

  return payload.data;
}

const api = {
  getMe: () => request('/me'),
  getProducts: () => request('/products'),
  getMyOrders: () => request('/orders'),
  createOrder: (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
};

export default api;
