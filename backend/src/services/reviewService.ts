import pool from '../config/db';

export interface ReviewRecord {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  created_at: Date;
  user_name: string;   // joined from users
}

export interface ProductRating {
  avg_rating: number | null;
  review_count: number;
}

export async function getProductReviews(productId: string): Promise<ReviewRecord[]> {
  const result = await pool.query<ReviewRecord>(
    `SELECT r.id, r.user_id, r.product_id, r.rating, r.comment, r.created_at,
            u.name AS user_name
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     WHERE r.product_id = $1
     ORDER BY r.created_at DESC
     LIMIT 100`,
    [productId]
  );
  return result.rows;
}

export async function getProductRating(productId: string): Promise<ProductRating> {
  const result = await pool.query<{ avg_rating: string | null; review_count: string }>(
    `SELECT ROUND(AVG(rating)::numeric, 1)::text AS avg_rating,
            COUNT(*)::text AS review_count
     FROM reviews WHERE product_id = $1`,
    [productId]
  );
  const row = result.rows[0];
  return {
    avg_rating: row.avg_rating ? parseFloat(row.avg_rating) : null,
    review_count: parseInt(row.review_count, 10),
  };
}

export async function addReview(
  userId: string,
  productId: string,
  rating: number,
  comment: string | null
): Promise<ReviewRecord> {
  const client = await pool.connect();
  try {
    // Upsert: update comment+rating if review already exists
    const result = await client.query<ReviewRecord>(
      `INSERT INTO reviews (user_id, product_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
       RETURNING id, user_id, product_id, rating, comment, created_at`,
      [userId, productId, rating, comment ?? null]
    );
    const row = result.rows[0];
    // Fetch user name for response
    const userRow = await client.query<{ name: string }>('SELECT name FROM users WHERE id = $1', [userId]);
    return { ...row, user_name: userRow.rows[0]?.name ?? '' };
  } finally {
    client.release();
  }
}

export async function deleteReview(userId: string, reviewId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM reviews WHERE id = $1 AND user_id = $2',
    [reviewId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
