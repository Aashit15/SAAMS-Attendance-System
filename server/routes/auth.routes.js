import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, logout, refreshToken, getMe, updateUser, getUsers } from '../controllers/auth.controller.js';
import protect from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, message: 'Too many attempts, try again later' } });

router.post('/register', authLimiter, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], validate, register);

router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], validate, login);

router.post('/logout', protect, logout);
router.post('/refresh-token', refreshToken);
router.get('/me', protect, getMe);
router.put('/users/:id', protect, updateUser);
router.get('/users', protect, requireRole('admin', 'superadmin'), getUsers);

export default router;
