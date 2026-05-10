import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  getProductReviews,
  addReview,
  deleteReview,
} from '../services/reviewService';

/** GET /api/products/:id/reviews  (public) */
export async function listReviews(req: Request, res: Response): Promise<void> {
  try {
    const reviews = await getProductReviews(req.params['id'] as string);
    res.json({ success: true, data: reviews });
  } catch (err) {
    console.error('[Reviews] listReviews error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
}

/** POST /api/products/:id/reviews  (auth required) */
export async function createReview(req: AuthRequest, res: Response): Promise<void> {
  const { rating, comment } = req.body as { rating: unknown; comment?: unknown };

  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    res.status(400).json({ success: false, message: 'Rating must be an integer 1–5.' });
    return;
  }

  try {
    const review = await addReview(
      req.userId!,
      req.params['id'] as string,
      ratingNum,
      typeof comment === 'string' && comment.trim() ? comment.trim() : null
    );
    res.status(201).json({ success: true, data: review });
  } catch (err: any) {
    console.error('[Reviews] createReview error:', err);
    res.status(500).json({ success: false, message: 'Failed to save review.' });
  }
}

/** DELETE /api/products/:id/reviews/:reviewId  (auth required, own review only) */
export async function removeReview(req: AuthRequest, res: Response): Promise<void> {
  try {
    const deleted = await deleteReview(req.userId!, req.params['reviewId'] as string);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Review not found or not yours.' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[Reviews] removeReview error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete review.' });
  }
}
