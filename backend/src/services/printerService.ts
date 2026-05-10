import pool from '../config/db';

export interface Printer {
  id:             string;
  name:           string;
  capabilities:   'bw' | 'color' | 'both';
  status:         'active' | 'inactive' | 'error' | 'maintenance';
  current_job_id: string | null;
  location:       string | null;
  notes:          string | null;
  jobs_done:      number;
  last_active:    Date | null;
  created_at:     Date;
  updated_at:     Date;
  // virtual (from queue query)
  queue_depth?:   number;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function listPrinters(): Promise<Printer[]> {
  const r = await pool.query<Printer>(
    `SELECT p.*,
            COUNT(pj.id) FILTER (WHERE pj.status IN ('paid','processing')) AS queue_depth
     FROM printers p
     LEFT JOIN print_jobs pj ON pj.assigned_printer_id = p.id
     GROUP BY p.id
     ORDER BY p.created_at ASC`,
  );
  return r.rows;
}

export async function getPrinterById(id: string): Promise<Printer | null> {
  const r = await pool.query<Printer>(
    `SELECT p.*,
            COUNT(pj.id) FILTER (WHERE pj.status IN ('paid','processing')) AS queue_depth
     FROM printers p
     LEFT JOIN print_jobs pj ON pj.assigned_printer_id = p.id
     WHERE p.id = $1
     GROUP BY p.id`,
    [id],
  );
  return r.rows[0] ?? null;
}

export async function createPrinter(
  name: string,
  capabilities: Printer['capabilities'],
  location?: string,
): Promise<Printer> {
  const r = await pool.query<Printer>(
    `INSERT INTO printers (name, capabilities, location) VALUES ($1, $2, $3) RETURNING *`,
    [name, capabilities, location ?? null],
  );
  return r.rows[0];
}

export async function updatePrinter(
  id: string,
  fields: Partial<Pick<Printer, 'name' | 'capabilities' | 'status' | 'location' | 'notes'>>,
): Promise<Printer> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (fields.name         !== undefined) { sets.push(`name = $${i++}`);         vals.push(fields.name); }
  if (fields.capabilities !== undefined) { sets.push(`capabilities = $${i++}`); vals.push(fields.capabilities); }
  if (fields.status       !== undefined) { sets.push(`status = $${i++}`);       vals.push(fields.status); }
  if (fields.location     !== undefined) { sets.push(`location = $${i++}`);     vals.push(fields.location); }
  if (fields.notes        !== undefined) { sets.push(`notes = $${i++}`);        vals.push(fields.notes); }
  if (sets.length === 0) throw new Error('Nothing to update');
  sets.push(`updated_at = NOW()`);
  vals.push(id);
  const r = await pool.query<Printer>(
    `UPDATE printers SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals,
  );
  if ((r.rowCount ?? 0) === 0) throw new Error('Printer not found');
  return r.rows[0];
}

export async function deletePrinter(id: string): Promise<void> {
  const r = await pool.query(`DELETE FROM printers WHERE id = $1`, [id]);
  if ((r.rowCount ?? 0) === 0) throw new Error('Printer not found');
}

// ─── Round-Robin Assignment ───────────────────────────────────────────────────

/**
 * Assigns the best available active printer to a print job using round-robin.
 *
 * Capability matching:
 *   bw  job  → printers with capabilities IN ('bw', 'both')
 *   color job → printers with capabilities IN ('color', 'both')
 *
 * Round-robin: among eligible printers, pick the one whose current_job_id is
 * NULL first (idle), then fall back to the one with the oldest updated_at
 * (least recently assigned). Ties broken by created_at ASC.
 *
 * Returns the assigned printer, or null if none available.
 */
export async function assignPrinterToJob(
  jobId: string,
  colorMode: 'bw' | 'color',
): Promise<Printer | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock eligible active printers for update
    const eligible = colorMode === 'bw'
      ? `capabilities IN ('bw', 'both')`
      : `capabilities IN ('color', 'both')`;

    const prRes = await client.query<Printer>(
      `SELECT * FROM printers
       WHERE status = 'active' AND ${eligible}
       ORDER BY
         (current_job_id IS NULL) DESC,   -- idle printers first
         updated_at ASC                   -- then least-recently-used
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
    );

    if (prRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const printer = prRes.rows[0];

    // Assign job to printer
    await client.query(
      `UPDATE printers SET current_job_id = $1, updated_at = NOW() WHERE id = $2`,
      [jobId, printer.id],
    );
    await client.query(
      `UPDATE print_jobs SET assigned_printer_id = $1, updated_at = NOW() WHERE id = $2`,
      [printer.id, jobId],
    );

    await client.query('COMMIT');
    return { ...printer, current_job_id: jobId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Clears current_job_id on the printer that owns this job (call when job is
 * printed/ready/failed so the printer is freed for the next job).
 * Also increments jobs_done and records last_active timestamp.
 */
export async function freePrinterFromJob(jobId: string): Promise<void> {
  await pool.query(
    `UPDATE printers
     SET current_job_id = NULL,
         jobs_done      = jobs_done + 1,
         last_active    = NOW(),
         updated_at     = NOW()
     WHERE current_job_id = $1`,
    [jobId],
  );
}

/**
 * Reassign a print job to a different printer (admin action).
 */
export async function reassignJob(jobId: string, newPrinterId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Free old printer
    await client.query(
      `UPDATE printers SET current_job_id = NULL, updated_at = NOW() WHERE current_job_id = $1`,
      [jobId],
    );
    // Assign to new printer
    await client.query(
      `UPDATE printers SET current_job_id = $1, last_active = NOW(), updated_at = NOW() WHERE id = $2`,
      [jobId, newPrinterId],
    );
    await client.query(
      `UPDATE print_jobs SET assigned_printer_id = $1, updated_at = NOW() WHERE id = $2`,
      [newPrinterId, jobId],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get queue position of a job (how many paid/processing jobs are ahead of it
 * on the same printer, ordered by created_at).
 * Returns null if job has no assigned printer or is not queued.
 */
export async function getJobQueuePosition(jobId: string): Promise<{ position: number; queueDepth: number; printerId: string | null; printerName: string | null } | null> {
  const jobRes = await pool.query(
    `SELECT pj.id, pj.assigned_printer_id, pj.status, pj.created_at, p.name AS printer_name
     FROM print_jobs pj
     LEFT JOIN printers p ON p.id = pj.assigned_printer_id
     WHERE pj.id = $1`,
    [jobId],
  );
  if (!jobRes.rowCount) return null;
  const job = jobRes.rows[0];
  if (!job.assigned_printer_id || !['paid', 'processing'].includes(job.status)) return null;

  const posRes = await pool.query(
    `SELECT COUNT(*) AS cnt FROM print_jobs
     WHERE assigned_printer_id = $1
       AND status IN ('paid','processing')
       AND created_at <= $2`,
    [job.assigned_printer_id, job.created_at],
  );
  const position   = parseInt(posRes.rows[0].cnt, 10);
  const depthRes   = await pool.query(
    `SELECT COUNT(*) AS cnt FROM print_jobs
     WHERE assigned_printer_id = $1 AND status IN ('paid','processing')`,
    [job.assigned_printer_id],
  );
  const queueDepth = parseInt(depthRes.rows[0].cnt, 10);

  return { position, queueDepth, printerId: job.assigned_printer_id, printerName: job.printer_name };
}
