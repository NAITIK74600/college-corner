import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import {
  validateCoupon,
  adminListCoupons,
  adminCreateCoupon,
  adminToggleCoupon,
  adminDeleteCoupon,
} from '../controllers/couponController';

const router = Router();

// User-facing: validate a coupon before placing order
router.post('/validate', requireAuth, validateCoupon);

// Admin CRUD
router.get('/',          requireAuth, requireAdmin, adminListCoupons);
router.post('/',         requireAuth, requireAdmin, adminCreateCoupon);
router.patch('/:id/toggle', requireAuth, requireAdmin, adminToggleCoupon);
router.delete('/:id',    requireAuth, requireAdmin, adminDeleteCoupon);

export default router;
