import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  createOrder,
  verifyOrderPayment,
  approveOrderManually,
  listUserOrders,
  listAllOrders,
  getOrder,
} from '../services/orderService';
import { sendOrderConfirmation } from '../services/emailService';

// POST /api/orders
export async function placeOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { items = [], printJobIds = [], deliveryType, notes, paymentMethod, couponCode } = req.body;

    if (!deliveryType || !['pickup', 'delivery'].includes(deliveryType)) {
      res.status(400).json({ error: 'deliveryType must be pickup or delivery' });
      return;
    }
    if (!paymentMethod || !['cashfree', 'cod', 'wallet'].includes(paymentMethod)) {
      res.status(400).json({ error: 'paymentMethod must be cashfree, cod or wallet' });
      return;
    }
    if (items.length === 0 && printJobIds.length === 0) {
      res.status(400).json({ error: 'Order must have at least one item or print job' });
      return;
    }

    // We need user details for Cashfree — fetch from DB
    const { findUserById } = await import('../services/authService');
    const user = await findUserById(req.userId!);
    if (!user) { res.status(401).json({ error: 'User not found' }); return; }

    const result = await createOrder({
      userId:        req.userId!,
      userName:      user.name,
      userEmail:     user.email,
      userPhone:     user.phone || '9999999999',
      items,
      printJobIds,
      deliveryType,
      notes,
      paymentMethod,
      couponCode:    couponCode || undefined,
    });

    res.status(201).json(result);

    // Fire-and-forget email confirmation (non-blocking)
    sendOrderConfirmation(req.userId!, result.seqNum, String(result.total), paymentMethod).catch(() => {});
  } catch (err: any) {
    console.error('[placeOrder]', err);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
}

// POST /api/orders/verify-payment
export async function verifyPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orderId, cfOrderId } = req.body;
    if (!orderId || !cfOrderId) {
      res.status(400).json({ error: 'orderId and cfOrderId are required' });
      return;
    }
    const result = await verifyOrderPayment(orderId, cfOrderId, req.userId!);
    res.json(result);
  } catch (err: any) {
    console.error('[verifyPayment]', err);
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
}

// GET /api/orders
export async function getOrders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const isAdmin = req.userRole === 'admin';
    const orders  = isAdmin ? await listAllOrders() : await listUserOrders(req.userId!);
    res.json({ orders });
  } catch (err: any) {
    console.error('[getOrders]', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

// GET /api/orders/:id
export async function getOrderById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const order = await getOrder(req.params['id'] as string, req.userId!);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    res.json({ order });
  } catch (err: any) {
    console.error('[getOrderById]', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
}

// PATCH /api/orders/:id/approve  (admin only)
export async function approveOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    await approveOrderManually(req.params['id'] as string);
    res.json({ success: true, message: 'Order approved manually' });
  } catch (err: any) {
    console.error('[approveOrder]', err);
    res.status(500).json({ error: err.message || 'Approval failed' });
  }
}
