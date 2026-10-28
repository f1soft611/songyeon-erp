import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NoticeLoginPopupHost } from '../src/pages/groupware/community/notice/components/NoticeLoginPopupHost';
import { NoticeComposerDialog } from '../src/pages/groupware/community/notice/components/NoticeComposerDialog';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import { ApiResponseError } from '../src/shared/services/apiClient';

const api = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), dismiss: vi.fn() }));
vi.mock('../src/pages/groupware/community/notice/services/noticeLoginPopupService', () => ({
  fetchLoginPopups: api.list,
  fetchLoginPopupDetail: api.detail,
  dismissLoginPopupToday: api.dismiss,
}));

const auth = { tenantCode: 'test', userId: 'reader', popupSessionId: 'session-1',
  accessToken: 'test-only', refreshToken: '', expiresAt: '2099-01-01T00:00:00Z' };
const detail = (postId: number) => ({ postId, title: `공지 ${postId}`, contentsHtml: '<p>본문 내용</p>' });
const host = () => render(<NotificationProvider><NoticeLoginPopupHost /></NotificationProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.setItem('s-erp-auth', JSON.stringify(auth));
  api.list.mockResolvedValue([{ postId: 2 }, { postId: 1 }]);
  api.detail.mockImplementation(async (id: number) => detail(id));
  api.dismiss.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); localStorage.clear(); });

describe('login popup queue', () => {
  it('shows single-notice progress as a separate badge beside the heading outside the body', async () => {
    api.list.mockResolvedValue([{ postId: 2 }]);
    host();
    await screen.findByText('공지 2');
    const dialog = screen.getByRole('dialog', { name: '로그인 공지' });
    const progress = screen.getByRole('status', { name: '공지 진행' });
    const heading = screen.getByRole('heading', { name: '로그인 공지' });
    expect(progress).toHaveTextContent('1 / 1');
    expect(progress.parentElement).toBe(heading.parentElement);
    expect(progress).toHaveClass('MuiChip-root');
    expect(dialog).toHaveAccessibleDescription('작성자 관리자');
    expect(progress.closest('.MuiDialogContent-root')).toBeNull();
    expect(screen.getAllByText(/^1 \/ 1/)).toHaveLength(1);
  });

  it('loads only the visible notice, dismisses that notice, then shows the next', async () => {
    host();
    expect(await screen.findByText('공지 2')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '공지 진행' })).toHaveTextContent('1 / 2');
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('작성자 관리자');
    expect(api.detail).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('checkbox', { name: '오늘 하루 이 공지 보지 않기' }));
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByText('공지 1')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '공지 진행' })).toHaveTextContent('2 / 2');
    expect(api.dismiss).toHaveBeenCalledWith(2);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps a completed login queue closed on remount but opens for a new login', async () => {
    const first = host();
    await screen.findByText('공지 2');
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    await screen.findByText('공지 1');
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    first.unmount();
    const second = host();
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    second.unmount();
    localStorage.setItem('s-erp-auth', JSON.stringify({ ...auth, popupSessionId: 'session-2' }));
    host();
    expect(await screen.findByText('공지 2')).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('shows the writer and full creation timestamp beside progress in the header only', async () => {
    const createdAt = '2026-10-22T09:35:42';
    api.detail.mockResolvedValue({ ...detail(2), writerName: '검증 작성자', createdAt });
    host();
    await screen.findByText('공지 2');
    const dialog = screen.getByRole('dialog', { name: '로그인 공지' });
    const description = document.getElementById(dialog.getAttribute('aria-describedby') ?? '');
    expect(description).toHaveTextContent('작성자 검증 작성자');
    expect(description).toHaveTextContent('작성일시 2026. 10. 22.');
    expect(description).toHaveTextContent('09:35:42');
    expect(description).not.toHaveTextContent('1 / 2');
    expect(description?.parentElement).toBe(screen.getByRole('heading', { name: '로그인 공지' }).parentElement);
    expect(description?.closest('.MuiDialogContent-root')).toBeNull();
    expect(screen.getAllByText(/검증 작성자/)).toHaveLength(1);
    expect(dialog.querySelector('.MuiDialogContent-root')).not.toHaveTextContent('검증 작성자');
  });

  it('does not advance after dismissal failure and allows retry', async () => {
    api.dismiss.mockRejectedValueOnce(new Error('network'));
    host();
    await screen.findByText('공지 2');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('숨김');
    expect(api.detail).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('공지 1')).toBeInTheDocument();
  });

  it('reports list failure and retries without blocking authentication', async () => {
    api.list.mockRejectedValueOnce(new Error('network'));
    host();
    expect(await screen.findByRole('alert')).toHaveTextContent('불러오지 못');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('공지 2')).toBeInTheDocument();
  });

  it('resumes at the next pending notice after remount', async () => {
    const first = host();
    await screen.findByText('공지 2');
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    await screen.findByText('공지 1');
    first.unmount();
    host();
    expect(await screen.findByText('공지 1')).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(api.detail.mock.calls.map(([id]) => id)).toEqual([2, 1, 1]);
  });

  it('allows an expired notice to be skipped without reading or hiding the next one early', async () => {
    api.detail.mockRejectedValueOnce(new ApiResponseError('expired', 404));
    host();
    expect(await screen.findByRole('alert')).toHaveTextContent('종료');
    fireEvent.click(screen.getByRole('button', { name: '다음 공지' }));
    expect(await screen.findByText('공지 1')).toBeInTheDocument();
    expect(api.dismiss).not.toHaveBeenCalled();
  });

  it('closes on logout and ignores a late list response', async () => {
    let resolveList!: (items: Array<{ postId: number }>) => void;
    api.list.mockReturnValue(new Promise((resolve) => { resolveList = resolve; }));
    host();
    await waitFor(() => expect(api.list).toHaveBeenCalled());
    await act(async () => {
      localStorage.removeItem('s-erp-auth');
      window.dispatchEvent(new Event('s-erp-auth-change'));
      resolveList([{ postId: 99 }]);
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.detail).not.toHaveBeenCalled();
  });
});

