import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import {
  createUser,
  findUserByEmail,
  findUserById,
  validatePassword,
  updateUserName,
  changeUserPassword,
} from '../services/authService';

// ─── Validation rule sets ────────────────────────────────────────────────────

export const signupValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Name must be 2–120 characters.'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('A valid email is required.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number.'),
  body('phone')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number.'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

// ─── Helper ──────────────────────────────────────────────────────────────────

function signToken(userId: string, role: string): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ userId, role }, secret, { expiresIn } as jwt.SignOptions);
}

function setCookieAndRespond(
  res: Response,
  token: string,
  user: object,
  statusCode = 200
): void {
  res
    .status(statusCode)
    .cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    })
    .json({ success: true, user });
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 */
export async function signup(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  const { name, email, phone, password } = req.body;

  // Check for duplicate email
  const existing = await findUserByEmail(email);
  if (existing) {
    res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    return;
  }

  const user = await createUser({ name, email, phone, password });
  const token = signToken(user.id, user.role);

  setCookieAndRespond(res, token, user, 201);
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  const { email, password } = req.body;

  const user = await findUserByEmail(email);
  if (!user) {
    // Intentionally vague to prevent email enumeration
    res.status(401).json({ success: false, message: 'Invalid email or password.' });
    return;
  }

  const isValid = await validatePassword(password, user.password);
  if (!isValid) {
    res.status(401).json({ success: false, message: 'Invalid email or password.' });
    return;
  }

  // Strip password from response object
  const { password: _pwd, ...safeUser } = user;
  const token = signToken(safeUser.id, safeUser.role);

  setCookieAndRespond(res, token, safeUser);
}

/**
 * POST /api/auth/logout
 */
export function logout(_req: Request, res: Response): void {
  res
    .clearCookie('token', { httpOnly: true, sameSite: 'lax' })
    .json({ success: true, message: 'Logged out successfully.' });
}

/**
 * GET /api/auth/me  (protected)
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await findUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }
  res.json({ success: true, user });
}

export const updateProfileValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Name must be 2–120 characters.'),
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters.')
    .matches(/[A-Z]/)
    .withMessage('Must contain at least one uppercase letter.')
    .matches(/[0-9]/)
    .withMessage('Must contain at least one number.'),
];

/**
 * PATCH /api/auth/profile  (protected)
 * Body: { name }
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }
  try {
    const user = await updateUserName(req.user!.userId, req.body.name);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PATCH /api/auth/password  (protected)
 * Body: { currentPassword, newPassword }
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }
  try {
    await changeUserPassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);
    // Clear session so user must log in with the new password
    res
      .clearCookie('token', { httpOnly: true, sameSite: 'lax' })
      .json({ success: true, message: 'Password updated. Please log in again.' });
  } catch (err: any) {
    if (err.code === 'WRONG_PASSWORD') {
      res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    } else {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
