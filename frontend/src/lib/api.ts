/**
 * Centralised API client.
 * Always sends credentials (HttpOnly cookie) with each request.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown
): Promise<T> {
  const options: RequestInit = {
    method,
    credentials: 'include', // send HttpOnly JWT cookie
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);

  const data = await res.json();

  if (!res.ok) {
    // Throw a structured error so callers can display feedback
    throw { status: res.status, ...data };
  }

  return data as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

// ─── Products ────────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: { category?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category && params.category !== 'All') qs.set('category', params.category);
    if (params?.q) qs.set('q', params.q);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return request('GET', `/products${query}`);
  },
  get: (id: string) => request('GET', `/products/${id}`),
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (payload: unknown) => request('POST', '/auth/signup', payload),
  login:  (payload: unknown) => request('POST', '/auth/login',  payload),
  logout:         ()                              => request('POST', '/auth/logout'),
  me:             ()                              => request('GET',  '/auth/me'),
  updateProfile:  (name: string)                  => request('PATCH', '/auth/profile',  { name }),
  changePassword: (currentPassword: string, newPassword: string) =>
                    request('PATCH', '/auth/password', { currentPassword, newPassword }),
};

// ─── Print ───────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const printApi = {
  submitJob: (formData: FormData) =>
    fetch(`${API_BASE_URL}/api/print/jobs`, {
      method: 'POST',
      credentials: 'include',
      body: formData,           // multipart — no Content-Type header (browser sets it)
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw { status: res.status, ...data };
      return data;
    }),

  listJobs: () => request<{ success: boolean; data: any[] }>('GET', '/print/jobs'),

  getJob: (id: string) => request<{ success: boolean; data: any }>('GET', `/print/jobs/${id}`),

  pricing: () => request('GET', '/print/pricing'),
};

// ─── Orders ──────────────────────────────────────────────────────────────────

import type { CreateOrderInput, CreateOrderResponse, OrderListResponse, Order } from '@/types';

export const ordersApi = {
  create: (payload: CreateOrderInput) =>
    request<CreateOrderResponse>('POST', '/orders', payload),

  list: () => request<OrderListResponse>('GET', '/orders'),

  getById: (id: string) => request<{ order: Order }>('GET', `/orders/${id}`),

  verifyPayment: (payload: { orderId: string; cfOrderId: string }) =>
    request<{ success: boolean; paymentId?: string }>('POST', '/orders/verify-payment', payload),

  approveOrder: (id: string) =>
    request<{ success: boolean }>('PATCH', `/orders/${id}/approve`),
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminApi = {
  stats:    () => request<any>('GET', '/admin/stats'),
  analytics:(days = 30) => request<any>('GET', `/admin/analytics?days=${days}`),
  users:    () => request<any>('GET', '/admin/users'),

  orders:   () => request<any>('GET', '/admin/orders'),

  printJobs: ()                                  => request<any>('GET', '/admin/print-jobs'),
  updatePrintStatus: (id: string, status: string, errorMessage?: string) =>
    request<any>('PATCH', `/admin/print-jobs/${id}/status`, { status, errorMessage }),

  products:         ()                           => request<any>('GET', '/admin/products'),
  createProduct:    (payload: unknown)           => request<any>('POST', '/admin/products', payload),
  updateProduct:    (id: string, payload: unknown) => request<any>('PATCH', `/admin/products/${id}`, payload),
  deactivateProduct:(id: string)                 => request<any>('DELETE', `/admin/products/${id}`),
  updateOrderStatus:(id: string, status: string) => request<any>('PATCH', `/admin/orders/${id}/status`, { status }),

  exportProductsUrl: (format: 'xlsx' | 'csv') => `/api/admin/products/export?format=${format}`,
  templateUrl:       (format: 'xlsx' | 'csv') => `/api/admin/products/template?format=${format}`,

  uploadProductImage: async (productId: string, file: File): Promise<any> => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`/api/admin/products/${productId}/image`, { method: 'POST', credentials: 'include', body: fd });
    return res.json();
  },

  importProducts: async (file: File): Promise<any> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/products/import', { method: 'POST', credentials: 'include', body: fd });
    return res.json();
  },

  printers:         ()                           => request<any>('GET', '/admin/printers'),
  createPrinter:    (name: string, capabilities: string, location?: string) => request<any>('POST', '/admin/printers', { name, capabilities, location }),
  updatePrinterStatus: (id: string, status: string) => request<any>('PATCH', `/admin/printers/${id}`, { status }),
  deletePrinter:    (id: string)                 => request<any>('DELETE', `/admin/printers/${id}`),

  getSettings:  ()                              => request<any>('GET', '/admin/settings'),
  saveSettings: (data: Record<string, string>) => request<any>('POST', '/admin/settings', data),
};

// ─── Admin — User Management ──────────────────────────────────────────────────

export interface AdminUser {
  id:          string;
  name:        string;
  email:       string;
  phone:       string | null;
  role:        'customer' | 'admin';
  is_banned:   boolean;
  wallet:      string;
  created_at:  string;
  order_count: number;
  print_count: number;
}

export const adminUsersApi = {
  list: (params?: { search?: string; role?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.role)   qs.set('role',   params.role);
    if (params?.page)   qs.set('page',   String(params.page));
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ success: boolean; data: AdminUser[]; total: number; page: number; pages: number }>(
      'GET', `/admin/users/manage${q}`
    );
  },
  getById: (id: string) =>
    request<{ success: boolean; data: any }>('GET', `/admin/users/manage/${id}`),
  ban:    (id: string) => request<{ success: boolean; data: any }>('POST',  `/admin/users/manage/${id}/ban`),
  unban:  (id: string) => request<{ success: boolean; data: any }>('POST',  `/admin/users/manage/${id}/unban`),
  updateRole: (id: string, role: 'customer' | 'admin') =>
    request<{ success: boolean; data: any }>('PATCH', `/admin/users/manage/${id}/role`, { role }),
};

// ─── Wallet ──────────────────────────────────────────────────────────────────

export const walletApi = {
  balance:    () => request<{ balance: number }>('GET', '/wallet/balance'),
  history:    () => request<{ data: any[] }>('GET', '/wallet/history'),
  initTopUp:  (amount: number) => request<{ topupId: string; paymentSessionId: string }>('POST', '/wallet/topup/init', { amount }),
  verifyTopUp:(topupId: string) => request<{ success: boolean; amount?: number; balance: number }>('POST', '/wallet/topup/verify', { topupId }),
};

// ─── Reviews ─────────────────────────────────────────────────────────────────

import type { Review, ProductDetail } from '@/types';

export const reviewsApi = {
  list:   (productId: string) =>
    request<{ success: boolean; data: Review[] }>('GET', `/products/${productId}/reviews`),
  add:    (productId: string, rating: number, comment: string) =>
    request<{ success: boolean; data: Review }>('POST', `/products/${productId}/reviews`, { rating, comment }),
  remove: (productId: string, reviewId: string) =>
    request<{ success: boolean }>('DELETE', `/products/${productId}/reviews/${reviewId}`),
  getDetail: (productId: string) =>
    request<{ success: boolean; data: ProductDetail }>('GET', `/products/${productId}`),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export interface AppNotification {
  id:         string;
  user_id:    string;
  type:       'order_status' | 'print_status' | 'system';
  title:      string;
  body:       string;
  link:       string | null;
  is_read:    boolean;
  created_at: string;
}

export const notificationsApi = {
  list:    (limit = 30) =>
    request<{ success: boolean; data: { notifications: AppNotification[]; unreadCount: number } }>(
      'GET', `/notifications?limit=${limit}`
    ),
  readAll: () => request<{ success: boolean }>('PATCH', '/notifications/read-all'),
  readOne: (id: string) => request<{ success: boolean }>('PATCH', `/notifications/${id}/read`),
};

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export const wishlistApi = {
  getAll:   () => request<{ success: boolean; data: any[] }>('GET', '/wishlist'),
  getIds:   () => request<{ success: boolean; data: string[] }>('GET', '/wishlist/ids'),
  add:      (productId: string) => request<{ success: boolean }>('POST',   `/wishlist/${productId}`),
  remove:   (productId: string) => request<{ success: boolean }>('DELETE', `/wishlist/${productId}`),
};

// ─── Coupons ──────────────────────────────────────────────────────────────────

export interface CouponValidation {
  couponId:    string;
  code:        string;
  type:        'percent' | 'fixed';
  value:       number;
  discount:    number;
  description: string;
}

export const couponsApi = {
  validate: (code: string, orderTotal: number) =>
    request<{ success: boolean; data: CouponValidation }>('POST', '/coupons/validate', { code, orderTotal }),
  adminList: () =>
    request<{ success: boolean; data: any[] }>('GET', '/coupons'),
  adminCreate: (payload: {
    code: string; type: 'percent' | 'fixed'; value: number;
    min_order?: number; max_discount?: number; max_uses?: number; expires_at?: string;
  }) => request<{ success: boolean; data: any }>('POST', '/coupons', payload),
  adminToggle: (id: string) => request<{ success: boolean; data: any }>('PATCH', `/coupons/${id}/toggle`),
  adminDelete: (id: string) => request<{ success: boolean }>('DELETE', `/coupons/${id}`),
};
