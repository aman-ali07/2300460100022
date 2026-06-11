// Notification shape as returned by the Affordmed API
export interface Notification {
  ID: string;
  Type: 'Event' | 'Result' | 'Placement';
  Message: string;
  Timestamp: string;
}

export type NotificationType = Notification['Type'];
