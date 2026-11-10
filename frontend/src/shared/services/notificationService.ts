import { apiGet, apiPut } from './apiClient';
import type {
  NotificationItem,
  NotificationPage,
  NotificationPageQuery,
  NotificationSummary,
} from '../types/notification.types';

const API_PATH = '/api/v1/groupware/notifications';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNotificationItem(value: unknown): value is NotificationItem {
  if (!isObject(value)) return false;
  const allowedPair =
    (value.eventType === 'APPROVAL_COMMENT_MENTION'
      && value.sourceType === 'APPROVAL_COMMENT')
    || (value.eventType === 'DIRECT_MESSAGE_RECEIVED'
      && value.sourceType === 'DIRECT_MESSAGE');
  return allowedPair
    && Number.isSafeInteger(value.notificationId) && Number(value.notificationId) > 0
    && Number.isSafeInteger(value.sourceId) && Number(value.sourceId) > 0
    && (value.sourceType === 'APPROVAL_COMMENT'
      ? Number.isSafeInteger(value.targetId) && Number(value.targetId) > 0
      : value.targetId === null)
    && typeof value.title === 'string'
    && typeof value.summary === 'string'
    && typeof value.createdAt === 'string'
    && Number.isFinite(Date.parse(value.createdAt))
    && (value.readAt === null
      || (typeof value.readAt === 'string' && Number.isFinite(Date.parse(value.readAt))));
}

function validatePage(value: unknown): NotificationPage {
  if (!isObject(value) || !Array.isArray(value.resultList)
    || !value.resultList.every(isNotificationItem)
    || typeof value.hasNext !== 'boolean'
    || (value.hasNext
      ? !Number.isSafeInteger(value.nextBeforeNotificationId)
        || Number(value.nextBeforeNotificationId) <= 0
      : value.nextBeforeNotificationId !== null)) {
    throw new Error('알림 목록 응답을 확인할 수 없습니다.');
  }
  const resultList = value.resultList;
  if (new Set(resultList.map((item) => item.notificationId)).size !== resultList.length
    || (value.hasNext && resultList.length === 0)
    || (value.hasNext
      && value.nextBeforeNotificationId !== resultList[resultList.length - 1].notificationId)) {
    throw new Error('알림 목록 응답을 확인할 수 없습니다.');
  }
  return {
    resultList,
    hasNext: value.hasNext,
    nextBeforeNotificationId: value.nextBeforeNotificationId as number | null,
  };
}

export async function getNotificationSummary(): Promise<NotificationSummary> {
  const response = await apiGet<unknown>(`${API_PATH}/summary`);
  if (!isObject(response) || !Number.isSafeInteger(response.unreadCount)
    || Number(response.unreadCount) < 0) {
    throw new Error('알림 요약 응답을 확인할 수 없습니다.');
  }
  return { unreadCount: Number(response.unreadCount) };
}

export async function listNotifications(query: NotificationPageQuery = {}): Promise<NotificationPage> {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.beforeNotificationId !== undefined) {
    params.set('beforeNotificationId', String(query.beforeNotificationId));
  }
  params.set('unreadOnly', String(query.unreadOnly === true));
  if (query.eventType !== undefined) params.set('eventType', query.eventType);
  return validatePage(await apiGet<unknown>(`${API_PATH}?${params.toString()}`));
}

export async function markNotificationRead(notificationId: number): Promise<NotificationItem> {
  if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
    throw new Error('알림 ID가 올바르지 않습니다.');
  }
  const response = await apiPut<unknown>(`${API_PATH}/${notificationId}/read`, {});
  if (!isObject(response) || !isNotificationItem(response.item)) {
    throw new Error('알림 읽음 처리 응답을 확인할 수 없습니다.');
  }
  return response.item;
}

function notifyNotificationArchive() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('songyeon-erp:notification-archived'));
  }
}

export async function archiveNotification(notificationId: number): Promise<void> {
  if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
    throw new Error('알림 ID가 올바르지 않습니다.');
  }
  const response = await apiPut<unknown>(`${API_PATH}/${notificationId}/archive`, {});
  if (!isObject(response) || response.archived !== true) {
    throw new Error('알림 숨김 처리 응답을 확인할 수 없습니다.');
  }
  notifyNotificationArchive();
}

export async function archiveReadNotifications(
  eventType?: NotificationItem['eventType'],
): Promise<{ archivedCount: number }> {
  const params = new URLSearchParams();
  if (eventType !== undefined) params.set('eventType', eventType);
  const query = params.toString();
  const suffix = query ? `?${query}` : '';
  const response = await apiPut<unknown>(`${API_PATH}/archive-read${suffix}`, {});
  if (!isObject(response) || !Number.isSafeInteger(response.archivedCount)
    || Number(response.archivedCount) < 0) {
    throw new Error('읽은 알림 정리 응답을 확인할 수 없습니다.');
  }
  notifyNotificationArchive();
  return { archivedCount: Number(response.archivedCount) };
}
