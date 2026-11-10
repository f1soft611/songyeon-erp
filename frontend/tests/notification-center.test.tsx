import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getNotificationSummary: vi.fn(),
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}));

vi.mock('../src/shared/services/notificationService', () => mocks);

import { NotificationCenter } from '../src/shared/components/NotificationCenter';

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}{location.search}</output>;
}

describe('NotificationCenter', () => {
  beforeEach(() => {
    mocks.getNotificationSummary.mockReset();
    mocks.listNotifications.mockReset();
    mocks.markNotificationRead.mockReset();
    mocks.getNotificationSummary.mockResolvedValue({ unreadCount: 4 });
    mocks.listNotifications.mockResolvedValue({
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
      hasNext: false,
      nextBeforeNotificationId: null,
    });
    mocks.markNotificationRead.mockResolvedValue({});
  });

  it('shows unread badge and navigates to the typed source when selected', async () => {
    render(
      <MemoryRouter>
        <NotificationCenter />
        <CurrentPath />
      </MemoryRouter>,
    );

    expect(await screen.findByText('4')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'notifications' }));

    fireEvent.click(await screen.findByRole('button', { name: /문서 댓글 멘션/ }));

    await waitFor(() => {
      expect(mocks.markNotificationRead).toHaveBeenCalledWith(7);
      expect(screen.getByTestId('current-path')).toHaveTextContent(
        '/groupware/doc/write?approvalId=29',
      );
    });
  });

  it('continues navigation when notification read fails', async () => {
    mocks.markNotificationRead.mockRejectedValue(new Error('read failed'));
    render(
      <MemoryRouter>
        <NotificationCenter />
        <CurrentPath />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'notifications' }));
    fireEvent.click(await screen.findByRole('button', { name: /문서 댓글 멘션/ }));

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent(
        '/groupware/doc/write?approvalId=29',
      );
    });

  });

  it('refreshes the badge and an open popover without showing a loading spinner on a realtime signal', async () => {
      render(<MemoryRouter><NotificationCenter /></MemoryRouter>);
      await screen.findByText('4');
      fireEvent.click(screen.getByRole('button', { name: 'notifications' }));
      await screen.findByText('문서 댓글 멘션');
      mocks.getNotificationSummary.mockResolvedValue({ unreadCount: 6 });
      mocks.listNotifications.mockResolvedValue({ resultList: [{
        notificationId: 9, eventType: 'APPROVAL_COMMENT_MENTION', sourceType: 'APPROVAL_COMMENT',
        sourceId: 82, targetId: 29, title: '실시간 새 알림', summary: '새 내용',
        createdAt: '2026-11-02T15:00:00', readAt: null,
      }], hasNext: false, nextBeforeNotificationId: null });
      fireEvent(window, new CustomEvent('songyeon-erp:realtime', { detail: { areas: ['NOTIFICATION'] } }));
      expect(await screen.findByText('실시간 새 알림')).toBeVisible();
      expect(screen.getByText('6')).toBeVisible();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
