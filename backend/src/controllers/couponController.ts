import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import pool from '../config/db';

export interface CouponRecord {
  id:           string;
  code:         string;
  type:         'percent' | 'fixed';
  value:        string;
  min_order:    string;
  max_discount: string | null;
  max_uses:     number | null;
  used_count:   number;
  expires_at:   string | null;
  is_active:    boolean;
  created_at:   string;
}

// ─── POST /api/coupons/validate ───────────────────────────────────────────────
// Body: { code: string, orderTotal: number }
// Returns the coupon + computed discount amount (does NOT consume the coupon)
export async function validateCoupon(req: AuthRequest, res: Response): Promise<void> {
  try {
    const code: string        = (req.body.code || '').trim().toUpperCase();
    const orderTotal: number  = parseFloat(req.body.orderTotal) || 0;

    if (!code) {
      res.status(400).json({ success: false, message: 'Coupon code is required.' });
      return;
    }

    const result = await pool.query<CouponRecord>(
      `SELECT * FROM coupons WHERE code = $1`,
      [code],
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Invalid coupon code.' });
      return;
    }

    const c = result.rows[0];

    if (!c.is_active) {
      res.status(400).json({ success: false, message: 'This coupon is no longer active.' });
      return;
    }
    if (c.expires_at && new Date(c.expires_at) < new Date()) {
      res.status(400).json({ success: false, message: 'This coupon has expired.' });
      return;
    }
    if (c.max_uses !== null && c.used_count >= c.max_uses) {
      res.status(400).json({ success: false, message: 'This coupon has reached its usage limit.' });
      return;
    }
    if (orderTotal < parseFloat(c.min_order)) {
      res.status(400).json({
        success: false,
        message: `Minimum order of ₹${parseFloat(c.min_order).toFixed(0)} required for this coupon.`,
      });
      return;
    }

    // Calculate discount
    let discount = 0;
    if (c.type === 'percent') {
      discount = (orderTotal * parseFloat(c.value)) / 100;
      if (c.max_discount !== null) discount = Math.min(discount, parseFloat(c.max_discount));
    } else {
      discount = parseFloat(c.value);
    }
    discount = Math.min(discount, orderTotal); // never discount more than total

    res.json({
      success: true,
      data: {
        couponId:    c.id,
        code:        c.code,
        type:        c.type,
        value:       parseFloat(c.value),
        discount:    parseFloat(discount.toFixed(2)),
        description: c.type === 'percent'
          ? `${parseFloat(c.value).toFixed(0)}% off${c.max_discount ? ` (up to ₹${parseFloat(c.max_discount).toFixed(0)})` : ''}`
          : `₹${parseFloat(c.value).toFixed(0)} off`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export async function adminListCoupons(_req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query<CouponRecord>(
      'SELECT * FROM coupons ORDER BY created_at DESC',
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function adminCreateCoupon(req: Request, res: Response): Promise<void> {
  try {
    const { code, type, value, min_order = 0, max_discount, max_uses, expires_at } = req.body;

    if (!code || !type || !value) {
      res.status(400).json({ success: false, message: 'code, type and value are required.' });
      return;
    }
    if (!['percent', 'fixed'].includes(type)) {
      res.status(400).json({ success: false, message: 'type must be percent or fixed.' });
      return;
    }

    const result = await pool.query<CouponRecord>(
      `INSERT INTO coupons (code, type, value, min_order, max_discount, max_uses, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        code.trim().toUpperCase(),
        type,
        parseFloat(value),
        parseFloat(min_order) || 0,
        max_discount ? parseFloat(max_discount) : null,
        max_uses     ? parseInt(max_uses)        : null,
        expires_at   ? new Date(expires_at)      : null,
      ],
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    if ((err as any).code === '23505') {
      res.status(409).json({ success: false, message: 'Coupon code already exists.' });
    } else {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export async function adminToggleCoupon(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query<CouponRecord>(
      'UPDATE coupons SET is_active = NOT is_active WHERE id = $1 RETURNING *',
      [req.params.id],
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Coupon not found.' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function adminDeleteCoupon(req: Request, res: Response): Promise<void> {
  try {
    await pool.query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
