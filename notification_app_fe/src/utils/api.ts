import { Notification } from '@/types/notification';
import { Log } from './logger';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export interface FetchParams {
  limit?: number;
  page?: number;
  notification_type?: string;
}

export async function fetchNotifications(params: FetchParams = {}): Promise<Notification[]> {
  await Log('frontend', 'info', 'api', `fetchNotifications: ${JSON.stringify(params)}`);

  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.notification_type) query.set('notification_type', params.notification_type);

  const qs = query.toString();
  const url = `${BACKEND_URL}/api/notifications${qs ? `?${qs}` : ''}`;

  const response = await fetch(url);

  if (!response.ok) {
    await Log('frontend', 'error', 'api', `fetchNotifications failed: ${response.status}`);
    throw new Error(`Failed to fetch notifications: ${response.status}`);
  }

  const { notifications } = await response.json() as { notifications: Notification[] };
  return notifications ?? [];
}

export async function fetchPriorityNotifications(
  n: number = 10,
  notification_type?: string
): Promise<Notification[]> {
  await Log('frontend', 'info', 'api', `fetchPriorityNotifications: n=${n}, type=${notification_type}`);

  const query = new URLSearchParams({ n: String(n) });
  if (notification_type) query.set('notification_type', notification_type);

  const response = await fetch(`${BACKEND_URL}/api/notifications/priority?${query}`);

  if (!response.ok) {
    await Log('frontend', 'error', 'api', `fetchPriorityNotifications failed: ${response.status}`);
    throw new Error(`Failed to fetch priority notifications: ${response.status}`);
  }

  const { notifications } = await response.json() as { notifications: Notification[] };
  return notifications ?? [];
}
