import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that validates the `x-api-key` header against
 * PRINT_CLIENT_API_KEY environment variable.
 * Used exclusively by the local print-client daemon.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-api-key'];
  const expected = process.env.PRINT_CLIENT_API_KEY;

  if (!expected) {
    res.status(503).json({ success: false, message: 'Print client API key not configured on server.' });
    return;
  }

  if (!key || key !== expected) {
    res.status(401).json({ success: false, message: 'Invalid or missing API key.' });
    return;
  }

  next();
}
