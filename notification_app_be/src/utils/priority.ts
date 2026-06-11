import { Notification } from '../types';

const TYPE_WEIGHT: Record<string, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

// score = importance × recency. Older and less important both decay toward 0.
function getPriorityScore(notification: Notification): number {
  const weight = TYPE_WEIGHT[notification.Type] ?? 1;
  const ageInHours = (Date.now() - new Date(notification.Timestamp).getTime()) / 3_600_000;
  return weight / (ageInHours + 1);
}

export function getTopN(notifications: Notification[], n: number): Notification[] {
  return [...notifications]
    .sort((a, b) => getPriorityScore(b) - getPriorityScore(a))
    .slice(0, n);
}

// Keeps top-N current as notifications stream in.
// Array sort beats a heap here because N≤20, so the constant factors dominate.
export class PriorityInbox {
  private topNotifications: (Notification & { score: number })[] = [];
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  add(notification: Notification): void {
    const scored = { ...notification, score: getPriorityScore(notification) };

    if (this.topNotifications.length < this.capacity) {
      this.topNotifications.push(scored);
    } else {
      const weakestScore = this.topNotifications[this.topNotifications.length - 1].score;
      if (scored.score <= weakestScore) return;
      this.topNotifications[this.topNotifications.length - 1] = scored;
    }

    this.topNotifications.sort((a, b) => b.score - a.score);
  }

  getTop(): Notification[] {
    return this.topNotifications.map(({ score, ...notification }) => notification as Notification);
  }
}
