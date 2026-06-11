// Frontend priority scoring utility (mirrors backend logic)
import { Notification } from '@/types/notification';

const TYPE_WEIGHT: Record<string, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

export function getPriorityScore(notification: Notification): number {
  const weight = TYPE_WEIGHT[notification.Type] ?? 1;
  const ageInHours =
    (Date.now() - new Date(notification.Timestamp).getTime()) / (1000 * 60 * 60);
  return weight / (ageInHours + 1);
}

export function sortByPriority(notifications: Notification[]): Notification[] {
  return [...notifications].sort(
    (a, b) => getPriorityScore(b) - getPriorityScore(a)
  );
}
