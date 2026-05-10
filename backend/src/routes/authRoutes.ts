import { Router } from 'express';
import {
  signup,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  signupValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/signup',   signupValidation,          signup);
router.post('/login',    loginValidation,            login);
router.post('/logout',   logout);
router.get('/me',        authenticate,              getMe);
router.patch('/profile', authenticate, updateProfileValidation,  updateProfile);
router.patch('/password',authenticate, changePasswordValidation, changePassword);

export default router;
