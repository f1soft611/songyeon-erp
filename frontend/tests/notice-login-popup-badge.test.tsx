import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { NoticeLoginPopupBadge } from '../src/pages/groupware/community/notice/components/NoticeLoginPopupBadge';
import { NoticeFeedList } from '../src/pages/groupware/community/notice/components/NoticeFeedList';
import { noticeFeed } from '../src/pages/groupware/community/notice/data/noticeData';
import { NoticeCategoryBadge } from '../src/pages/groupware/community/notice/components/NoticeCategoryBadge';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '../src/theme/theme';

afterEach(() => { cleanup(); vi.useRealTimers(); });

it.each(['N', undefined] as const)('does not mark ordinary notices with setting %s', (loginPopupYn) => {
  render(<NoticeLoginPopupBadge loginPopupYn={loginPopupYn} popupEndDate="2099-01-01" />);
  expect(screen.queryByRole('img', { name: '로그인 팝업' })).not.toBeInTheDocument();
  expect(screen.queryByRole('img', { name: '팝업 종료' })).not.toBeInTheDocument();
});

it('keeps the end date inclusive in Korea and updates at midnight without remounting', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-22T14:59:59Z'));
  render(<NoticeLoginPopupBadge loginPopupYn="Y" popupEndDate="2026-10-22" />);
  expect(screen.getByRole('img', { name: '로그인 팝업' })).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole('img', { name: '팝업 종료' })).toBeInTheDocument();
  expect(screen.queryByRole('img', { name: '로그인 팝업' })).not.toBeInTheDocument();
});

it('refreshes the displayed status on returning to a tab', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-22T12:00:00Z'));
  render(<NoticeLoginPopupBadge loginPopupYn="Y" popupEndDate="2026-10-22" />);
  vi.setSystemTime(new Date('2026-10-23T01:00:00Z'));
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(screen.getByRole('img', { name: '팝업 종료' })).toBeInTheDocument();
});

it('explains the popup end date on hover', async () => {
  render(<NoticeLoginPopupBadge loginPopupYn="Y" popupEndDate="2099-10-31" />);
  fireEvent.mouseOver(screen.getByRole('img', { name: '로그인 팝업' }));
  expect(await screen.findByRole('tooltip')).toHaveTextContent('종료일 2099-10-31 (당일까지)');
});

it('explicitly explains a missing end date rather than promising a display period', async () => {
  render(<NoticeLoginPopupBadge loginPopupYn="Y" popupEndDate={null} />);
  fireEvent.mouseOver(screen.getByRole('img', { name: '로그인 팝업' }));
  expect(await screen.findByRole('tooltip')).toHaveTextContent('로그인 팝업 종료일 정보가 없습니다.');
});

it('renders active and expired icons beside feed pins without changing title, category or pin controls', () => {
  render(<NoticeFeedList isDark={false} items={[
    { ...noticeFeed[0], id: 701, title: '활성 공지', loginPopupYn: 'Y', popupEndDate: '2099-10-31', isPinned: 'Y' },
    { ...noticeFeed[0], id: 702, title: '종료 공지', loginPopupYn: 'Y', popupEndDate: '2000-01-01' },
    { ...noticeFeed[0], id: 703, title: '일반 공지', loginPopupYn: 'N' },
  ]} />);
  const active = within(screen.getByTestId('notice-feed-card-701'));
  const indicator = active.getByRole('img', { name: '로그인 팝업' });
  expect(indicator.nextElementSibling).toBe(active.getByRole('button', { name: '상단 고정 해제 활성 공지' }));
  expect(indicator).not.toHaveTextContent('로그인 팝업');
  expect(active.getByRole('button', { name: '상단 고정 해제 활성 공지' })).toBeInTheDocument();
  expect(within(screen.getByTestId('notice-feed-card-702')).getByRole('img', { name: '팝업 종료' })).toBeInTheDocument();
  expect(within(screen.getByTestId('notice-feed-card-703')).queryByRole('img', { name: '로그인 팝업' })).not.toBeInTheDocument();
});

it.each(['light', 'dark'] as const)('uses the same category foreground and background in feed and list in %s mode', (mode) => {
  render(<ThemeProvider theme={createAppTheme(mode)}>
    <NoticeCategoryBadge code="GENERAL" label="일반" />
    <NoticeCategoryBadge code="GENERAL" label="일반" compact />
  </ThemeProvider>);
  const [feed, list] = screen.getAllByText('일반').map((element) => getComputedStyle(element.closest('.MuiChip-root')!));
  expect(list.backgroundColor).toBe(feed.backgroundColor);
  expect(list.color).toBe(feed.color);
  expect(feed.height).toBe('28px');
  expect(list.height).toBe('22px');
});
