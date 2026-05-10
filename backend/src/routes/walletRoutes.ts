import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  walletGetBalance,
  walletGetHistory,
  walletInitTopUp,
  walletVerifyTopUp,
} from '../controllers/walletController';

const router = Router();

router.use(requireAuth);

router.get('/balance',        walletGetBalance);
router.get('/history',        walletGetHistory);
router.post('/topup/init',    walletInitTopUp);
router.post('/topup/verify',  walletVerifyTopUp);

export default router;
