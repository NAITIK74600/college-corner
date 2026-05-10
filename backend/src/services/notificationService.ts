import pool from '../config/db';
import { sendSseToUser } from './sseService';

export type NotifType = 'order_status' | 'print_status' | 'system';

export interface NotificationRecord {
  id:         string;
  user_id:    string;
  type:       NotifType;
  title:      string;
  body:       string;
  link:       string | null;
  is_read:    boolean;
  created_at: string;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createNotification(
  userId:  string,
  type:    NotifType,
  title:   string,
  body:    string,
  link?:   string,
): Promise<void> {
  const result = await pool.query<NotificationRecord>(
    `INSERT INTO notifications (user_id, type, title, body, link)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, type, title, body, link ?? null],
  );
  // Push real-time event to any active SSE connections for this user
  sendSseToUser(userId, 'notification', result.rows[0]);
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listNotifications(
  userId: string,
  limit = 30,
): Promise<NotificationRecord[]> {
  const result = await pool.query<NotificationRecord>(
    `SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, limit],
  );
  return result.rows;
}

// ─── Unread count ─────────────────────────────────────────────────────────────

export async function getUnreadCount(userId: string): Promise<number> {
  const result = await pool.query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId],
  );
  return parseInt(result.rows[0].cnt, 10);
}

// ─── Mark one read ────────────────────────────────────────────────────────────

export async function markNotificationRead(notifId: string, userId: string): Promise<void> {
  await pool.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
    [notifId, userId],
  );
}

// ─── Mark all read ────────────────────────────────────────────────────────────

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await pool.query(
    `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
    [userId],
  );
}
