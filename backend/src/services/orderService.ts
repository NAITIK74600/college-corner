import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db';
import { createCashfreeOrder, fetchCashfreePayments } from './cashfreeService';

const DELIVERY_CHARGE     = 29;
const FREE_DELIVERY_ABOVE = 499;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderItemInput {
  productId:  string;
  qty:        number;
  unitPrice?: number;  // optional — fetched from DB if not supplied
}

export interface CreateOrderInput {
  userId:        string;
  userName:      string;
  userEmail:     string;
  userPhone:     string;
  items:         OrderItemInput[];   // product line items
  printJobIds:   string[];           // print jobs to bundle
  deliveryType:  'pickup' | 'delivery';
  notes?:        string;
  paymentMethod: 'cashfree' | 'cod' | 'wallet';
  couponCode?:   string;
}

export interface OrderResult {
  orderId:          string;
  seqNum:           number;
  subtotal:         number;
  deliveryCharge:   number;
  total:            number;
  paymentMethod:    string;
  paymentSessionId?: string;
  cfOrderId?:        string;
}

export type OrderStatus = 'placed' | 'processing' | 'dispatched' | 'delivered' | 'cancelled';

export interface OrderRow {
  id:             string;
  user_id:        string;
  sequence_number: number;
  delivery_type:  string;
  delivery_charge: string;
  subtotal:       string;
  total:          string;
  payment_status: string;
  payment_id:     string | null;
  status:         OrderStatus;
  notes:          string | null;
  created_at:     Date;
  updated_at:     Date;
  items:          OrderItemRow[];
}

export interface OrderItemRow {
  id:           string;
  order_id:     string;
  product_id:   string | null;
  print_job_id: string | null;
  quantity:     number;
  unit_price:   string;
  // joined
  product_name?: string;
  file_name?:    string;
}

// ─── Create order ─────────────────────────────────────────────────────────────

