import { Router } from 'express';
import { createSession, getSessions, getSession, updateSession, deleteSession, regenerateQR, manualMark } from '../controllers/session.controller.js';
import { facialRecognize } from '../controllers/attendance.controller.js';
import protect from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();

router.use(protect);

router.post('/', requireRole('faculty', 'admin', 'superadmin'), createSession);
router.get('/', getSessions);
router.get('/:id', getSession);
router.put('/:id', requireRole('faculty', 'admin', 'superadmin'), updateSession);
router.delete('/:id', requireRole('faculty', 'admin', 'superadmin'), deleteSession);
router.get('/:id/qr', requireRole('faculty', 'admin', 'superadmin'), regenerateQR);
router.post('/:id/manual-mark', requireRole('faculty', 'admin', 'superadmin'), manualMark);
router.post('/:id/facial-recognize', requireRole('faculty', 'admin', 'superadmin'), facialRecognize);

export default router;
