import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db';
import { createCashfreeOrder, fetchCashfreePayments } from './cashfreeService';

export interface WalletTx {
  id:           string;
  user_id:      string;
  amount:       string;
  type:         'credit' | 'debit';
  description:  string | null;
  reference_id: string | null;
  created_at:   Date;
}

// ─── Balance ─────────────────────────────────────────────────────────────────

export async function getWalletBalance(userId: string): Promise<number> {
  const res = await pool.query('SELECT wallet FROM users WHERE id = $1', [userId]);
  return parseFloat(res.rows[0]?.wallet ?? '0');
}

// ─── Credit (outside a transaction) ──────────────────────────────────────────

export async function creditWallet(
  userId:      string,
  amount:      number,
  description: string,
  referenceId?: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE users SET wallet = wallet + $1 WHERE id = $2`,
      [amount, userId],
    );
    await client.query(
      `INSERT INTO wallet_transactions (id, user_id, amount, type, description, reference_id)
       VALUES ($1, $2, $3, 'credit', $4, $5)`,
      [uuidv4(), userId, amount, description, referenceId ?? null],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getWalletHistory(userId: string): Promise<WalletTx[]> {
  const res = await pool.query(
    `SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId],
  );
  return res.rows as WalletTx[];
}

// ─── Initiate top-up via Cashfree ─────────────────────────────────────────────

export interface TopUpResult {
  topupId:          string;
  paymentSessionId: string;
}

export async function initTopUp(
  userId:    string,
  userName:  string,
  userEmail: string,
  userPhone: string,
  amount:    number,
): Promise<TopUpResult> {
  if (amount < 10) throw new Error('Minimum top-up is ₹10');
  if (amount > 10000) throw new Error('Maximum top-up is ₹10,000');

  const topupId = `topup_${uuidv4().replace(/-/g, '')}`.slice(0, 50);

  const cfResult = await createCashfreeOrder({
    cfOrderId:     topupId,
    amount,
    currency:      'INR',
    customerId:    userId,
    customerName:  userName,
    customerEmail: userEmail,
    customerPhone: userPhone || '9999999999',
    returnUrl: `${process.env.FRONTEND_URL}/dashboard?topup=success&ref=${topupId}`,
  });

  return { topupId: cfResult.cfOrderId, paymentSessionId: cfResult.paymentSessionId };
}

// ─── Verify top-up and credit wallet ─────────────────────────────────────────

export async function verifyTopUp(
  userId: string,
  topupId: string,
): Promise<{ success: boolean; amount?: number }> {
  // Prevent double-credit: check if already processed
  const dup = await pool.query(
    `SELECT id FROM wallet_transactions WHERE reference_id = $1 AND user_id = $2`,
    [topupId, userId],
  );
  if ((dup.rowCount ?? 0) > 0) return { success: true }; // idempotent

  const payments = await fetchCashfreePayments(topupId);
  const success  = payments.some(p => p.payment_status === 'SUCCESS');
  if (!success) return { success: false };

  // Derive amount from Cashfree ID pattern (e.g., topup_<uuid>)
  // Re-fetch the order amount from Cashfree
  const res = await fetch(
    `${process.env.CASHFREE_ENV === 'PRODUCTION' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com'}/pg/orders/${topupId}`,
    {
      headers: {
        'x-client-id':     process.env.CASHFREE_APP_ID!,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
        'x-api-version':   '2023-08-01',
      },
    },
  );
  const data: any = await res.json();
  const amount: number = parseFloat(data?.order_amount ?? '0');

  await creditWallet(userId, amount, 'Wallet top-up', topupId);

  return { success: true, amount };
}
