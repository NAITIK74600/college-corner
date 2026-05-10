import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

interface JwtPayload {
  userId: string;
  role: string;
}

/**
 * Verifies the HttpOnly JWT cookie and attaches userId/userRole to the request.
 * Returns 401 if the token is missing or invalid.
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.token as string | undefined;

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.userId   = payload.userId;
    req.userRole = payload.role;

    // Check ban status (PK lookup — fast; catches bans without token reissue)
    const { rows } = await pool.query(
      'SELECT is_banned FROM users WHERE id = $1',
      [payload.userId]
    );
    if (rows[0]?.is_banned) {
      res.status(403).json({ success: false, message: 'Your account has been suspended.' });
      return;
    }

    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: 'Invalid or expired session.' });
    } else {
      res.status(500).json({ success: false, message: 'Authentication error.' });
    }
  }
}

/**
 * Same as requireAuth but also enforces admin role.
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, (err?: unknown) => {
    if (err) { next(err); return; }
    if (req.userRole !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin access required.' });
      return;
    }
    next();
  });
}
