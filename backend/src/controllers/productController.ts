import { Request, Response } from 'express';
import { listProducts, getProductById, SortOption } from '../services/productService';

const VALID_SORTS: SortOption[] = ['default', 'price_asc', 'price_desc', 'rating', 'newest'];

/**
 * GET /api/products
 * Query params: category, q, minPrice, maxPrice, sort, inStock
 */
export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const q        = typeof req.query.q        === 'string' ? req.query.q        : undefined;

    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
    const inStock  = req.query.inStock === 'true';
    const sortRaw  = req.query.sort as string | undefined;
    const sort     = (VALID_SORTS.includes(sortRaw as SortOption) ? sortRaw : 'default') as SortOption;

    const products = await listProducts({ category, q, minPrice, maxPrice, sort, inStock });
    res.json({ success: true, data: products });
  } catch (err) {
    console.error('[Products] getProducts error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
}

/**
 * GET /api/products/:id
 */
export async function getProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await getProductById(req.params.id as string);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }
    res.json({ success: true, data: product });
  } catch (err) {
    console.error('[Products] getProduct error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch product.' });
  }
}
