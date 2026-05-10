import 'dotenv/config';
import axios, { AxiosError } from 'axios';
import * as fs   from 'fs';
import * as os   from 'os';
import * as path from 'path';
import { print } from 'pdf-to-printer';
import PDFDocument from 'pdfkit';

// ─── Config ──────────────────────────────────────────────────────────────────
const API_URL       = (process.env.API_URL         || 'http://localhost:5000').replace(/\/$/, '');
const API_KEY       =  process.env.PRINT_CLIENT_API_KEY || '';
const PRINTER_ID    =  process.env.PRINTER_ID           || '';
const PRINTER_NAME  =  process.env.PRINTER_NAME         || '';   // '' = system default
const POLL_MS       =  Number(process.env.POLL_INTERVAL_MS) || 5000;

if (!API_KEY)    { console.error('[Config] PRINT_CLIENT_API_KEY is not set. Exiting.'); process.exit(1); }
if (!PRINTER_ID) { console.error('[Config] PRINTER_ID is not set. Exiting.');           process.exit(1); }

const apiHeaders = { 'x-api-key': API_KEY };

// Track jobs we have already picked up so we don't double-process on fast polls
const inFlight = new Set<string>();

// ─── API helpers ─────────────────────────────────────────────────────────────
async function fetchQueue(): Promise<PrintJob[]> {
  const { data } = await axios.get(`${API_URL}/api/print-client/queue`, {
    params:  { printer_id: PRINTER_ID },
    headers: apiHeaders,
  });
  return data.data as PrintJob[];
}

async function updateStatus(id: string, status: JobStatus, error_message?: string): Promise<void> {
  await axios.patch(
    `${API_URL}/api/print-client/jobs/${id}/status`,
    { status, error_message },
    { headers: apiHeaders }
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────
type JobStatus = 'processing' | 'printed' | 'failed';

interface PrintJob {
  id:                  string;
  user_id:             string;
  user_name:           string;
  file_url:            string;
  file_name:           string;
  color_mode:          'bw' | 'color';
  page_size:           'A4' | 'A3';
  copies:              number;
  lamination:          boolean;
  total_pages:         number;
  amount:              string;
  sequence_number?:    string;
  assigned_printer_id: string;
}

// ─── Separator page ───────────────────────────────────────────────────────────
function buildSeparatorPdf(job: PrintJob, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 72 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    const ref   = job.sequence_number ?? job.id.slice(0, 8).toUpperCase();
    const mode  = job.color_mode === 'bw' ? 'Black & White' : 'Full Color';
    const lam   = job.lamination ? '  •  Lamination: YES' : '';

    doc
      .font('Helvetica-Bold')
      .fontSize(32)
      .fillColor('#4F46E5')
      .text('College Corner', { align: 'center' });

    doc
      .moveDown(0.5)
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#6B7280')
      .text('─────────────────────────────────────', { align: 'center' });

    doc
      .moveDown(0.5)
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor('#111827')
      .text(`Order #${ref}`, { align: 'center' });

    doc
      .moveDown(0.4)
      .font('Helvetica')
      .fontSize(13)
      .fillColor('#374151')
      .text(`Customer : ${job.user_name}`, { align: 'center' })
      .text(`File     : ${job.file_name}`, { align: 'center' })
      .text(`Mode     : ${mode}  •  Size: ${job.page_size}  •  Copies: ${job.copies}${lam}`, { align: 'center' });

    doc
      .moveDown(0.8)
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#6B7280')
      .text('─────────────────────────────────────', { align: 'center' })
      .moveDown(0.4)
      .text(`Printed at: ${new Date().toLocaleString()}`, { align: 'center' });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

// ─── File download ────────────────────────────────────────────────────────────
async function downloadFile(url: string, dest: string): Promise<void> {
  // Support both absolute URLs (cloud storage) and relative paths (/uploads/…)
  const resolvedUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
  const response = await axios.get(resolvedUrl, { responseType: 'stream' });
  await new Promise<void>((resolve, reject) => {
    const writer = fs.createWriteStream(dest);
    (response.data as NodeJS.ReadableStream).pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// ─── Job processor ────────────────────────────────────────────────────────────
async function processJob(job: PrintJob): Promise<void> {
  console.log(`[Job ${job.id.slice(0,8)}] ▶ Starting — "${job.file_name}" (${job.color_mode}, ${job.page_size}, ×${job.copies})`);
  await updateStatus(job.id, 'processing');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-print-'));

  try {
    // 1. Separator page
    const sepPath = path.join(tmpDir, 'separator.pdf');
    await buildSeparatorPdf(job, sepPath);

    // 2. Download document
    const ext      = path.extname(job.file_name) || '.pdf';
    const docPath  = path.join(tmpDir, `document${ext}`);
    await downloadFile(job.file_url, docPath);

    // 3. Build print options
    const printerOpt = PRINTER_NAME ? { printer: PRINTER_NAME } : {};

    // 4. Print separator first
    await print(sepPath, printerOpt);

    // 5. Print document — pdf-to-printer handles PDFs natively on Windows
    //    For images the package also delegates to SumatraPDF / shell print
    await print(docPath, {
      ...printerOpt,
      ...(job.copies > 1 ? { copies: job.copies } : {}),
      ...(job.color_mode === 'bw' ? { monochrome: true } : {}),
    });

    await updateStatus(job.id, 'printed');
    console.log(`[Job ${job.id.slice(0,8)}] ✅ Printed successfully`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Job ${job.id.slice(0,8)}] ❌ Failed — ${msg}`);
    await updateStatus(job.id, 'failed', msg).catch(() => { /* swallow update failure */ });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─── Poll loop ────────────────────────────────────────────────────────────────
async function poll(): Promise<void> {
  try {
    const jobs = await fetchQueue();

    for (const job of jobs) {
      if (inFlight.has(job.id)) continue;
      inFlight.add(job.id);
      // process concurrently but don't await — let multiple jobs run in parallel
      processJob(job).catch(console.error);
    }
  } catch (err: unknown) {
    if (err instanceof AxiosError) {
      console.warn(`[Poll] API error ${err.response?.status ?? '?'}: ${err.response?.data?.message ?? err.message}`);
    } else {
      console.warn('[Poll] Unexpected error:', err);
    }
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════╗');
console.log('║   College Corner — Local Print Client v1.0  ║');
console.log('╚══════════════════════════════════════════════╝');
console.log(`  API      : ${API_URL}`);
console.log(`  Printer  : ${PRINTER_NAME || '(system default)'}`);
console.log(`  ID       : ${PRINTER_ID}`);
console.log(`  Interval : ${POLL_MS}ms`);
console.log('');
console.log('[Client] Listening for jobs…');

poll(); // immediate first poll
setInterval(poll, POLL_MS);
