import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { AuthRequest } from '../middleware/authMiddleware';
import { listAllPrintJobs, updatePrintJobStatus } from '../services/printService';
import { listAllOrders, updateOrderStatus, OrderStatus } from '../services/orderService';
import { sendStatusUpdate } from '../services/emailService';
import { createNotification } from '../services/notificationService';
import { listPrinters, createPrinter, updatePrinter, deletePrinter, Printer } from '../services/printerService';
import pool from '../config/db';

// ─── Multer setup for product images ─────────────────────────────────────────
const PRODUCT_IMG_DIR = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(PRODUCT_IMG_DIR)) fs.mkdirSync(PRODUCT_IMG_DIR, { recursive: true });

const productImgStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PRODUCT_IMG_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});
const productImgFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ok = /^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype);
  ok ? cb(null, true) : cb(new Error('Only image files (jpg, png, webp, gif, avif) are allowed'));
};
export const uploadProductImage = multer({ storage: productImgStorage, fileFilter: productImgFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Multer setup for CSV/Excel import ───────────────────────────────────────
const IMPORT_TMP_DIR = path.join(__dirname, '../../uploads/tmp');
if (!fs.existsSync(IMPORT_TMP_DIR)) fs.mkdirSync(IMPORT_TMP_DIR, { recursive: true });

const importStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, IMPORT_TMP_DIR),
  filename: (_req, _file, cb) => cb(null, `import-${Date.now()}.tmp`),
});
const importFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ok = /\.(csv|xlsx|xls)$/i.test(file.originalname);
  ok ? cb(null, true) : cb(new Error('Only .csv, .xlsx, .xls files are allowed'));
};
export const uploadImportFile = multer({ storage: importStorage, fileFilter: importFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Print Job Admin ──────────────────────────────────────────────────────────

// GET /api/admin/print-jobs
export async function adminGetPrintJobs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const jobs = await listAllPrintJobs();
    res.json({ success: true, data: jobs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/admin/print-jobs/:id/status
export async function adminUpdatePrintJobStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status, errorMessage } = req.body as { status: string; errorMessage?: string };
    const valid = ['pending', 'paid', 'processing', 'printed', 'ready', 'failed'];
    if (!valid.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
      return;
    }
    const job = await updatePrintJobStatus(req.params['id'] as string, status, errorMessage);
    res.json({ success: true, data: job });

    // Notify user of print job status change
    const printMsgs: Partial<Record<string, { title: string; body: string }>> = {
      processing: { title: 'Print job started',   body: `Your print job is now being processed.` },
      printed:    { title: 'Print job printed',   body: `Your document has been printed and will be ready soon.` },
      ready:      { title: 'Print job ready! 🎉', body: `Your print job is ready for pickup.` },
      failed:     { title: 'Print job failed',    body: `There was a problem printing your document.` },
    };
    const msg = printMsgs[status];
    if (msg) {
      createNotification(job.user_id, 'print_status', msg.title, msg.body, '/dashboard').catch(() => {});
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Orders Admin ────────────────────────────────────────────────────────────

// GET /api/admin/orders
export async function adminGetOrders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orders = await listAllOrders();
    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/admin/orders/:id/status
export async function adminUpdateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status } = req.body as { status: unknown };
    const validStatuses: OrderStatus[] = ['placed', 'processing', 'dispatched', 'delivered', 'cancelled'];
    if (typeof status !== 'string' || !validStatuses.includes(status as OrderStatus)) {
      res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      return;
    }
    const order = await updateOrderStatus(req.params['id'] as string, status as OrderStatus);
    res.json({ success: true, data: order });

    // Fire-and-forget status update email (non-blocking)
    sendStatusUpdate(order.user_id, order.sequence_number, status).catch(() => {});

    // Notify user via in-app notifications
    const orderMsgs: Partial<Record<string, { title: string; body: string }>> = {
      processing:  { title: 'Order is being prepared', body: `Order #${order.sequence_number} is now being processed.` },
      dispatched:  { title: 'Order dispatched! 🚚',    body: `Order #${order.sequence_number} is on its way to you.` },
      delivered:   { title: 'Order delivered! 🎉',     body: `Order #${order.sequence_number} has been delivered.` },
      cancelled:   { title: 'Order cancelled',         body: `Order #${order.sequence_number} has been cancelled.` },
    };
    const orderMsg = orderMsgs[status];
    if (orderMsg) {
      createNotification(order.user_id, 'order_status', orderMsg.title, orderMsg.body, `/dashboard/orders/${order.id}`).catch(() => {});
    }
  } catch (err: any) {
    res.status(err.message === 'Order not found' ? 404 : 500).json({ error: err.message });
  }
}

// ─── Products Admin ───────────────────────────────────────────────────────────

// GET /api/admin/products  (includes inactive)
export async function adminGetProducts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT id, name, description, category, price, stock, image_url, is_active, created_at
       FROM products ORDER BY category, name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/admin/products
export async function adminCreateProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, description, category, price, stock, image_url } = req.body;
    if (!name || !category || price === undefined) {
      res.status(400).json({ error: 'name, category, and price are required' });
      return;
    }
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO products (id, name, description, category, price, stock, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, name, description ?? null, category, price, stock ?? 0, image_url ?? null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/admin/products/:id
export async function adminUpdateProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, description, category, price, stock, image_url, is_active } = req.body;
    const result = await pool.query(
      `UPDATE products SET
         name        = COALESCE($2, name),
         description = COALESCE($3, description),
         category    = COALESCE($4, category),
         price       = COALESCE($5, price),
         stock       = COALESCE($6, stock),
         image_url   = COALESCE($7, image_url),
         is_active   = COALESCE($8, is_active),
         updated_at  = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params['id'] as string, name, description, category, price, stock, image_url, is_active]
    );
    if (!result.rowCount) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE (soft) /api/admin/products/:id  — sets is_active = false
export async function adminDeactivateProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, name`,
      [req.params['id'] as string]
    );
    if (!result.rowCount) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json({ success: true, message: `${result.rows[0].name} deactivated` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Users Admin ─────────────────────────────────────────────────────────────

// GET /api/admin/users
export async function adminGetUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, wallet, created_at FROM users ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Stats ───────────────────────────────────────────────────────────────────

// GET /api/admin/stats
export async function adminGetStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [ordersRes, printRes, productsRes, usersRes, revenueRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE payment_status='pending') as pending,
                         COUNT(*) FILTER (WHERE payment_status='paid') as paid FROM orders`),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='pending') as pending,
                         COUNT(*) FILTER (WHERE status='ready') as ready FROM print_jobs`),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active) as active FROM products`),
      pool.query(`SELECT COUNT(*) as total FROM users`),
      pool.query(`SELECT COALESCE(SUM(total),0) as total_revenue FROM orders WHERE payment_status='paid'`),
    ]);
    res.json({
      orders:   ordersRes.rows[0],
      print:    printRes.rows[0],
      products: productsRes.rows[0],
      users:    usersRes.rows[0],
      revenue:  revenueRes.rows[0],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/admin/analytics  — time-series + breakdown data
export async function adminGetAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const days = Math.min(Number(req.query.days) || 30, 90);

    const [dailyOrders, dailyRevenue, statusBreakdown, topProducts] = await Promise.all([
      // Orders per day for last N days
      pool.query(
        `SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'DD Mon') AS day,
                DATE_TRUNC('day', created_at) AS raw_day,
                COUNT(*)::int AS orders
         FROM orders
         WHERE created_at >= NOW() - INTERVAL '1 day' * $1
         GROUP BY raw_day, day
         ORDER BY raw_day ASC`,
        [days]
      ),
      // Revenue per day for paid orders
      pool.query(
        `SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'DD Mon') AS day,
                DATE_TRUNC('day', created_at) AS raw_day,
                COALESCE(SUM(total),0)::float AS revenue
         FROM orders
         WHERE payment_status = 'paid'
           AND created_at >= NOW() - INTERVAL '1 day' * $1
         GROUP BY raw_day, day
         ORDER BY raw_day ASC`,
        [days]
      ),
      // Order status breakdown
      pool.query(
        `SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status ORDER BY count DESC`
      ),
      // Top 5 products by revenue (from order_items joined to products)
      pool.query(
        `SELECT p.name, COALESCE(SUM(oi.quantity * oi.unit_price), 0)::float AS revenue,
                SUM(oi.quantity)::int AS units
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.product_id IS NOT NULL
         GROUP BY p.name
         ORDER BY revenue DESC
         LIMIT 5`
      ),
    ]);

    res.json({
      dailyOrders:    dailyOrders.rows,
      dailyRevenue:   dailyRevenue.rows,
      statusBreakdown: statusBreakdown.rows,
      topProducts:    topProducts.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Printers Admin ───────────────────────────────────────────────────────────

// GET /api/admin/printers
export async function adminGetPrinters(req: AuthRequest, res: Response): Promise<void> {
  try {
    const printers = await listPrinters();
    res.json({ success: true, data: printers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/admin/printers
export async function adminCreatePrinter(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, capabilities, location } = req.body as { name?: string; capabilities?: string; location?: string };
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'name is required' }); return;
    }
    const validCaps = ['bw', 'color', 'both'];
    if (!capabilities || !validCaps.includes(capabilities)) {
      res.status(400).json({ error: `capabilities must be one of: ${validCaps.join(', ')}` }); return;
    }
    const printer = await createPrinter(name.trim(), capabilities as Printer['capabilities'], location?.trim());
    res.status(201).json({ success: true, data: printer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/admin/printers/:id
export async function adminUpdatePrinter(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, capabilities, status, location, notes } = req.body as Partial<Pick<Printer, 'name' | 'capabilities' | 'status' | 'location' | 'notes'>>;
    const validCaps   = ['bw', 'color', 'both'];
    const validStatus = ['active', 'inactive', 'error', 'maintenance'];
    if (capabilities && !validCaps.includes(capabilities)) {
      res.status(400).json({ error: `capabilities must be one of: ${validCaps.join(', ')}` }); return;
    }
    if (status && !validStatus.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${validStatus.join(', ')}` }); return;
    }
    const printer = await updatePrinter(req.params['id'] as string, { name, capabilities, status, location, notes });
    res.json({ success: true, data: printer });
  } catch (err: any) {
    res.status(err.message === 'Printer not found' ? 404 : 500).json({ error: err.message });
  }
}

