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
    piecesPerPack: item.piecesPerPack ?? null,
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
    if (!payload?.success) return response;
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

      // Map response structures for Inventory and Documents
    if (url.startsWith('/inventory') && !url.includes('/reports/')) {
      if (Array.isArray(data)) {
        return {
          ...response,
          data: data.map((item: any) => ({
            ...item,
            item: item.product,
            itemId: item.productId,
            product: undefined,
            productId: undefined
          }))
        };
      }
      if (data && typeof data === 'object') {
        if ('totalSKUs' in data || 'totalProducts' in data) {
          return {
            ...response,
            data: {
              totalItems: data.totalSKUs ?? data.totalProducts ?? 0,
              totalStock: data.totalQuantity ?? 0,
              totalAreaSqm: data.totalAreaM2 ?? 0,
              pendingIssues: data.pendingIssues ?? 0,
              pendingProcessing: data.pendingProcessing ?? 0,
              finishedGoods: data.finishedProducts ?? 0,
              damagedItems: data.damagedItems ?? 0,
              lowStockAlerts: data.lowStockCount ?? 0,
              pendingApprovals: {
                receipts: data.pendingReceipts ?? 0,
                issues: data.pendingIssues ?? 0,
                processing: data.pendingProcessing ?? 0,
                damages: 0,
                adjustments: 0,
              },
              recentMovements: (data.recentMovements || []).map((m: any) => ({
                ...m,
                item: m.product || m.item,
                creator: m.user || m.creator,
              })),
              stockByType: data.stockByType || [],
              stockByCondition: data.stockByCondition || [],
              lowStockItems: data.lowStockItems || data.lowStockProducts || [],
            }
          };
        }
      }
    }

    const docEndpoints = ['/goods-receipts', '/goods-issues', '/processing-orders', '/stocktakes', '/damage-reports', '/adjustments'];
    if (docEndpoints.some(ep => url.startsWith(ep))) {
      if (Array.isArray(data)) {
        data.forEach((d: any) => {
          if (Array.isArray(d.lines)) {
            d.lines.forEach((l: any) => {
              if (l.product) { l.item = l.product; l.itemId = l.productId; }
            });
          }
        });
      } else if (data && Array.isArray(data.lines)) {
        data.lines.forEach((l: any) => {
          if (l.product) { l.item = l.product; l.itemId = l.productId; }
        });
      }
    }

    // Normalize customer data
    if (url.startsWith('/customers')) {
      const normalizeCustomer = (c: any) => c ? { ...c, active: c.active ?? c.isActive ?? !c.deletedAt } : c;
      const normalized = Array.isArray(data) ? data.map(normalizeCustomer) : normalizeCustomer(data);
      return { ...response, data: normalized };
    }

    // Normalize supplier data
    if (url.startsWith('/suppliers')) {
      const normalized = Array.isArray(data) ? data.map(normalizeSupplier) : normalizeSupplier(data);
      return { ...response, data: normalized };
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

function normalizeRequestBody(url: string, body?: BodyInit | null): BodyInit | null | undefined {
  if (typeof body !== 'string') return body;

  try {
    const payload = JSON.parse(body);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return body;

    const normalized: any = { ...payload };

    // Strip server-only fields that should never be sent in POST/PUT requests
    const serverOnlyFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'creator', 'approver',
      'createdBy', 'approvedBy', 'createdUser', 'supplier', 'customer', 'item', 'location',
      'reporter', 'approverUser', 'creatorUser', 'companyId', 'createdById', 'updatedById'];
    serverOnlyFields.forEach(field => delete normalized[field]);

    // Core API uses isActive while the legacy Warehouse forms use active.
    if ('active' in normalized && !('isActive' in normalized)) {
      normalized.isActive = normalized.active;
    }
    delete normalized.active;

    // Core API auto-generates supplier codes; sending code fails whitelist validation.
    if (url.startsWith('/suppliers') && !url.includes('/suppliers/')) {
      delete normalized.code;
    }

    // Map User fields
    if (url.startsWith('/users')) {
      if ('username' in normalized && !('email' in normalized)) {
        normalized.email = normalized.username;
      }
      if ('role' in normalized) {
        normalized.roleNames = [normalized.role];
        normalized.roleScope = 'warehouse';
        delete normalized.role;
      }
      // Convert active to isActive for Core API
      if ('active' in normalized) {
        normalized.isActive = normalized.active;
        delete normalized.active;
      }
      // Only keep fields allowed by CreateUserDto/UpdateUserDto
      const allowedUserFields = ['teamId', 'email', 'username', 'password', 'fullName', 'phone', 'isActive', 'roleNames', 'roleScope'];
      Object.keys(normalized).forEach(key => {
        if (!allowedUserFields.includes(key)) {
          delete normalized[key];
        }
      });
    }

    // Map Item fields to Product fields
    if (url.startsWith('/items') || url.startsWith('/products')) {
      if ('unitPrice' in normalized) {
        normalized.salePrice = Number(normalized.unitPrice) || 0;
        if (!('costPrice' in normalized)) {
          normalized.costPrice = 0;
        }
        delete normalized.unitPrice;
      }
      if ('size' in normalized && !('standardSize' in normalized)) {
        normalized.standardSize = normalized.size;
      }
      delete normalized.size;

      // note ΓåÆ description mapping (Core API Product uses description, not note)
      if ('note' in normalized && !('description' in normalized)) {
        normalized.description = normalized.note;
      }
      // Keep note as well since DTO now accepts it

      // Provide a generated SKU if missing
      if (!normalized.sku) {
        normalized.sku = normalized.code || `SKU-${Date.now()}`;
      }

      // Convert supplierId to string (Core API uses UUID strings)
      if ('supplierId' in normalized) {
        if (normalized.supplierId === '' || normalized.supplierId === null || normalized.supplierId === 0) {
          delete normalized.supplierId;
        } else {
          normalized.supplierId = String(normalized.supplierId);
        }
      }
      
      // Ensure numeric fields
      const numericFields = ['thickness', 'lengthMm', 'widthMm', 'areaM2', 'minStock', 'piecesPerPack', 'costPrice', 'salePrice'];
      numericFields.forEach(field => {
        if (field in normalized && (normalized[field] === '' || normalized[field] === null)) {
          normalized[field] = 0;
        } else if (field in normalized) {
          normalized[field] = Number(normalized[field]) || 0;
        }
      });
    }

    // Strip code and status for document endpoints (backend manages these)
    const docEndpoints = ['/goods-receipts', '/goods-issues', '/processing-orders', '/stocktakes', '/damage-reports', '/adjustments'];
    if (docEndpoints.some(ep => url.startsWith(ep))) {
      delete normalized.code;
      delete normalized.status;
      delete normalized.createdById;
      delete normalized.approvedById;
      delete normalized.updatedById;
    }

    // Goods Receipts / Goods Issues - normalize lines
    if (url.startsWith('/goods-receipts') || url.startsWith('/goods-issues')) {
      // Ensure IDs are strings (UUID) not numbers
      if ('supplierId' in normalized && normalized.supplierId) {
        normalized.supplierId = String(normalized.supplierId);
      }
      if ('customerId' in normalized && normalized.customerId) {
        normalized.customerId = String(normalized.customerId);
      }
      // Normalize lines: convert itemId, locationId to strings
      if (Array.isArray(normalized.lines)) {
        normalized.lines = normalized.lines.map((l: any) => {
          const line = { ...l };
          if (line.itemId) { line.productId = String(line.itemId); delete line.itemId; }
          if (line.locationId) line.locationId = String(line.locationId);
          // Strip server-only fields from lines
          // Only keep allowed fields based on endpoint
          const allowedLineFields = [
            'productId', 'locationId', 'quantity', 'requestedQty', 'condition', 'note',
            'systemQty', 'actualQty', 'reason', 'proposal', // stocktakes
            'qtyBefore', 'qtyAfter' // adjustments
          ];
          Object.keys(line).forEach(key => {
            if (!allowedLineFields.includes(key)) {
              delete line[key];
            }
          });
          return line;
        });
      }
    }

    // Processing Orders - fix ID types
    if (url.startsWith('/processing-orders')) {
      if ('customerId' in normalized && normalized.customerId) {
        normalized.customerId = String(normalized.customerId);
      }
      if (Array.isArray(normalized.inputs)) {
        normalized.inputs = normalized.inputs.map((i: any) => {
          const res = { ...i, locationId: i.locationId ? String(i.locationId) : i.locationId };
          if (res.itemId) { res.productId = String(res.itemId); delete res.itemId; }
          return res;
        });
      }
    }

    // Damage Reports - fix ID types
    if (url.startsWith('/damage-reports')) {
      if ('itemId' in normalized) { normalized.productId = String(normalized.itemId); delete normalized.itemId; }
      if ('locationId' in normalized) normalized.locationId = String(normalized.locationId);
    }

    // Adjustments - fix lines
    if (url.startsWith('/adjustments')) {
      if (Array.isArray(normalized.lines)) {
        normalized.lines = normalized.lines.map((l: any) => {
          const line = { ...l };
          if (line.itemId) { line.productId = String(line.itemId); delete line.itemId; }
          if (line.locationId) line.locationId = String(line.locationId);
          const allowedLineFields = ['productId', 'locationId', 'qtyBefore', 'qtyAfter', 'note'];
          Object.keys(line).forEach(key => {
            if (!allowedLineFields.includes(key)) {
              delete line[key];
            }
          });
          return line;
        });
      }
    }

    
    // Stocktakes - fix lines
    if (url.startsWith('/stocktakes')) {
      if (Array.isArray(normalized.lines)) {
        normalized.lines = normalized.lines.map((l: any) => {
          const line = { ...l };
          if (line.itemId) { line.productId = String(line.itemId); delete line.itemId; }
          if (line.locationId) line.locationId = String(line.locationId);
          const allowedLineFields = ['productId', 'locationId', 'systemQty', 'actualQty', 'reason', 'proposal', 'note'];
          Object.keys(line).forEach(key => {
            if (!allowedLineFields.includes(key)) {
              delete line[key];
            }
          });
          return line;
        });
      }
    }
    
    // Damage Reports - fix lines
    if (url.startsWith('/damage-reports')) {
      if (Array.isArray(normalized.lines)) {
        normalized.lines = normalized.lines.map((l: any) => {
          const line = { ...l };
          if (line.itemId) { line.productId = String(line.itemId); delete line.itemId; }
          if (line.locationId) line.locationId = String(line.locationId);
          const allowedLineFields = ['productId', 'locationId', 'quantity', 'reason', 'note'];
          Object.keys(line).forEach(key => {
            if (!allowedLineFields.includes(key)) {
              delete line[key];
            }
          });
          return line;
        });
      }
    }

    // Customers
    if (url.startsWith('/customers')) {
      if (url === '/customers') delete normalized.code;
      if ('active' in normalized) {
        normalized.isActive = normalized.active;
        delete normalized.active;
      }
    }

    
    // Root level whitelisting for documents to prevent Validation failed
    if (url.startsWith('/goods-receipts')) {
      const allowed = ['date', 'supplierId', 'deliveredBy', 'vehicleNo', 'receivedById', 'documentNo', 'note', 'lines'];
      Object.keys(normalized).forEach(k => { if (!allowed.includes(k)) delete normalized[k]; });
    } else if (url.startsWith('/goods-issues')) {
      const allowed = ['date', 'issueType', 'customerId', 'projectName', 'requestedBy', 'receiverName', 'orderRef', 'vehicleNo', 'note', 'lines'];
      Object.keys(normalized).forEach(k => { if (!allowed.includes(k)) delete normalized[k]; });
    } else if (url.startsWith('/stocktakes')) {
      const allowed = ['date', 'zone', 'note', 'lines'];
      Object.keys(normalized).forEach(k => { if (!allowed.includes(k)) delete normalized[k]; });
    } else if (url.startsWith('/adjustments')) {
      const allowed = ['date', 'reason', 'note', 'lines'];
      Object.keys(normalized).forEach(k => { if (!allowed.includes(k)) delete normalized[k]; });
    } else if (url.startsWith('/damage-reports')) {
      const allowed = ['date', 'reportedById', 'note', 'lines'];
      Object.keys(normalized).forEach(k => { if (!allowed.includes(k)) delete normalized[k]; });
    } else if (url.startsWith('/processing-orders')) {
      const allowed = ['date', 'type', 'customerId', 'projectName', 'expectedDate', 'note', 'lines'];
      Object.keys(normalized).forEach(k => { if (!allowed.includes(k)) delete normalized[k]; });
    }

    return JSON.stringify(normalized);

  } catch {
    return body;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  if (url.startsWith('/dashboard')) {
    url = url.replace('/dashboard', '/inventory/stats');
  }

  // Alias /items to /products for Core API migration
  if (url.startsWith('/reports/xnt')) {
    url = url.replace('/reports/xnt', '/inventory/reports/xnt');
  }

  if (url.startsWith('/items')) {
    url = url.replace('/items', '/products');
  }

  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options?.headers || {}),
  };

  const normalizedOptions = options ? { ...options, body: normalizeRequestBody(url, options.body) } : options;
  const res = await fetch(`${getApiBase(url)}${url}`, { ...normalizedOptions, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 502 || res.status === 504) {
      throw new Error('Không thể kết nối đến Core API server. Vui lòng kiểm tra server backend đã chạy chưa!');
    }
    let message = data?.error?.message || data?.message || data?.error || 'Có lỗi xảy ra khi kết nối tới server';
    if (Array.isArray(message)) {
      message = message.join(', ');
    }
    if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }
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
  download: async (url: string, filename: string) => {
    if (url.startsWith('/reports/xnt')) url = url.replace('/reports/xnt', '/inventory/reports/xnt');
    if (url.startsWith('/items')) url = url.replace('/items', '/products');
    const token = localStorage.getItem('token');
    const headers: HeadersInit = { ...(token && { Authorization: `Bearer ${token}` }) };
    const res = await fetch(`${getApiBase(url)}${url}`, { headers });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  },
};
