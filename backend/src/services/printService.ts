import pool from '../config/db';
import { assignPrinterToJob, freePrinterFromJob } from './printerService';

export interface PrintJobRecord {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  color_mode: 'bw' | 'color';
  page_size: 'A4' | 'A3' | 'A5' | 'Letter';
  copies: number;
  lamination: boolean;
  total_pages: number;
  amount: string;
  status: string;
  assigned_printer_id: string | null;
  error_message: string | null;
  orientation: 'portrait' | 'landscape';
  duplex: boolean;
  paper_type: 'normal' | 'glossy' | 'thick';
  print_range: 'all' | 'custom';
  page_from: number | null;
  page_to: number | null;
  notes: string | null;
  created_at: Date;
}

export interface CreatePrintJobInput {
  userId: string;
  fileUrl: string;
  fileName: string;
  colorMode: 'bw' | 'color';
  pageSize: 'A4' | 'A3' | 'A5' | 'Letter';
  copies: number;
  lamination: boolean;
  totalPages: number;
  amount: number;
  orientation?: 'portrait' | 'landscape';
  duplex?: boolean;
  paperType?: 'normal' | 'glossy' | 'thick';
  printRange?: 'all' | 'custom';
  pageFrom?: number | null;
  pageTo?: number | null;
  notes?: string;
}

// ─── Pricing constants ────────────────────────────────────────────────────────
export const PRICE = {
  bw_a4:      1.50,
  bw_a3:      3.00,
  bw_a5:      1.00,
  bw_letter:  1.50,
  color_a4:   8.00,
  color_a3:  16.00,
  color_a5:   5.00,
  color_letter: 8.00,
  lam_page:  15.00,
  duplex:     0.00,  // duplex is free (saves paper)
  paper_glossy: 5.00, // extra per page
  paper_thick:  8.00, // extra per page
} as const;

/**
 * Calculate the total amount for a print job.
 */
export function calcPrintAmount(
  colorMode: 'bw' | 'color',
  pageSize: 'A4' | 'A3' | 'A5' | 'Letter',
  lamination: boolean,
  totalPages: number,
  copies: number,
  paperType: 'normal' | 'glossy' | 'thick' = 'normal',
): number {
  const sizeKey = pageSize.toLowerCase().replace(' ', '') as 'a4' | 'a3' | 'a5' | 'letter';
  const baseKey = `${colorMode}_${sizeKey}` as keyof typeof PRICE;
  const basePerPage = (PRICE[baseKey] as number) ?? PRICE.bw_a4;
  const paperExtra  = paperType === 'glossy' ? PRICE.paper_glossy : paperType === 'thick' ? PRICE.paper_thick : 0;
  const lamExtra    = lamination ? PRICE.lam_page : 0;
  const perPage     = basePerPage + paperExtra + lamExtra;
  return parseFloat((perPage * totalPages * copies).toFixed(2));
}

export async function createPrintJob(input: CreatePrintJobInput): Promise<PrintJobRecord> {
  const {
    userId, fileUrl, fileName, colorMode, pageSize,
    copies, lamination, totalPages, amount,
    orientation = 'portrait',
    duplex = false,
    paperType = 'normal',
    printRange = 'all',
    pageFrom = null,
    pageTo = null,
    notes = null,
  } = input;

  const result = await pool.query<PrintJobRecord>(
    `INSERT INTO print_jobs
       (user_id, file_url, file_name, color_mode, page_size, copies, lamination,
        total_pages, amount, status, orientation, duplex, paper_type, print_range, page_from, page_to, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [userId, fileUrl, fileName, colorMode, pageSize, copies, lamination,
     totalPages, amount, orientation, duplex, paperType, printRange, pageFrom, pageTo, notes]
  );
  return result.rows[0];
}

export async function listUserPrintJobs(userId: string): Promise<PrintJobRecord[]> {
  const result = await pool.query<PrintJobRecord>(
    `SELECT * FROM print_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  return result.rows;
}

export async function getPrintJobById(id: string, userId: string): Promise<PrintJobRecord | null> {
  const result = await pool.query<PrintJobRecord>(
    `SELECT * FROM print_jobs WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] ?? null;
}

export async function listAllPrintJobs(): Promise<PrintJobRecord[]> {
  const result = await pool.query<PrintJobRecord>(
    `SELECT pj.*, u.name as user_name, u.email as user_email
     FROM print_jobs pj
     JOIN users u ON u.id = pj.user_id
     ORDER BY pj.created_at DESC LIMIT 100`
  );
  return result.rows;
}

export async function updatePrintJobStatus(id: string, status: string, errorMessage?: string): Promise<PrintJobRecord> {
  const result = await pool.query<PrintJobRecord>(
    `UPDATE print_jobs SET status = $2, error_message = COALESCE($3, error_message), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, status, errorMessage ?? null]
  );
  if (!result.rowCount) throw new Error('Print job not found');
  const job = result.rows[0];

  // Auto-assign printer when job becomes paid (fire-and-forget, non-fatal)
  if (status === 'paid') {
    assignPrinterToJob(job.id, job.color_mode).then(printer => {
      if (printer) console.log(`[Queue] Job ${job.id} → Printer "${printer.name}"`);
      else         console.warn(`[Queue] No eligible printer for job ${job.id} (${job.color_mode})`);
    }).catch(err => console.error('[Queue] assignPrinterToJob error:', err));
  }

  // Free printer when job is done/failed
  if (['printed', 'ready', 'failed'].includes(status)) {
    freePrinterFromJob(job.id).catch(err => console.error('[Queue] freePrinterFromJob error:', err));
  }

  return job;
}