// DELETE /api/admin/printers/:id
export async function adminDeletePrinter(req: AuthRequest, res: Response): Promise<void> {
  try {
    await deletePrinter(req.params['id'] as string);
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.message === 'Printer not found' ? 404 : 500).json({ error: err.message });
  }
}

// ─── Product Image Upload ─────────────────────────────────────────────────────
// POST /api/admin/products/:id/image  (multipart: field "image")
export async function adminUploadProductImage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No image file provided' }); return; }

    const imageUrl = `/uploads/products/${file.filename}`;
    const result = await pool.query(
      `UPDATE products SET image_url = $2, updated_at = NOW() WHERE id = $1 RETURNING id, name, image_url`,
      [req.params['id'], imageUrl]
    );
    if (!result.rowCount) {
      fs.unlink(file.path, () => {});
      res.status(404).json({ error: 'Product not found' }); return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Product Export ────────────────────────────────────────────────────────────
// GET /api/admin/products/export?format=xlsx|csv
export async function adminExportProducts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const fmt = (req.query.format as string || 'xlsx').toLowerCase();
    const result = await pool.query(
      `SELECT name, description, category, price, stock, image_url, is_active
       FROM products ORDER BY category, name`
    );
    const rows = result.rows.map(r => ({
      name:        r.name,
      description: r.description ?? '',
      category:    r.category,
      price:       parseFloat(r.price),
      stock:       r.stock,
      image_url:   r.image_url ?? '',
      is_active:   r.is_active ? 'yes' : 'no',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');

    if (fmt === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
      res.send(csv);
    } else {
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="products.xlsx"');
      res.send(buf);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Product Import Template ──────────────────────────────────────────────────
// GET /api/admin/products/template?format=xlsx|csv
export async function adminProductTemplate(req: AuthRequest, res: Response): Promise<void> {
  const fmt = (req.query.format as string || 'xlsx').toLowerCase();
  const sample = [
    { name: 'Ballpoint Pen (Blue)', description: '1.0mm tip, smooth write', category: 'Stationery', price: 10, stock: 100, image_url: '', is_active: 'yes' },
    { name: 'USB-C Cable 1m',       description: '3A fast charge',          category: 'Tech',        price: 149, stock: 50,  image_url: '', is_active: 'yes' },
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');

  if (fmt === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products_template.csv"');
    res.send(csv);
  } else {
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="products_template.xlsx"');
    res.send(buf);
  }
}

// ─── Product Import ───────────────────────────────────────────────────────────
// POST /api/admin/products/import  (multipart: field "file")
export async function adminImportProducts(req: AuthRequest, res: Response): Promise<void> {
  const tmpPath = (req.file as Express.Multer.File | undefined)?.path;
  try {
    if (!tmpPath) { res.status(400).json({ error: 'No file uploaded' }); return; }

    const wb = XLSX.readFile(tmpPath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (rows.length === 0) { res.status(400).json({ error: 'File is empty or has no data rows' }); return; }

    const VALID_CATS = ['Stationery', 'Tech', 'Lab Supplies', 'Snacks', 'Print Media'];
    const created: string[] = [];
    const updated: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed, row 1 is header
      const name = String(row.name ?? '').trim();
      const category = String(row.category ?? '').trim();
      const price = parseFloat(String(row.price ?? ''));
      const stock = parseInt(String(row.stock ?? '0'), 10);
      const description = String(row.description ?? '').trim() || null;
      const imageUrl = String(row.image_url ?? '').trim() || null;
      const isActiveRaw = String(row.is_active ?? 'yes').trim().toLowerCase();
      const isActive = isActiveRaw !== 'no' && isActiveRaw !== 'false' && isActiveRaw !== '0';

      if (!name)                         { errors.push(`Row ${rowNum}: name is required`); continue; }
      if (!VALID_CATS.includes(category)){ errors.push(`Row ${rowNum}: category "${category}" invalid (${VALID_CATS.join(', ')})`); continue; }
      if (isNaN(price) || price < 0)     { errors.push(`Row ${rowNum}: price must be a non-negative number`); continue; }

      // Upsert by exact name+category match
      const existing = await pool.query(
        `SELECT id FROM products WHERE LOWER(name) = LOWER($1) AND category = $2 LIMIT 1`,
        [name, category]
      );
      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE products SET description=$1, price=$2, stock=$3, image_url=COALESCE($4, image_url), is_active=$5, updated_at=NOW() WHERE id=$6`,
          [description, price, isNaN(stock) ? 0 : stock, imageUrl, isActive, existing.rows[0].id]
        );
        updated.push(name);
      } else {
        await pool.query(
          `INSERT INTO products (id,name,description,category,price,stock,image_url,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
          [uuidv4(), name, description, category, price, isNaN(stock) ? 0 : stock, imageUrl, isActive]
        );
        created.push(name);
      }
    }

    res.json({ success: true, created: created.length, updated: updated.length, errors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    if (tmpPath) fs.unlink(tmpPath, () => {});
  }
}
