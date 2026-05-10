import { Response } from 'express';

/**
 * In-memory SSE client registry.
 * Maps userId → Set of active Response objects (one per open browser tab).
 * Works for single-process Node.js. For multi-process deployments, use Redis
 * pub/sub instead.
 */
const clients = new Map<string, Set<Response>>();

export function addSseClient(userId: string, res: Response): void {
  let set = clients.get(userId);
  if (!set) { set = new Set(); clients.set(userId, set); }
  set.add(res);
}

export function removeSseClient(userId: string, res: Response): void {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(userId);
}

/**
 * Push an SSE event to all open connections for a given user.
 * Silently swallows write errors (client may have just disconnected).
 */
export function sendSseToUser(userId: string, event: string, data: unknown): void {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try { res.write(payload); }
    catch { set.delete(res); }
  }
}
