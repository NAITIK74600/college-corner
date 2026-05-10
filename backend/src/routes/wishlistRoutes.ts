import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getWishlistIds,
} from '../controllers/wishlistController';

const router = Router();

router.get('/',             requireAuth, getWishlist);
router.get('/ids',          requireAuth, getWishlistIds);
router.post('/:productId',  requireAuth, addToWishlist);
router.delete('/:productId', requireAuth, removeFromWishlist);

export default router;
