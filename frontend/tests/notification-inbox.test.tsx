import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationPage } from '../src/shared/types/notification.types';

const mocks = vi.hoisted(() => ({
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  archiveNotification: vi.fn(),
  archiveReadNotifications: vi.fn(),
}));

vi.mock('../src/shared/services/notificationService', () => mocks);

import { NotificationInboxPage } from '../src/pages/groupware/notifications/NotificationInboxPage';

describe('NotificationInboxPage', () => {
  beforeEach(() => {
    mocks.listNotifications.mockReset();
    mocks.markNotificationRead.mockReset();
    mocks.archiveNotification.mockReset();
    mocks.archiveReadNotifications.mockReset();
    mocks.listNotifications.mockResolvedValue({
      resultList: [
        {
          notificationId: 7,
          eventType: 'APPROVAL_COMMENT_MENTION',
          sourceType: 'APPROVAL_COMMENT',
          sourceId: 81,
          targetId: 29,
          title: '문서 댓글 멘션',
          summary: '확인해 주세요',
          createdAt: '2026-10-30T09:30:00',
          readAt: '2026-10-30T09:32:00',
        },
        {
          notificationId: 8,
          eventType: 'DIRECT_MESSAGE_RECEIVED',
          sourceType: 'DIRECT_MESSAGE',
          sourceId: 82,
          targetId: null,
          title: '새 쪽지 도착',
          summary: '일정을 확인해 주세요',
          createdAt: '2026-10-30T09:31:00',
          readAt: null,
        },
      ],
      hasNext: false,
      nextBeforeNotificationId: null,
    });
    mocks.archiveNotification.mockResolvedValue(undefined);
    mocks.archiveReadNotifications.mockResolvedValue({ archivedCount: 1 });
  });

  it.each([
    ['DIRECT_MESSAGE_RECEIVED', 'DIRECT_MESSAGE', null, '/groupware/messages?messageId=82'],
    ['APPROVAL_COMMENT_MENTION', 'APPROVAL_COMMENT', 29, '/groupware/doc/write?approvalId=29'],
  ])('opens the authorized %s detail after a push click', async (eventType, sourceType, targetId, path) => {
    mocks.markNotificationRead.mockResolvedValue({
      notificationId: 14, eventType, sourceType, sourceId: 82, targetId,
    });
    function Destination() {
      const location = useLocation();
      return <div>destination:{location.pathname}{location.search}</div>;
    }
    render(<MemoryRouter initialEntries={['/groupware/notifications?pushNotificationId=14']}>
      <NotificationInboxPage /><Destination />
    </MemoryRouter>);
    expect(await screen.findByText(`destination:${path}`)).toBeVisible();
    expect(mocks.markNotificationRead).toHaveBeenCalledWith(14);
  });

  it('shows a leading category icon with the original title and summary for each event type', async () => {
    render(
      <MemoryRouter>
        <NotificationInboxPage />
      </MemoryRouter>,
    );

    const category = await screen.findByRole('img', { name: '문서 멘션' });
    const messageCategory = screen.getByRole('img', { name: '새 쪽지' });
    const title = screen.getByText('문서 댓글 멘션');
    expect(category.closest('[role="button"]')?.firstElementChild).toBe(category);
    expect(messageCategory.closest('[role="button"]')?.firstElementChild).toBe(messageCategory);
    expect(category).toBeVisible();
    expect(category.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('문서 댓글 멘션')).toBeVisible();
    expect(screen.getByText('확인해 주세요')).toBeVisible();
    expect(screen.getByText('새 쪽지 도착')).toBeVisible();
    expect(screen.getByText('일정을 확인해 주세요')).toBeVisible();
  });

  it('filters notifications by event type without changing the read filter', async () => {
    render(
      <MemoryRouter>
        <NotificationInboxPage />
      </MemoryRouter>,
    );

    const typeFilter = await screen.findByRole('group', { name: '알림 구분' });
    fireEvent.click(within(typeFilter).getByRole('button', { name: '문서 멘션' }));

    await waitFor(() => {
      expect(mocks.listNotifications).toHaveBeenLastCalledWith({
        limit: 20,
        beforeNotificationId: undefined,
        unreadOnly: false,
        eventType: 'APPROVAL_COMMENT_MENTION',
      });
    });
  });

  it('reconciles all loaded pages on realtime signals while preserving the type filter', async () => {
    const template = (await mocks.listNotifications()).resultList[0];
    const page = (start: number, count = 20) => ({
      resultList: Array.from({ length: count }, (_, index) => ({
        ...template, notificationId: start - index, title: `알림 ${start - index}`,
      })),
      hasNext: true, nextBeforeNotificationId: start - count + 1,
    });
    mocks.listNotifications.mockReset()
      .mockResolvedValueOnce(page(100, 1)).mockResolvedValueOnce(page(100))
      .mockResolvedValueOnce(page(80, 1)).mockResolvedValueOnce(page(101))
      .mockResolvedValueOnce(page(81, 1));
    render(<MemoryRouter><NotificationInboxPage /></MemoryRouter>);
    await screen.findByText('알림 100');
    fireEvent.click(screen.getByRole('button', { name: '문서 멘션', exact: true }));
    await waitFor(() => expect(mocks.listNotifications).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: '더 보기' }));
    await screen.findByText('알림 80');
    fireEvent(window, new CustomEvent('songyeon-erp:realtime', { detail: { areas: ['NOTIFICATION'] } }));
    await screen.findByText('알림 101');
    expect(screen.getByText('알림 81')).toBeVisible();
    expect(mocks.listNotifications).toHaveBeenLastCalledWith({
      limit: 20, beforeNotificationId: 82, unreadOnly: false, eventType: 'APPROVAL_COMMENT_MENTION',
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  }, 15000);

  it('ignores a stale response after changing notification filters', async () => {
    render(
      <MemoryRouter>
        <NotificationInboxPage />
      </MemoryRouter>,
    );

    await screen.findByText('문서 댓글 멘션');
    let resolveOlder!: (page: NotificationPage) => void;
    let resolveLatest!: (page: NotificationPage) => void;
    const olderResponse = new Promise<NotificationPage>((resolve) => {
      resolveOlder = resolve;
    });
    const latestResponse = new Promise<NotificationPage>((resolve) => {
      resolveLatest = resolve;
    });
    mocks.listNotifications
      .mockReset()
      .mockImplementationOnce(() => olderResponse)
      .mockImplementationOnce(() => latestResponse);

    const typeFilter = screen.getByRole('group', { name: '알림 구분' });
    fireEvent.click(within(typeFilter).getByRole('button', { name: '문서 멘션' }));
    fireEvent.click(within(typeFilter).getByRole('button', { name: '새 쪽지' }));

    await act(async () => {
      resolveLatest({
        resultList: [{
          notificationId: 8,
          eventType: 'DIRECT_MESSAGE_RECEIVED',
          sourceType: 'DIRECT_MESSAGE',
          sourceId: 82,
          targetId: null,
          title: '새 쪽지 도착',
          summary: '일정을 확인해 주세요',
          createdAt: '2026-10-30T09:31:00',
          readAt: null,
        }],
        hasNext: false,
        nextBeforeNotificationId: null,
      });
      await latestResponse;
    });
    expect(screen.getByText('새 쪽지 도착')).toBeVisible();

    await act(async () => {
      resolveOlder({
        resultList: [{
          notificationId: 7,
          eventType: 'APPROVAL_COMMENT_MENTION',
          sourceType: 'APPROVAL_COMMENT',
          sourceId: 81,
          targetId: 29,
          title: '문서 댓글 멘션',
          summary: '확인해 주세요',
          createdAt: '2026-10-30T09:30:00',
          readAt: null,
        }],
        hasNext: true,
        nextBeforeNotificationId: 7,
      });
      await olderResponse;
    });
    expect(screen.queryByText('문서 댓글 멘션')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '더 보기' })).not.toBeInTheDocument();
  });

  it('hides an individual notification and archives read notifications after confirmation', async () => {
    render(
      <MemoryRouter>
        <NotificationInboxPage />
      </MemoryRouter>,
    );

    await screen.findByText('문서 댓글 멘션');
    fireEvent.click(screen.getByRole('button', { name: '알림 숨기기: 문서 댓글 멘션' }));

    await waitFor(() => {
      expect(mocks.archiveNotification).toHaveBeenCalledWith(7);
    });
    expect(screen.queryByText('문서 댓글 멘션')).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('group', { name: '알림 구분' }))
      .getByRole('button', { name: '문서 멘션' }));
    await waitFor(() => {
      expect(mocks.listNotifications).toHaveBeenLastCalledWith({
        limit: 20,
        beforeNotificationId: undefined,
        unreadOnly: false,
        eventType: 'APPROVAL_COMMENT_MENTION',
      });
    });
    fireEvent.click(screen.getByRole('button', { name: '읽은 알림 정리' }));
    fireEvent.click(screen.getByRole('button', { name: '정리' }));

    await waitFor(() => {
      expect(mocks.archiveReadNotifications).toHaveBeenCalledWith('APPROVAL_COMMENT_MENTION');
    });
  });

  it('disables bulk archive in the unread filter', async () => {
    render(
      <MemoryRouter>
        <NotificationInboxPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '읽지 않음' }));

    await waitFor(() => {
      expect(mocks.listNotifications).toHaveBeenLastCalledWith({
        limit: 20,
        beforeNotificationId: undefined,
        unreadOnly: true,
        eventType: undefined,
      });
    });
    expect(screen.getByRole('button', { name: '읽은 알림 정리' })).toBeDisabled();
  });
});
