import { Request, Response } from 'express';
import { fetchNotifications } from '../services/notificationService';
import { getTopN } from '../utils/priority';
import { Log } from '../utils/logger';

export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    await Log('backend', 'info', 'controller', 'GET /api/notifications');

    const { limit, page, notification_type } = req.query;

    const notifications = await fetchNotifications({
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
      notification_type: notification_type as string | undefined,
    });

    res.json({ notifications });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await Log('backend', 'error', 'controller', message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

export async function getPriorityNotifications(req: Request, res: Response): Promise<void> {
  try {
    const n = req.query.n ? Number(req.query.n) : 10;
    const notification_type = req.query.notification_type as string | undefined;

    await Log('backend', 'info', 'controller', `GET /api/notifications/priority n=${n}`);

    // Pull a larger batch so the true top-N survives type filtering
    const allNotifications = await fetchNotifications({ limit: 100, notification_type });
    const topNotifications = getTopN(allNotifications, n);

    res.json({ notifications: topNotifications, total: topNotifications.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await Log('backend', 'error', 'controller', message);
    res.status(500).json({ error: 'Failed to fetch priority notifications' });
  }
}

// Frontend logs come here and we forward them with our server-side token
export async function proxyLog(req: Request, res: Response): Promise<void> {
  try {
    const { stack, level, package: pkg, message } = req.body;
    await Log(stack, level, pkg, message);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Log proxy failed' });
  }
}
