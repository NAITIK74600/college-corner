import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { listReviews, createReview, removeReview } from '../controllers/reviewController';

const router = Router({ mergeParams: true }); // inherit :id from productRoutes

router.get('/',                   listReviews);
router.post('/',   requireAuth,   createReview);
router.delete('/:reviewId', requireAuth, removeReview);

export default router;