export async function createOrder(input: CreateOrderInput): Promise<OrderResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Resolve print job amounts
    let printSubtotal = 0;
    const printRows: { id: string; amount: string }[] = [];
    if (input.printJobIds.length > 0) {
      const pRes = await client.query(
        `SELECT id, amount FROM print_jobs WHERE id = ANY($1) AND user_id = $2 AND status = 'pending'`,
        [input.printJobIds, input.userId]
      );
      if (pRes.rowCount !== input.printJobIds.length) {
        throw new Error('One or more print jobs are invalid or not pending');
      }
      for (const row of pRes.rows) {
        printRows.push(row);
        printSubtotal += parseFloat(row.amount);
      }
    }

    // 2. Calc product subtotal — fetch price from DB if not supplied
    let productSubtotal = 0;
    const resolvedItems: (OrderItemInput & { unitPrice: number })[] = [];

    if (input.items.length > 0) {
      const productIds = input.items.map(i => i.productId);
      const priceRes = await client.query(
        `SELECT id, price FROM products WHERE id = ANY($1::uuid[]) AND is_active = TRUE`,
        [productIds]
      );
      const priceMap = new Map<string, number>(
        priceRes.rows.map((r: { id: string; price: string }) => [r.id, parseFloat(r.price)])
      );

      for (const it of input.items) {
        const unitPrice = it.unitPrice ?? priceMap.get(it.productId);
        if (unitPrice === undefined) throw new Error(`Product ${it.productId} not found or inactive`);
        resolvedItems.push({ ...it, unitPrice });
        productSubtotal += unitPrice * it.qty;
      }
    }

    const subtotal = parseFloat((productSubtotal + printSubtotal).toFixed(2));

    // 3. Delivery charge
    const hasProducts    = input.items.length > 0;
    const deliveryCharge =
      hasProducts && input.deliveryType === 'delivery' && subtotal < FREE_DELIVERY_ABOVE
        ? DELIVERY_CHARGE
        : 0;

    // 3b. Coupon discount
    let couponId: string | null = null;
    let couponDiscount = 0;
    if (input.couponCode) {
      const cRes = await client.query(
        `SELECT id, type, value, min_order, max_discount, max_uses, used_count
         FROM coupons
         WHERE UPPER(code) = UPPER($1) AND is_active = TRUE
           AND (expires_at IS NULL OR expires_at > NOW())
           AND (max_uses IS NULL OR used_count < max_uses)`,
        [input.couponCode]
      );
      if (cRes.rowCount && cRes.rowCount > 0) {
        const c = cRes.rows[0];
        const minOrder = c.min_order ? parseFloat(c.min_order) : 0;
        if (subtotal >= minOrder) {
          couponId = c.id as string;
          const rawDiscount = c.type === 'percent'
            ? subtotal * (parseFloat(c.value) / 100)
            : parseFloat(c.value);
          const cap = c.max_discount ? parseFloat(c.max_discount) : Infinity;
          couponDiscount = parseFloat(Math.min(rawDiscount, cap).toFixed(2));
        }
      }
    }

    const total = parseFloat(Math.max(0, subtotal + deliveryCharge - couponDiscount).toFixed(2));

    // 4. If wallet payment, lock user row and verify sufficient balance
    if (input.paymentMethod === 'wallet') {
      const balRes = await client.query(
        `SELECT wallet FROM users WHERE id = $1 FOR UPDATE`,
        [input.userId],
      );
      const balance = parseFloat(balRes.rows[0]?.wallet ?? '0');
      if (balance < total) throw new Error('Insufficient wallet balance');
    }

    // 5. Insert order
    const orderId = uuidv4();
    const initialStatus = input.paymentMethod === 'wallet' ? 'paid' : 'pending';
    const oRes = await client.query(
      `INSERT INTO orders (id, user_id, delivery_type, delivery_charge, subtotal, total, payment_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING sequence_number`,
      [orderId, input.userId, input.deliveryType, deliveryCharge, subtotal, total, initialStatus, input.notes || null]
    );
    const seqNum: number = oRes.rows[0].sequence_number;

    // 5. Insert product items + decrement stock
    for (const it of resolvedItems) {
      const itemId = uuidv4();
      await client.query(
        `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [itemId, orderId, it.productId, it.qty, it.unitPrice]
      );
      await client.query(
        `UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2`,
        [it.qty, it.productId]
      );
    }

    // 6. If wallet payment, debit wallet inside the transaction
    if (input.paymentMethod === 'wallet') {
      await client.query(
        `UPDATE users SET wallet = wallet - $1 WHERE id = $2`,
        [total, input.userId],
      );
      await client.query(
        `INSERT INTO wallet_transactions (id, user_id, amount, type, description, reference_id)
         VALUES ($1, $2, $3, 'debit', $4, $5)`,
        [uuidv4(), input.userId, total, `Order #${seqNum}`, orderId],
      );
    }

    // 7. Insert print-job items + mark print jobs as paid (they are pre-calculated)
    for (const pj of printRows) {
      const itemId = uuidv4();
      await client.query(
        `INSERT INTO order_items (id, order_id, print_job_id, quantity, unit_price)
         VALUES ($1, $2, $3, 1, $4)`,
        [itemId, orderId, pj.id, parseFloat(pj.amount)]
      );
    }

    await client.query('COMMIT');

    // Increment coupon used_count (outside transaction, best-effort)
    if (couponId) {
      pool.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [couponId]).catch(() => {});
    }

    // 8. Cashfree session (outside transaction — only if Cashfree payment)
    let paymentSessionId: string | undefined;
    let cfOrderId: string | undefined;

    if (input.paymentMethod === 'cashfree') {
      const cfResult = await createCashfreeOrder({
        cfOrderId:     orderId,
        amount:        total,
        currency:      'INR',
        customerId:    input.userId,
        customerName:  input.userName,
        customerEmail: input.userEmail,
        customerPhone: input.userPhone || '9999999999',
        returnUrl:     `${process.env.FRONTEND_URL}/checkout/success?orderId=${orderId}&cfOrderId=${orderId}`,
      });
      paymentSessionId = cfResult.paymentSessionId;
      cfOrderId        = cfResult.cfOrderId;
    }

    return { orderId, seqNum, subtotal, deliveryCharge, total, paymentMethod: input.paymentMethod, paymentSessionId, cfOrderId };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Verify Cashfree payment ──────────────────────────────────────────────────

