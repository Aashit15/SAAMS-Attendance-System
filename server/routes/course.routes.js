import { Router } from 'express';
import { createCourse, getCourses, getCourse, updateCourse, deleteCourse, enrollStudent, unenrollStudent, getCourseStudents } from '../controllers/course.controller.js';
import protect from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();
router.use(protect);

router.post('/', requireRole('admin', 'superadmin'), createCourse);
router.get('/', getCourses);
router.get('/:id', getCourse);
router.put('/:id', requireRole('admin', 'superadmin'), updateCourse);
router.delete('/:id', requireRole('admin', 'superadmin'), deleteCourse);
router.post('/:id/enroll', requireRole('admin', 'superadmin'), enrollStudent);
router.delete('/:id/enroll/:studentId', requireRole('admin', 'superadmin'), unenrollStudent);
router.get('/:id/students', getCourseStudents);

export default router;
