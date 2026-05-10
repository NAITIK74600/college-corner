import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import {
  placeOrder,
  verifyPayment,
  getOrders,
  getOrderById,
  approveOrder,
} from '../controllers/orderController';

const router = Router();

router.post('/',                requireAuth,              placeOrder);
router.post('/verify-payment',  requireAuth,              verifyPayment);
router.get('/',                 requireAuth,              getOrders);
router.get('/:id',              requireAuth,              getOrderById);
router.patch('/:id/approve',    requireAuth, requireAdmin, approveOrder);

export default router;
