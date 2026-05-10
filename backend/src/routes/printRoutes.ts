import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { uploadSingle } from '../middleware/uploadMiddleware';
import {
  submitPrintJob,
  getUserPrintJobs,
  getPricing,
  getPrintJobDetail,
  getQueuePosition,
  getPrinterStatus,
} from '../controllers/printController';
import {
  adminListPrintJobs,
  adminUpdateJobStatus,
  adminGetPrinterQueue,
  adminReassignJob,
} from '../controllers/adminPrintController';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/pricing', getPricing);

// ─── User (requires auth) ─────────────────────────────────────────────────────
router.post('/jobs',                 requireAuth, uploadSingle, submitPrintJob);
router.get('/jobs',                  requireAuth, getUserPrintJobs);
router.get('/jobs/:id',              requireAuth, getPrintJobDetail);
router.get('/jobs/:id/queue-position', requireAuth, getQueuePosition);
router.get('/printers/status',       requireAuth, getPrinterStatus);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin/jobs',                          requireAdmin, adminListPrintJobs);
router.patch('/admin/jobs/:id/status',             requireAdmin, adminUpdateJobStatus);
router.get('/admin/printers/:printerId/queue',     requireAdmin, adminGetPrinterQueue);
router.patch('/admin/jobs/:id/reassign',           requireAdmin, adminReassignJob);

export default router;
