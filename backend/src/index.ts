import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes    from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import printRoutes   from './routes/printRoutes';
import orderRoutes   from './routes/orderRoutes';
import adminRoutes        from './routes/adminRoutes';
import walletRoutes       from './routes/walletRoutes';
import printClientRoutes  from './routes/printClientRoutes';
import notificationRoutes from './routes/notificationRoutes';
import wishlistRoutes     from './routes/wishlistRoutes';
import couponRoutes       from './routes/couponRoutes';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
// FRONTEND_URL can be comma-separated for multiple origins (e.g. Vercel + localhost)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/print',    printRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/wallet',       walletRoutes);
app.use('/api/print-client', printClientRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/wishlist',      wishlistRoutes);
app.use('/api/coupons',       couponRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 fallback ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[SERVER] College Corner API running on http://localhost:${PORT}`);
});

export default app;
