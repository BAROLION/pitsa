const TOKEN_KEY = 'pizza_admin_token';

export const auth = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  },
  set: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

/** Sessiya tugaganda App'ga xabar beradi. */
export const onUnauthorized = { handler: null };

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api/admin${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.get()}`,
      },
    });
  } catch {
    throw new Error('Server bilan aloqa yo‘q. Backend ishga tushganini tekshiring.');
  }

  const payload = await response.json().catch(() => null);
  if (!payload) throw new Error('Server javob bermadi. Backend ishga tushganini tekshiring.');

  if (response.status === 401 && path !== '/login') {
    auth.clear();
    onUnauthorized.handler?.();
  }

  if (!response.ok || !payload.ok) throw new Error(payload.error || 'Nomaʼlum xatolik');
  return payload.data;
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

const api = {
  login: (password) => request('/login', json('POST', { password })),
  getStats: () => request('/stats'),

  getOrders: (status) => request(`/orders${status ? `?status=${status}` : ''}`),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, json('PATCH', { status })),
  assignCourier: (id, body) => request(`/orders/${id}/courier`, json('POST', body)),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),

  getProducts: () => request('/products'),
  createProduct: (body) => request('/products', json('POST', body)),
  updateProduct: (id, body) => request(`/products/${id}`, json('PUT', body)),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  getUsers: () => request('/users'),
};

export default api;
