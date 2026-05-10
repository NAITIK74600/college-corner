import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notificationService';
import { addSseClient, removeSseClient } from '../services/sseService';

// GET /api/notifications?limit=30
export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const limit  = Math.min(parseInt((req.query['limit'] as string) || '30', 10), 100);
    const [notifications, unreadCount] = await Promise.all([
      listNotifications(userId, limit),
      getUnreadCount(userId),
    ]);
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/notifications/read-all
export async function readAllNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    await markAllNotificationsRead(req.userId!);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/notifications/:id/read
export async function readNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    await markNotificationRead(req.params['id'] as string, req.userId!);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/notifications/stream  — Server-Sent Events
export async function streamNotifications(req: AuthRequest, res: Response): Promise<void> {
  res.set({
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache, no-transform',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no', // disable nginx proxy buffering
  });
  res.flushHeaders();

  const userId = req.userId!;

  // Send initial unread count so the client can sync immediately on (re)connect
  try {
    const unreadCount = await getUnreadCount(userId);
    res.write(`event: connected\ndata: ${JSON.stringify({ unreadCount })}\n\n`);
  } catch {
    // non-fatal
  }

  addSseClient(userId, res);

  // Keep-alive comment every 25 s (some proxies close idle connections at 30 s)
  const ping = setInterval(() => {
    try   { res.write(': ping\n\n'); }
    catch { clearInterval(ping); }
  }, 25_000);

  req.on('close', () => {
    clearInterval(ping);
    removeSseClient(userId, res);
  });
}
