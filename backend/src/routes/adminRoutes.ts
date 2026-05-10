import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import {
  adminGetPrintJobs,
  adminUpdatePrintJobStatus,
  adminGetOrders,
  adminUpdateOrderStatus,
  adminGetProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeactivateProduct,
  adminGetUsers,
  adminGetStats,
  adminGetAnalytics,
  adminGetPrinters,
  adminCreatePrinter,
  adminUpdatePrinter,
  adminDeletePrinter,
  adminUploadProductImage,
  uploadProductImage,
  adminExportProducts,
  adminProductTemplate,
  adminImportProducts,
  uploadImportFile,
} from '../controllers/adminController';
import {
  listAdminUsers,
  getAdminUserDetail,
  banUser,
  unbanUser,
  updateUserRole,
} from '../controllers/adminUserController';
import {
  adminGetPrinterQueue,
  adminReassignJob,
} from '../controllers/adminPrintController';
import {
  adminGetSettings,
  adminSaveSettings,
} from '../controllers/adminSettingsController';

const router = Router();

// All admin routes require both auth + admin role
router.use(requireAuth, requireAdmin);

router.get('/stats',                  adminGetStats);
router.get('/analytics',              adminGetAnalytics);
router.get('/users',                  adminGetUsers);

// ─── User Management (detailed) ───────────────────────────────────────────────
router.get('/users/manage',                    listAdminUsers);
router.get('/users/manage/:id',                getAdminUserDetail);
router.post('/users/manage/:id/ban',           banUser);
router.post('/users/manage/:id/unban',         unbanUser);
router.patch('/users/manage/:id/role',         updateUserRole);

router.get('/print-jobs',             adminGetPrintJobs);
router.patch('/print-jobs/:id/status', adminUpdatePrintJobStatus);

router.get('/orders',                 adminGetOrders);
router.patch('/orders/:id/status',    adminUpdateOrderStatus);

router.get('/products/export',        adminExportProducts);
router.get('/products/template',      adminProductTemplate);
router.post('/products/import',       uploadImportFile.single('file'), adminImportProducts);
router.get('/products',               adminGetProducts);
router.post('/products',              adminCreateProduct);
router.patch('/products/:id',         adminUpdateProduct);
router.delete('/products/:id',        adminDeactivateProduct);
router.post('/products/:id/image',    uploadProductImage.single('image'), adminUploadProductImage);

router.get('/printers',               adminGetPrinters);
router.post('/printers',              adminCreatePrinter);
router.patch('/printers/:id',         adminUpdatePrinter);
router.delete('/printers/:id',        adminDeletePrinter);
router.get('/printers/:id/queue',     adminGetPrinterQueue);
router.patch('/print-jobs/:id/reassign', adminReassignJob);

router.get('/settings',               adminGetSettings);
router.post('/settings',              adminSaveSettings);

export default router;
