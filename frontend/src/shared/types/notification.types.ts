export type NotificationEventType =
  | 'APPROVAL_COMMENT_MENTION'
  | 'DIRECT_MESSAGE_RECEIVED';

export type NotificationSourceType = 'APPROVAL_COMMENT' | 'DIRECT_MESSAGE';

export interface NotificationItem {
  notificationId: number;
  eventType: NotificationEventType;
  sourceType: NotificationSourceType;
  sourceId: number;
  targetId: number | null;
  title: string;
  summary: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPage {
  resultList: NotificationItem[];
  hasNext: boolean;
  nextBeforeNotificationId: number | null;
}

export interface NotificationPageQuery {
  limit?: number;
  beforeNotificationId?: number;
  unreadOnly?: boolean;
  eventType?: NotificationEventType;
}

export interface NotificationSummary {
  unreadCount: number;
}
