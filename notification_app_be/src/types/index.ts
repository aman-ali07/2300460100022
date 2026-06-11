// Shared types used across backend

export interface Notification {
  ID: string;
  Type: 'Event' | 'Result' | 'Placement';
  Message: string;
  Timestamp: string;
}

export interface NotificationQuery {
  limit?: number;
  page?: number;
  notification_type?: 'Event' | 'Result' | 'Placement' | string;
}
