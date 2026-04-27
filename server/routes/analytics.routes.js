import { Router } from 'express';
import { getCourseAnalytics, getStudentAnalytics, getDepartmentAnalytics, getFaceRegistrationStats } from '../controllers/analytics.controller.js';
import protect from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();
router.use(protect);

router.get('/course/:id', getCourseAnalytics);
router.get('/student/:id', getStudentAnalytics);
router.get('/department/:id', requireRole('admin', 'superadmin'), getDepartmentAnalytics);
router.get('/face-registration-stats', requireRole('admin', 'superadmin'), getFaceRegistrationStats);

export default router;
