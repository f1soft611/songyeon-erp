import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGet, apiPut } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet,
  apiPut,
}));

import {
  getNotificationSummary,
  listNotifications,
  markNotificationRead,
  archiveNotification,
  archiveReadNotifications,
} from '../src/shared/services/notificationService';

describe('notification service', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPut.mockReset();
  });

  it('validates notification page data before returning it', async () => {
    apiGet.mockResolvedValue({
      resultList: [{
        notificationId: 7,
        eventType: 'DIRECT_MESSAGE_RECEIVED',
        sourceType: 'DIRECT_MESSAGE',
        sourceId: 29,
        targetId: null,
        title: '새 쪽지',
        summary: '확인해 주세요',
        createdAt: '2026-10-30T09:30:00',
        readAt: null,
      }],
      hasNext: false,
      nextBeforeNotificationId: null,
    });

    await expect(listNotifications({ limit: 5 })).resolves.toMatchObject({
      hasNext: false,
      resultList: [{ notificationId: 7, sourceId: 29 }],
    });
    expect(apiGet).toHaveBeenCalledWith(
      '/api/v1/groupware/notifications?limit=5&unreadOnly=false',
    );

    apiGet.mockResolvedValue({
      resultList: [{ notificationId: 7, eventType: 'UNTRUSTED', sourceType: 'DIRECT_MESSAGE' }],
      hasNext: false,
      nextBeforeNotificationId: null,
    });
    await expect(listNotifications({ limit: 5 })).rejects.toThrow(
      '알림 목록 응답을 확인할 수 없습니다.',
    );
  });

  it('does not turn unread summary or read failures into successful fallbacks', async () => {
    const failure = new Error('network failure');
    apiGet.mockRejectedValueOnce(failure);
    apiPut.mockRejectedValueOnce(failure);

    await expect(getNotificationSummary()).rejects.toBe(failure);
    await expect(markNotificationRead(7)).rejects.toBe(failure);
  });

  it('sends an optional event type when listing notifications', async () => {
    apiGet.mockResolvedValue({
      resultList: [],
      hasNext: false,
      nextBeforeNotificationId: null,
    });

    await listNotifications({ eventType: 'APPROVAL_COMMENT_MENTION' });

    expect(apiGet).toHaveBeenCalledWith(
      '/api/v1/groupware/notifications?unreadOnly=false&eventType=APPROVAL_COMMENT_MENTION',
    );
  });

  it('archives one notification and bulk-archives read notifications by event type', async () => {
    apiPut.mockResolvedValueOnce({ archived: true });
    apiPut.mockResolvedValueOnce({ archivedCount: 2 });

    await expect(archiveNotification(7)).resolves.toBeUndefined();
    await expect(archiveReadNotifications('DIRECT_MESSAGE_RECEIVED'))
      .resolves.toEqual({ archivedCount: 2 });

    expect(apiPut).toHaveBeenNthCalledWith(
      1,
      '/api/v1/groupware/notifications/7/archive',
      {},
    );
    expect(apiPut).toHaveBeenNthCalledWith(
      2,
      '/api/v1/groupware/notifications/archive-read?eventType=DIRECT_MESSAGE_RECEIVED',
      {},
    );
  });
});
