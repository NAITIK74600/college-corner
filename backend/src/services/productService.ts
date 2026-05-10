import pool from '../config/db';

export interface ProductRecord {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: string;           // NUMERIC comes back as string from pg
  stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: Date;
}

export type SortOption = 'default' | 'price_asc' | 'price_desc' | 'rating' | 'newest';

export interface ListProductsOptions {
  category?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
  inStock?: boolean;
}

export async function listProducts(opts: ListProductsOptions = {}): Promise<ProductRecord[]> {
  const params: unknown[] = [true];
  const conditions: string[] = ['p.is_active = $1'];
  let idx = 2;

  if (opts.category && opts.category !== 'All') {
    conditions.push(`p.category = $${idx++}`);
    params.push(opts.category);
  }

  if (opts.q && opts.q.trim()) {
    conditions.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`);
    params.push(`%${opts.q.trim()}%`);
    idx++;
  }

  if (opts.minPrice !== undefined) {
    conditions.push(`p.price >= $${idx++}`);
    params.push(opts.minPrice);
  }

  if (opts.maxPrice !== undefined) {
    conditions.push(`p.price <= $${idx++}`);
    params.push(opts.maxPrice);
  }

  if (opts.inStock) {
    conditions.push('p.stock > 0');
  }

  const SORT_MAP: Record<SortOption, string> = {
    default:    'p.category, p.name',
    price_asc:  'p.price ASC',
    price_desc: 'p.price DESC',
    rating:     'avg_rating DESC NULLS LAST',
    newest:     'p.created_at DESC',
  };
  const orderBy = SORT_MAP[opts.sort ?? 'default'];

  const where = conditions.join(' AND ');
  const sql = `
    SELECT p.id, p.name, p.description, p.category, p.price, p.stock,
           p.image_url, p.is_active, p.created_at,
           ROUND(AVG(r.rating)::numeric, 1)::float AS avg_rating
    FROM products p
    LEFT JOIN reviews r ON r.product_id = p.id
    WHERE ${where}
    GROUP BY p.id
    ORDER BY ${orderBy}
  `;

  const result = await pool.query<ProductRecord & { avg_rating: number | null }>(sql, params);
  return result.rows;
}

export interface ProductDetail extends ProductRecord {
  avg_rating: number | null;
  review_count: number;
}

export async function getProductById(id: string): Promise<ProductDetail | null> {
  const result = await pool.query<ProductDetail>(
    `SELECT p.id, p.name, p.description, p.category, p.price, p.stock,
            p.image_url, p.is_active, p.created_at,
            ROUND(AVG(r.rating)::numeric, 1)::float AS avg_rating,
            COUNT(r.id)::int AS review_count
     FROM products p
     LEFT JOIN reviews r ON r.product_id = p.id
     WHERE p.id = $1
     GROUP BY p.id`,
    [id]
  );
  return result.rows[0] ?? null;
}
