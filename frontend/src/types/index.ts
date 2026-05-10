// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'customer' | 'admin';
  is_verified: boolean;
  wallet: string;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
  errors?: { msg: string; path: string }[];
}

export interface SignupInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ─── Products ───────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: string;          // NUMERIC from pg comes as string
  stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProductDetail extends Product {
  avg_rating: number | null;
  review_count: number;
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name: string;
}

export interface ProductListResponse {
  success: boolean;
  data?: Product[];
  message?: string;
}

// ─── Print ───────────────────────────────────────────────────────────────────

export interface PrintJob {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  color_mode: 'bw' | 'color';
  page_size: 'A4' | 'A3' | 'A5' | 'Letter';
  copies: number;
  lamination: boolean;
  total_pages: number;
  amount: string;        // NUMERIC from pg comes as string
  status: 'pending' | 'paid' | 'processing' | 'printed' | 'ready' | 'failed';
  assigned_printer_id: string | null;
  error_message: string | null;
  created_at: string;
  // Enhanced fields
  orientation: 'portrait' | 'landscape';
  duplex: boolean;
  paper_type: 'normal' | 'glossy' | 'thick';
  print_range: 'all' | 'custom';
  page_from: number | null;
  page_to: number | null;
  notes: string | null;
}

export interface PrintJobResponse {
  success: boolean;
  data?: PrintJob;
  message?: string;
}

export interface PrintJobsResponse {
  success: boolean;
  data?: PrintJob[];
  message?: string;
}

// ─── API Generic ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: { msg: string; path: string }[];
}

// ─── Cart ───────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  name: string;
  price: string;   // raw string from Product
  image_url: string | null;
  qty: number;
  stock: number;
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export interface OrderItem {
  id:           string;
  order_id:     string;
  product_id:   string | null;
  print_job_id: string | null;
  quantity:     number;
  unit_price:   string;
  product_name?: string;
  file_name?:    string;
}

export type OrderStatus = 'placed' | 'processing' | 'dispatched' | 'delivered' | 'cancelled';

export interface Order {
  id:              string;
  user_id:         string;
  sequence_number: number;
  delivery_type:   'pickup' | 'delivery';
  delivery_charge: string;
  subtotal:        string;
  total:           string;
  payment_status:  'pending' | 'paid' | 'failed' | 'refunded';
  payment_id:      string | null;
  status:          OrderStatus;
  notes:           string | null;
  items:           OrderItem[];
  created_at:      string;
}

export interface CreateOrderInput {
  items:         { productId: string; qty: number; unitPrice: number }[];
  printJobIds:   string[];
  deliveryType:  'pickup' | 'delivery';
  notes?:        string;
  paymentMethod: 'cashfree' | 'cod' | 'wallet';
  couponCode?:   string;
}

// ─── Coupons ─────────────────────────────────────────────────────────────────

export interface CouponValidation {
  couponId:    string;
  code:        string;
  type:        'percent' | 'fixed';
  value:       number;
  discount:    number;
  description: string;
}

export interface CreateOrderResponse {
  orderId:           string;
  seqNum:            number;
  subtotal:          number;
  deliveryCharge:    number;
  total:             number;
  paymentMethod:     string;
  paymentSessionId?: string;
  cfOrderId?:        string;
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export interface WalletTx {
  id:           string;
  user_id:      string;
  amount:       string;
  type:         'credit' | 'debit';
  description:  string | null;
  reference_id: string | null;
  created_at:   string;
}

export interface OrderListResponse {
  orders: Order[];
}
