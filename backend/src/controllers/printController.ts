import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  createPrintJob,
  listUserPrintJobs,
  getPrintJobById,
  calcPrintAmount,
  PRICE,
} from '../services/printService';
import {
  listPrinters,
  getJobQueuePosition,
} from '../services/printerService';

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const VALID_PAGE_SIZES = ['A4', 'A3', 'A5', 'Letter'] as const;

/**
 * POST /api/print/jobs
 */
export async function submitPrintJob(req: AuthRequest, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    res.status(400).json({ success: false, message: 'No file uploaded.' });
    return;
  }

  const colorMode  = (req.body.colorMode  as string) === 'color' ? 'color' : 'bw';
  const rawSize    = (req.body.pageSize   as string ?? 'A4').toUpperCase();
  const pageSize   = (VALID_PAGE_SIZES as readonly string[]).includes(rawSize)
    ? (rawSize as 'A4' | 'A3' | 'A5' | 'Letter')
    : 'A4';
  const lamination = req.body.lamination === 'true' || req.body.lamination === true;
  const copies     = Math.max(1, parseInt(req.body.copies     as string, 10) || 1);
  const totalPages = Math.max(1, parseInt(req.body.totalPages as string, 10) || 1);

  const orientation = (req.body.orientation as string) === 'landscape' ? 'landscape' : 'portrait';
  const duplex      = req.body.duplex === 'true' || req.body.duplex === true;
  const rawPaper    = req.body.paperType as string ?? 'normal';
  const paperType   = ['normal', 'glossy', 'thick'].includes(rawPaper)
    ? (rawPaper as 'normal' | 'glossy' | 'thick')
    : 'normal';
  const printRange  = (req.body.printRange as string) === 'custom' ? 'custom' : 'all';
  const pageFrom    = printRange === 'custom' ? (parseInt(req.body.pageFrom as string, 10) || null) : null;
  const pageTo      = printRange === 'custom' ? (parseInt(req.body.pageTo   as string, 10) || null) : null;
  const notes       = typeof req.body.notes === 'string' ? req.body.notes.slice(0, 500) : undefined;

  const amount  = calcPrintAmount(colorMode, pageSize, lamination, totalPages, copies, paperType);
  const fileUrl = `${BASE_URL}/uploads/${file.filename}`;

  try {
    const job = await createPrintJob({
      userId:     req.userId!,
      fileUrl,
      fileName:   file.originalname,
      colorMode,
      pageSize,
      copies,
      lamination,
      totalPages,
      amount,
      orientation,
      duplex,
      paperType,
      printRange,
      pageFrom,
      pageTo,
      notes,
    });

    res.status(201).json({ success: true, data: job });
  } catch (err) {
    console.error('[Print] submitPrintJob error:', err);
    res.status(500).json({ success: false, message: 'Failed to create print job.' });
  }
}

/**
 * GET /api/print/jobs
 */
export async function getUserPrintJobs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const jobs = await listUserPrintJobs(req.userId!);
    res.json({ success: true, data: jobs });
  } catch (err) {
    console.error('[Print] getUserPrintJobs error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch print jobs.' });
  }
}

/**
 * GET /api/print/pricing
 */
export function getPricing(_req: AuthRequest, res: Response): void {
  res.json({ success: true, data: PRICE });
}

/**
 * GET /api/print/jobs/:id
 */
export async function getPrintJobDetail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const job = await getPrintJobById(req.params['id'] as string, req.userId!);
    if (!job) {
      res.status(404).json({ success: false, message: 'Print job not found.' });
      return;
    }
    res.json({ success: true, data: job });
  } catch (err) {
    console.error('[Print] getPrintJobDetail error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch print job.' });
  }
}

/**
 * GET /api/print/jobs/:id/queue-position
 * Returns the current queue position + depth for a pending/processing job.
 */
export async function getQueuePosition(req: AuthRequest, res: Response): Promise<void> {
  try {
    const info = await getJobQueuePosition(req.params['id'] as string);
    if (!info) {
      res.json({ success: true, data: null });
      return;
    }
    res.json({ success: true, data: info });
  } catch (err) {
    console.error('[Print] getQueuePosition error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch queue position.' });
  }
}

/**
 * GET /api/print/printers/status
 * Public (authenticated) — shows printer availability for the submit form.
 */
export async function getPrinterStatus(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const printers = await listPrinters();
    const publicInfo = printers.map(p => ({
      id:           p.id,
      name:         p.name,
      capabilities: p.capabilities,
      status:       p.status,
      location:     p.location,
      queue_depth:  Number(p.queue_depth ?? 0),
    }));
    res.json({ success: true, data: publicInfo });
  } catch (err) {
    console.error('[Print] getPrinterStatus error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch printer status.' });
  }
}
