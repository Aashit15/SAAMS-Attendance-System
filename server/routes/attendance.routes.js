import { Router } from 'express';
import { markQR, markFace, getSessionAttendance, getStudentAttendance, getCourseAttendance } from '../controllers/attendance.controller.js';
import protect from '../middleware/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const faceLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { success: false, message: 'Too many face recognition attempts' } });

router.use(protect);

router.post('/mark-qr', markQR);
router.post('/mark-face', faceLimiter, markFace);
router.get('/session/:id', getSessionAttendance);
router.get('/student/:id', getStudentAttendance);
router.get('/course/:id', getCourseAttendance);

export default router;
