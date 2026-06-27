const CORE_API_BASE = import.meta.env.VITE_CORE_API_BASE || '/core-api';
const LEGACY_API_BASE = import.meta.env.VITE_LEGACY_API_BASE || '/api';

const CORE_ROUTES = [
  '/auth',
  '/users',
  '/roles',
  '/permissions',
  '/products',
  '/customers',
  '/companies',
  '/audit-logs',
  '/backups',
  '/suppliers',
  '/locations',
  '/inventory',
  '/goods-receipts',
  '/goods-issues',
  '/processing-orders',
  '/stocktakes',
  '/damage-reports',
  '/adjustments',
];

const useCoreApi = (url: string) => CORE_ROUTES.some((route) => url === route || url.startsWith(`${route}/`) || url.startsWith(`${route}?`));

const getApiBase = (url: string) => useCoreApi(url) ? CORE_API_BASE : LEGACY_API_BASE;

function normalizeUser(user: any) {
  if (!user) return user;
  const roles = user.roles || user.userRoles?.map((ur: any) => ur.role?.name).filter(Boolean) || [];
  return {
    ...user,
    username: user.username || user.email,
    fullName: user.fullName || user.name || user.email,
    role: user.role || roles[0] || 'viewer',
    roles,
    permissions: user.permissions || [],
    active: user.active ?? user.isActive ?? true,
  };
}

function normalizeItem(item: any) {
  if (!item) return item;
  return {
    ...item,
    code: item.code || item.sku,
    sku: item.sku || item.code,
    glassType: item.glassType || 'khac',
    thickness: item.thickness ?? 0,
    color: item.color || 'trong',
    standardSize: item.standardSize || '-',
    unitPrice: item.unitPrice ?? item.salePrice,
    totalStock: item.totalStock ?? 0,
    availableStock: item.availableStock ?? item.totalStock ?? 0,
    active: item.active ?? item.isActive ?? !item.deletedAt,
  };
}

function normalizeSupplier(supplier: any) {
  if (!supplier) return supplier;
  return {
    ...supplier,
    active: supplier.active ?? supplier.isActive ?? true,
  };
}

function normalizeLocation(location: any) {
  if (!location) return location;
  return {
    ...location,
    active: location.active ?? location.isActive ?? true,
  };
}

function normalizeResponse(url: string, payload: any) {
  const response = payload?.success && 'data' in payload ? { ...payload, ...(payload.meta ? { total: payload.meta.total } : {}) } : payload;
  const data = payload?.success && 'data' in payload ? payload.data : payload;

  if (url.startsWith('/auth/login')) {
    const user = normalizeUser(data?.user);
    return {
      success: true,
      data: {
        token: data?.token || data?.accessToken,
        accessToken: data?.accessToken || data?.token,
        user,
      },
    };
  }

  if (url.startsWith('/auth/me')) {
    return { ...response, data: normalizeUser(data) };
  }

  if (url.startsWith('/users')) {
    return { ...response, data: Array.isArray(data) ? data.map(normalizeUser) : normalizeUser(data) };
  }

  if (url.startsWith('/products')) {
    const normalized = Array.isArray(data) ? data.map(normalizeItem) : normalizeItem(data);
    return { ...response, data: normalized };
  }

  if (url.startsWith('/suppliers')) {
    const normalized = Array.isArray(data) ? data.map(normalizeSupplier) : normalizeSupplier(data);
    return { ...response, data: normalized };
  }

  if (url.startsWith('/locations')) {
    const normalized = Array.isArray(data) ? data.map(normalizeLocation) : normalizeLocation(data);
    return { ...response, data: normalized };
  }

  return response;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  // Alias /items to /products for Core API migration
  if (url.startsWith('/items')) {
    url = url.replace('/items', '/products');
  }

  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options?.headers || {}),
  };

  const res = await fetch(`${getApiBase(url)}${url}`, { ...options, headers });

  if (res.status === 401) {
    if (useCoreApi(url)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error?.message || data?.error || data?.message || 'Có lỗi xảy ra';
    throw new Error(message);
  }
  return normalizeResponse(url, data) as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
