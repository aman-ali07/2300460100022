import { Router } from 'express';
import {
  getNotifications,
  getPriorityNotifications,
  proxyLog,
} from '../controllers/notificationController';

const router = Router();

// priority route must come before catch-all
router.get('/notifications/priority', getPriorityNotifications);
router.get('/notifications', getNotifications);

router.post('/log', proxyLog);

export default router;
