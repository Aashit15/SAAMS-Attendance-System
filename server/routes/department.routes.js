import { Router } from 'express';
import { createDepartment, getDepartments, getDepartment, updateDepartment, deleteDepartment } from '../controllers/department.controller.js';
import protect from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();
router.use(protect);

router.post('/', requireRole('admin', 'superadmin'), createDepartment);
router.get('/', getDepartments);
router.get('/:id', getDepartment);
router.put('/:id', requireRole('admin', 'superadmin'), updateDepartment);
router.delete('/:id', requireRole('admin', 'superadmin'), deleteDepartment);

export default router;
