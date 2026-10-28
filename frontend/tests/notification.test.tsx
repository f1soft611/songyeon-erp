import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  NotificationProvider,
  useNotification,
} from '../src/shared/context/NotificationContext';
import { PageMessageArea } from '../src/shared/components/PageMessageArea';

function SuccessNotificationButton() {
  const { showSuccess } = useNotification();

  return (
    <button type="button" onClick={() => showSuccess('저장했습니다.')}>
      성공 알림
    </button>
  );
}

describe('shared page notifications', () => {
  it('shows a success toast through the shared notification hook', async () => {
    render(
      <NotificationProvider>
        <SuccessNotificationButton />
      </NotificationProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '성공 알림' }));

    expect(await screen.findByText('저장했습니다.')).toBeVisible();
  });

  it('shows and dismisses a page error message', () => {
    const onClose = vi.fn();

    render(
      <PageMessageArea message="저장에 실패했습니다." onClose={onClose} />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('저장에 실패했습니다.');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('uses the shared message layout with an informational color when requested', () => {
    render(
      <PageMessageArea
        message="분류 항목이 없습니다."
        onClose={vi.fn()}
        severity="info"
      />,
    );

    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorInfo');
  });
});