describe('notice popup composer fields', () => {
  it('places outlined popup settings before title and requires the end date', async () => {
    const submit = vi.fn();
    render(<NoticeComposerDialog open isDark={false} onClose={() => undefined}
      onSubmit={submit} defaultTitle="테스트" defaultNoticeGubunCode="GENERAL"
      noticeGubunOptions={[{ code: 'GENERAL', name: '일반' }]} />);
    const checkbox = screen.getByRole('checkbox', { name: '로그인 시 팝업' });
    const endDate = screen.getByRole('textbox', { name: '팝업 종료일' });
    const title = screen.getByRole('textbox', { name: '제목' });
    expect(endDate).toBeDisabled();
    expect(checkbox.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const outline = title.closest('.MuiOutlinedInput-root')?.querySelector('fieldset');
    expect(outline).not.toHaveStyle({ borderStyle: 'none' });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('팝업 종료일을 입력해 주세요.')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
    fireEvent.change(endDate, { target: { value: '2026-10-31' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      loginPopupYn: 'Y', popupEndDate: '2026-10-31',
    })));
  });

  it('restores popup settings when editing and clears the date when disabled', async () => {
    const submit = vi.fn();
    render(<NoticeComposerDialog open isDark={false} onClose={() => undefined}
      onSubmit={submit} defaultTitle="기존 공지" defaultNoticeGubunCode="GENERAL"
      defaultLoginPopupYn="Y" defaultPopupEndDate="2026-10-31"
      noticeGubunOptions={[{ code: 'GENERAL', name: '일반' }]} />);
    expect(screen.getByRole('checkbox', { name: '로그인 시 팝업' })).toBeChecked();
    expect(screen.getByRole('textbox', { name: '팝업 종료일' })).toHaveValue('2026-10-31');
    fireEvent.click(screen.getByRole('checkbox', { name: '로그인 시 팝업' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      loginPopupYn: 'N', popupEndDate: null,
    })));
  });
});
