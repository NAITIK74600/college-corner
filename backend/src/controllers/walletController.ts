import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  getWalletBalance,
  getWalletHistory,
  initTopUp,
  verifyTopUp,
} from '../services/walletService';

// GET /api/wallet/balance
export async function walletGetBalance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const balance = await getWalletBalance(req.userId!);
    res.json({ balance });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Server error' });
  }
}

// GET /api/wallet/history
export async function walletGetHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const transactions = await getWalletHistory(req.userId!);
    res.json({ data: transactions });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Server error' });
  }
}

// POST /api/wallet/topup/init
export async function walletInitTopUp(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { amount } = req.body as { amount: unknown };
    const amt = parseFloat(String(amount));
    if (!amt || isNaN(amt) || amt < 10) {
      res.status(400).json({ error: 'Amount must be at least ₹10' });
      return;
    }

    const { findUserById } = await import('../services/authService');
    const user = await findUserById(req.userId!);
    if (!user) { res.status(401).json({ error: 'User not found' }); return; }

    const result = await initTopUp(
      req.userId!,
      user.name,
      user.email,
      user.phone || '9999999999',
      amt,
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Server error' });
  }
}

// POST /api/wallet/topup/verify
export async function walletVerifyTopUp(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { topupId } = req.body as { topupId: unknown };
    if (!topupId || typeof topupId !== 'string') {
      res.status(400).json({ error: 'topupId required' });
      return;
    }

    const result = await verifyTopUp(req.userId!, topupId);
    if (!result.success) {
      res.status(402).json({ error: 'Payment not confirmed yet' });
      return;
    }

    // Return updated balance
    const balance = await getWalletBalance(req.userId!);
    res.json({ success: true, amount: result.amount, balance });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Server error' });
  }
}
