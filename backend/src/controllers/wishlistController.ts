import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import pool from '../config/db';

// ─── GET /api/wishlist ────────────────────────────────────────────────────────
export async function getWishlist(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.description, p.category, p.price, p.stock,
              p.image_url, p.is_active,
              ROUND(AVG(r.rating)::numeric, 1)::float AS avg_rating,
              COUNT(r.id)::int AS review_count,
              w.created_at AS wishlisted_at
       FROM wishlists w
       JOIN products p ON p.id = w.product_id
       LEFT JOIN reviews r ON r.product_id = p.id
       WHERE w.user_id = $1
       GROUP BY p.id, w.created_at
       ORDER BY w.created_at DESC`,
      [req.userId],
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── POST /api/wishlist/:productId ───────────────────────────────────────────
export async function addToWishlist(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { productId } = req.params;
    // Verify product exists
    const prod = await pool.query('SELECT id FROM products WHERE id = $1 AND is_active = true', [productId]);
    if (prod.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }
    await pool.query(
      'INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.userId, productId],
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── DELETE /api/wishlist/:productId ─────────────────────────────────────────
export async function removeFromWishlist(req: AuthRequest, res: Response): Promise<void> {
  try {
    await pool.query(
      'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
      [req.userId, req.params.productId],
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── GET /api/wishlist/ids ────────────────────────────────────────────────────
// Returns just an array of product IDs the user has wishlisted (used by store
// page to show filled/empty heart icons without fetching full product data).
export async function getWishlistIds(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await pool.query<{ product_id: string }>(
      'SELECT product_id FROM wishlists WHERE user_id = $1',
      [req.userId],
    );
    res.json({ success: true, data: result.rows.map(r => r.product_id) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
