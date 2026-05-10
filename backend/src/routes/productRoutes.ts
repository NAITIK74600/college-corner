import { Router } from 'express';
import { getProducts, getProduct } from '../controllers/productController';
import reviewRoutes from './reviewRoutes';

const router = Router();

// Public — no auth required for browsing
router.get('/',    getProducts);
router.get('/:id', getProduct);

// Reviews nested under product
router.use('/:id/reviews', reviewRoutes);

export default router;
