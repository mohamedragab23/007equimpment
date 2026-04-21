/**
 * عميل API - طلبات مع دعم الجلسة (cookies)
 */
const BASE = '';

export async function api(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(data.error || data.message || text || `HTTP ${res.status}`);
  }
  return data;
}

export const authApi = {
  login: (username, password) =>
    api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => api('/api/auth/logout', { method: 'POST' }),
  me: () => api('/api/auth/me'),
  config: () => api('/api/auth/config'),
};

export const supervisorsApi = {
  list: () => api('/api/supervisors'),
  add: (body) => api('/api/supervisors', { method: 'POST', body: JSON.stringify(body) }),
};

export const ordersApi = {
  list: (status) => api(status ? `/api/orders?status=${encodeURIComponent(status)}` : '/api/orders'),
  create: (body) => api('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
  approve: (orderId) => api(`/api/orders/${encodeURIComponent(orderId)}/approve`, { method: 'POST' }),
  reject: (orderId) => api(`/api/orders/${encodeURIComponent(orderId)}/reject`, { method: 'POST' }),
};

export const deductionsApi = {
  list: (riderCode, limit) => {
    const params = new URLSearchParams();
    if (riderCode) params.set('rider_code', riderCode);
    if (limit) params.set('limit', String(limit));
    return api(`/api/deductions?${params.toString()}`);
  },
  add: (body) => api('/api/deductions', { method: 'POST', body: JSON.stringify(body) }),
  importExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch('/api/deductions/import-excel', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then((res) => res.json().then((data) => {
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      return data;
    }));
  },
};

export const apartmentsApi = {
  list: () => api('/api/apartments'),
  add: (body) => api('/api/apartments', { method: 'POST', body: JSON.stringify(body) }),
};

export const motorcyclesApi = {
  list: () => api('/api/motorcycles'),
  add: (body) => api('/api/motorcycles', { method: 'POST', body: JSON.stringify(body) }),
};

export const auditApi = {
  list: (limit) => api(limit ? `/api/sync/audit-log?limit=${limit}` : '/api/sync/audit-log'),
};
