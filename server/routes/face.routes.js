import { Router } from 'express';
import { registerFace, getFaceStatus, deleteFaceData, reEnrollFace, faceReenrollWithToken, getAllFaceStatus } from '../controllers/face.controller.js';
import protect from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const faceLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { success: false, message: 'Too many face recognition attempts' } });

// Student face registration (no auth needed — they just registered)
router.post('/register/face', faceLimiter, registerFace);

// Re-enrollment via token (no auth needed — accessed via email link)
router.post('/face-reenroll/:token', faceLimiter, faceReenrollWithToken);

// Admin face management
router.get('/students/face-status', protect, requireRole('admin', 'superadmin'), getAllFaceStatus);
router.get('/users/:id/face-status', protect, requireRole('admin', 'superadmin'), getFaceStatus);
router.delete('/users/:id/face', protect, requireRole('admin', 'superadmin'), deleteFaceData);
router.post('/users/:id/re-enroll-face', protect, requireRole('admin', 'superadmin'), reEnrollFace);

export default router;
