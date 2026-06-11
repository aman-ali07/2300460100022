import { Notification, NotificationQuery } from '../types';
import { getToken } from './authService';
import { Log } from '../utils/logger';

const NOTIFICATIONS_URL = 'http://4.224.186.213/evaluation-service/notifications';

export async function fetchNotifications(
  query: NotificationQuery = {}
): Promise<Notification[]> {
  await Log('backend', 'info', 'service', `fetchNotifications: ${JSON.stringify(query)}`);

  const authToken = await getToken();

  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.notification_type) params.set('notification_type', query.notification_type);

  const qs = params.toString();
  const url = qs ? `${NOTIFICATIONS_URL}?${qs}` : NOTIFICATIONS_URL;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (!response.ok) {
    await Log('backend', 'error', 'service', `Affordmed API returned ${response.status}`);
    throw new Error(`fetchNotifications failed: ${response.status}`);
  }

  const { notifications } = await response.json() as { notifications: Notification[] };

  await Log('backend', 'info', 'service', `Fetched ${notifications?.length ?? 0} notifications`);
  return notifications ?? [];
}