export async function verifyOrderPayment(orderId: string, cfOrderId: string, userId: string): Promise<{ success: boolean; paymentId?: string }> {
  // Confirm order belongs to user
  const oRes = await pool.query(
    `SELECT id, payment_status FROM orders WHERE id = $1 AND user_id = $2`,
    [orderId, userId]
  );
  if (oRes.rowCount === 0) throw new Error('Order not found');
  if (oRes.rows[0].payment_status === 'paid') return { success: true };

  const payments = await fetchCashfreePayments(cfOrderId);
  const success  = payments.find((p) => p.payment_status === 'SUCCESS');

  if (success) {
    await pool.query(
      `UPDATE orders SET payment_status = 'paid', payment_id = $1, updated_at = NOW() WHERE id = $2`,
      [success.cf_payment_id, orderId]
    );
    // Update bundled print jobs
    await pool.query(
      `UPDATE print_jobs SET status = 'paid', updated_at = NOW()
       WHERE id IN (SELECT print_job_id FROM order_items WHERE order_id = $1 AND print_job_id IS NOT NULL)`,
      [orderId]
    );
    return { success: true, paymentId: success.cf_payment_id };
  }

  return { success: false };
}

// ─── Manual approval (admin) ─────────────────────────────────────────────────

export async function approveOrderManually(orderId: string): Promise<void> {
  const res = await pool.query(
    `UPDATE orders SET payment_status = 'paid', payment_id = 'MANUAL', updated_at = NOW()
     WHERE id = $1 RETURNING id`,
    [orderId]
  );
  if (res.rowCount === 0) throw new Error('Order not found');

  await pool.query(
    `UPDATE print_jobs SET status = 'paid', updated_at = NOW()
     WHERE id IN (SELECT print_job_id FROM order_items WHERE order_id = $1 AND print_job_id IS NOT NULL)`,
    [orderId]
  );
}

// ─── List user orders ─────────────────────────────────────────────────────────

export async function listUserOrders(userId: string): Promise<OrderRow[]> {
  const ordersRes = await pool.query(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );

  if (ordersRes.rowCount === 0) return [];

  const orderIds = ordersRes.rows.map((r: any) => r.id);

  const itemsRes = await pool.query(
    `SELECT oi.*, p.name AS product_name, pj.file_name
     FROM order_items oi
     LEFT JOIN products   p  ON p.id  = oi.product_id
     LEFT JOIN print_jobs pj ON pj.id = oi.print_job_id
     WHERE oi.order_id = ANY($1)`,
    [orderIds]
  );

  const itemsByOrder: Record<string, OrderItemRow[]> = {};
  for (const item of itemsRes.rows as OrderItemRow[]) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push(item);
  }

  return ordersRes.rows.map((o: any) => ({ ...o, items: itemsByOrder[o.id] || [] }));
}

// ─── Get single order ─────────────────────────────────────────────────────────

export async function getOrder(orderId: string, userId: string): Promise<OrderRow | null> {
  const oRes = await pool.query(
    `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
    [orderId, userId]
  );
  if (oRes.rowCount === 0) return null;

  const iRes = await pool.query(
    `SELECT oi.*, p.name AS product_name, pj.file_name
     FROM order_items oi
     LEFT JOIN products   p  ON p.id  = oi.product_id
     LEFT JOIN print_jobs pj ON pj.id = oi.print_job_id
     WHERE oi.order_id = $1`,
    [orderId]
  );

  return { ...oRes.rows[0], items: iRes.rows };
}

// ─── List ALL orders (admin) ──────────────────────────────────────────────────

export async function listAllOrders(): Promise<OrderRow[]> {
  const ordersRes = await pool.query(
    `SELECT o.*, u.name AS user_name, u.email AS user_email
     FROM orders o JOIN users u ON u.id = o.user_id
     ORDER BY o.created_at DESC LIMIT 100`
  );

  if (ordersRes.rowCount === 0) return [];

  const orderIds = ordersRes.rows.map((r: any) => r.id);

  const itemsRes = await pool.query(
    `SELECT oi.*, p.name AS product_name, pj.file_name
     FROM order_items oi
     LEFT JOIN products   p  ON p.id  = oi.product_id
     LEFT JOIN print_jobs pj ON pj.id = oi.print_job_id
     WHERE oi.order_id = ANY($1)`,
    [orderIds]
  );

  const itemsByOrder: Record<string, OrderItemRow[]> = {};
  for (const item of itemsRes.rows as OrderItemRow[]) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push(item);
  }

  return ordersRes.rows.map((o: any) => ({ ...o, items: itemsByOrder[o.id] || [] }));
}

// ─── Update order delivery status (admin) ────────────────────────────────────

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderRow & { user_id: string }> {
  const result = await pool.query(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2
     RETURNING id, user_id, sequence_number, status, payment_status, total, delivery_type, created_at`,
    [status, orderId]
  );
  if (result.rowCount === 0) throw new Error('Order not found');
  return result.rows[0];
}
