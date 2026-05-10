import bcrypt from 'bcryptjs';
import pool from '../config/db';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_verified: boolean;
  wallet: string;
  created_at: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

const SALT_ROUNDS = 12;

/**
 * Creates a new user after hashing their password.
 * Throws if the email already exists.
 */
export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const { name, email, phone, password } = input;

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query<UserRecord>(
    `INSERT INTO users (name, email, phone, password)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, phone, role, is_verified, wallet, created_at`,
    [name, email.toLowerCase().trim(), phone ?? null, hashedPassword]
  );

  return result.rows[0];
}

/**
 * Finds a user by email. Returns null if not found.
 * Includes password hash — only use internally.
 */
export async function findUserByEmail(
  email: string
): Promise<(UserRecord & { password: string }) | null> {
  const result = await pool.query<UserRecord & { password: string }>(
    `SELECT id, name, email, phone, role, is_verified, wallet, created_at, password
     FROM users WHERE email = $1 LIMIT 1`,
    [email.toLowerCase().trim()]
  );

  return result.rows[0] ?? null;
}

/**
 * Finds a user by ID. Returns null if not found.
 */
export async function findUserById(id: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    `SELECT id, name, email, phone, role, is_verified, wallet, created_at
     FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0] ?? null;
}

/**
 * Validates a plaintext password against a stored bcrypt hash.
 */
export async function validatePassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/**
 * Updates a user's display name. Returns the updated user row.
 */
export async function updateUserName(id: string, name: string): Promise<UserRecord> {
  const result = await pool.query<UserRecord>(
    `UPDATE users SET name = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, email, phone, role, is_verified, wallet, created_at`,
    [id, name.trim()]
  );
  if (!result.rowCount) throw new Error('User not found');
  return result.rows[0];
}

/**
 * Changes a user's password after verifying their current password.
 * Throws if the current password is wrong.
 */
export async function changeUserPassword(
  id: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Fetch stored hash
  const result = await pool.query<{ password: string }>(
    `SELECT password FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!result.rowCount) throw new Error('User not found');

  const valid = await bcrypt.compare(currentPassword, result.rows[0].password);
  if (!valid) throw Object.assign(new Error('Current password is incorrect'), { code: 'WRONG_PASSWORD' });

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.query(`UPDATE users SET password = $2, updated_at = NOW() WHERE id = $1`, [id, hash]);
}
