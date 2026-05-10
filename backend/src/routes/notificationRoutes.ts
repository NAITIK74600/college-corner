import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getNotifications, readAllNotifications, readNotification, streamNotifications } from '../controllers/notificationController';

const router = Router();

// /stream must be declared before /:id to avoid route shadowing
router.get('/stream',     requireAuth, streamNotifications);
router.get('/',           requireAuth, getNotifications);
router.patch('/read-all', requireAuth, readAllNotifications);
router.patch('/:id/read', requireAuth, readNotification);

export default router;
