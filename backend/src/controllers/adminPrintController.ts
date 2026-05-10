import { Request, Response } from 'express';
import pool from '../config/db';
import { updatePrintJobStatus, listAllPrintJobs } from '../services/printService';
import { reassignJob } from '../services/printerService';

/**
 * GET /api/print/admin/jobs
 * Returns all print jobs with user info (admin only).
 */
export async function adminListPrintJobs(_req: Request, res: Response): Promise<void> {
  try {
    const jobs = await listAllPrintJobs();
    res.json({ success: true, data: jobs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/print/admin/jobs/:id/status
 * Body: { status: string, error_message?: string }
 */
export async function adminUpdateJobStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status, error_message } = req.body;

  const ALLOWED = ['pending', 'paid', 'processing', 'printed', 'ready', 'failed'];
  if (!ALLOWED.includes(status)) {
    res.status(400).json({ success: false, message: `status must be one of: ${ALLOWED.join(', ')}` });
    return;
  }

  try {
    const job = await updatePrintJobStatus(id as string, status, error_message);
    res.json({ success: true, data: job });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/print/admin/printers/:printerId/queue
 * Returns all active (paid + processing) jobs assigned to a specific printer.
 */
export async function adminGetPrinterQueue(req: Request, res: Response): Promise<void> {
  const { printerId } = req.params;
  try {
    const result = await pool.query(
      `SELECT pj.*,
              u.name  AS user_name,
              u.email AS user_email
         FROM print_jobs pj
         JOIN users u ON u.id = pj.user_id
        WHERE pj.assigned_printer_id = $1
          AND pj.status IN ('paid', 'processing')
        ORDER BY pj.created_at ASC`,
      [printerId],
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/print/admin/jobs/:id/reassign
 * Body: { printerId: string }
 * Moves a job from its current printer to a different one.
 */
export async function adminReassignJob(req: Request, res: Response): Promise<void> {
  const { id }        = req.params;
  const { printerId } = req.body;

  if (!printerId) {
    res.status(400).json({ success: false, message: 'printerId is required.' });
    return;
  }

  try {
    await reassignJob(id as string, printerId as string);
    res.json({ success: true, message: 'Job reassigned.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
