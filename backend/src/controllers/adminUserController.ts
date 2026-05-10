import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

// ─── List Users ───────────────────────────────────────────────────────────────

// GET /api/admin/users/manage?search=&role=&page=1
export async function listAdminUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const search = ((req.query.search as string) || '').trim();
    const role   = (req.query.role   as string) || '';
    const page   = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit  = 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[]    = [];
    let   idx = 1;

    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (role === 'admin' || role === 'customer') {
      conditions.push(`u.role = $${idx}`);
      params.push(role);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows, countRow] = await Promise.all([
      pool.query(
        `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_banned, u.wallet, u.created_at,
                COUNT(DISTINCT o.id)::int  AS order_count,
                COUNT(DISTINCT pj.id)::int AS print_count
         FROM users u
         LEFT JOIN orders o       ON o.user_id  = u.id
         LEFT JOIN print_jobs pj  ON pj.user_id = u.id
         ${where}
         GROUP BY u.id
         ORDER BY u.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total FROM users u ${where}`,
        params
      ),
    ]);

    res.json({
      success: true,
      data:    rows.rows,
      total:   countRow.rows[0].total,
      page,
      pages:   Math.ceil(countRow.rows[0].total / limit),
    });
  } catch (err: any) {
    console.error('[AdminUser] listAdminUsers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
}

// ─── User Detail ──────────────────────────────────────────────────────────────

// GET /api/admin/users/manage/:id
export async function getAdminUserDetail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const [userRow, statsRow, recentOrders, recentPrints] = await Promise.all([
      pool.query(
        `SELECT id, name, email, phone, role, is_banned, is_verified, wallet, created_at, updated_at
         FROM users WHERE id = $1`,
        [id]
      ),
      pool.query(
        `SELECT
           COUNT(DISTINCT o.id)::int              AS order_count,
           COALESCE(SUM(o.total), 0)::numeric     AS total_spent,
           COUNT(DISTINCT pj.id)::int             AS print_count
         FROM users u
         LEFT JOIN orders o     ON o.user_id  = u.id AND o.payment_status = 'paid'
         LEFT JOIN print_jobs pj ON pj.user_id = u.id
         WHERE u.id = $1`,
        [id]
      ),
      pool.query(
        `SELECT id, sequence_number, status, payment_status, total, created_at
         FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
        [id]
      ),
      pool.query(
        `SELECT id, file_name, status, amount, created_at
         FROM print_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
        [id]
      ),
    ]);

    if (!userRow.rows.length) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.json({
      success: true,
      data: {
        user:         userRow.rows[0],
        stats:        statsRow.rows[0],
        recentOrders: recentOrders.rows,
        recentPrints: recentPrints.rows,
      },
    });
  } catch (err: any) {
    console.error('[AdminUser] getAdminUserDetail error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user.' });
  }
}

// ─── Ban / Unban ──────────────────────────────────────────────────────────────

// POST /api/admin/users/manage/:id/ban
export async function banUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (id === req.userId) {
      res.status(400).json({ success: false, message: 'Cannot ban yourself.' });
      return;
    }
    const result = await pool.query(
      `UPDATE users SET is_banned = TRUE, updated_at = NOW()
       WHERE id = $1 RETURNING id, name, is_banned`,
      [id]
    );
    if (!result.rowCount) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('[AdminUser] banUser error:', err);
    res.status(500).json({ success: false, message: 'Failed to ban user.' });
  }
}

// POST /api/admin/users/manage/:id/unban
export async function unbanUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE users SET is_banned = FALSE, updated_at = NOW()
       WHERE id = $1 RETURNING id, name, is_banned`,
      [id]
    );
    if (!result.rowCount) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('[AdminUser] unbanUser error:', err);
    res.status(500).json({ success: false, message: 'Failed to unban user.' });
  }
}

// ─── Change Role ──────────────────────────────────────────────────────────────

// PATCH /api/admin/users/manage/:id/role  { role: 'customer' | 'admin' }
export async function updateUserRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id }   = req.params;
    const { role } = req.body as { role: string };

    if (role !== 'customer' && role !== 'admin') {
      res.status(400).json({ success: false, message: 'Role must be "customer" or "admin".' });
      return;
    }
    if (id === req.userId && role !== 'admin') {
      res.status(400).json({ success: false, message: 'Cannot demote yourself.' });
      return;
    }

    const result = await pool.query(
      `UPDATE users SET role = $2, updated_at = NOW()
       WHERE id = $1 RETURNING id, name, role`,
      [id, role]
    );
    if (!result.rowCount) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('[AdminUser] updateUserRole error:', err);
    res.status(500).json({ success: false, message: 'Failed to update role.' });
  }
}
