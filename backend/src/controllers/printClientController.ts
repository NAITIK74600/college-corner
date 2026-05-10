import { Request, Response } from 'express';
import pool from '../config/db';
import { updatePrintJobStatus } from '../services/printService';
import { createNotification } from '../services/notificationService';

/**
 * GET /api/print-client/queue?printer_id=xxx
 * Returns all paid jobs assigned to the given printer, ordered oldest-first.
 */
export async function clientGetQueue(req: Request, res: Response): Promise<void> {
  const { printer_id } = req.query;

  if (!printer_id || typeof printer_id !== 'string') {
    res.status(400).json({ success: false, message: 'printer_id query param required.' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT pj.*,
              u.name  AS user_name,
              u.email AS user_email
         FROM print_jobs pj
         JOIN users u ON u.id = pj.user_id
        WHERE pj.status = 'paid'
          AND pj.assigned_printer_id = $1
        ORDER BY pj.created_at ASC`,
      [printer_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/print-client/jobs/:id/status
 * Body: { status: 'processing' | 'printed' | 'failed', error_message?: string }
 * The local client calls this to report progress.
 */
export async function clientUpdateJobStatus(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { status, error_message } = req.body;

  const ALLOWED = ['processing', 'printed', 'failed'];
  if (!ALLOWED.includes(status)) {
    res.status(400).json({ success: false, message: `status must be one of: ${ALLOWED.join(', ')}` });
    return;
  }

  try {
    const job = await updatePrintJobStatus(id, status, error_message);
    res.json({ success: true, data: job });

    // Notify the user
    const msgs: Partial<Record<string, { title: string; body: string }>> = {
      processing: { title: 'Print job started',   body: 'Your print job is now being processed.' },
      printed:    { title: 'Print job printed',   body: 'Your document has been printed and will be ready soon.' },
      failed:     { title: 'Print job failed',    body: 'There was a problem printing your document.' },
    };
    const m = msgs[status];
    if (m) {
      createNotification(job.user_id, 'print_status', m.title, m.body, '/dashboard').catch(() => {});
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
