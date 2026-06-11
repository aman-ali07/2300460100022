import { Router } from 'express';
import {
  getNotifications,
  getPriorityNotifications,
  proxyLog,
} from '../controllers/notificationController';

const router = Router();

// Notification routes
router.get('/notifications/priority', getPriorityNotifications); // must be before /notifications/:id
router.get('/notifications', getNotifications);

// Frontend logging proxy
router.post('/log', proxyLog);

export default router;
