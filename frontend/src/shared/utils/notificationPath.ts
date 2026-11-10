import type { NotificationItem } from '../types/notification.types';

const DOCUMENT_WRITE_PATH = '/groupware/doc/write';
const MESSAGE_INBOX_PATH = '/groupware/messages';

export function resolvePushNotificationPath(notificationId: unknown): string | null {
  if (typeof notificationId !== 'number'
    || !Number.isSafeInteger(notificationId) || notificationId <= 0) return null;
  return `/groupware/notifications?pushNotificationId=${notificationId}`;
}

export function resolveNotificationPath(item: NotificationItem): string | null {
  if (item.sourceType === 'APPROVAL_COMMENT') {
    return item.targetId === null
      ? null
      : `${DOCUMENT_WRITE_PATH}?approvalId=${item.targetId}`;
  }
  return `${MESSAGE_INBOX_PATH}?messageId=${item.sourceId}`;
}
