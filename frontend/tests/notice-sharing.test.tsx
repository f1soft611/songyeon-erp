import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { NoticeFeedList } from '../src/pages/groupware/community/notice/components/NoticeFeedList';
import { noticeFeed } from '../src/pages/groupware/community/notice/data/noticeData';
import { NoticeLinkedDetailPanel } from '../src/pages/groupware/community/notice/components/NoticeLinkedDetailPanel';
import { DocumentLinkPreviews } from '../src/pages/groupware/documents/write/components/DocumentLinkPreviews';

const noticeShareMocks = vi.hoisted(() => ({
  getSharedNoticePreview: vi.fn(),
  fetchNoticePostDetail: vi.fn(),
  fetchCommonCodeGroups: vi.fn().mockResolvedValue([{ id: 'notice-group', groupCode: 'NOTICE_GUBUN' }]),
  fetchCommonCodeItems: vi.fn().mockResolvedValue([{ itemCode: 'OPS', itemNm: '운영공지', useAt: 'Y' }]),
}));

vi.mock('../src/pages/co/master/common-code/services/commonCodeManagement.service', () => ({
  fetchCommonCodeGroups: noticeShareMocks.fetchCommonCodeGroups,
  fetchCommonCodeItems: noticeShareMocks.fetchCommonCodeItems,
}));

vi.mock(
  '../src/pages/groupware/community/notice/services/noticeBoardService',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('../src/pages/groupware/community/notice/services/noticeBoardService')
    >()),
    getSharedNoticePreview: noticeShareMocks.getSharedNoticePreview,
    fetchNoticePostDetail: noticeShareMocks.fetchNoticePostDetail,
  }),
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('notice sharing UI', () => {
  it.each(['known', 'unknown', 'lookup-error'] as const)(
    'uses the category name or a Korean fallback in document previews: %s',
    async (scenario) => {
      const token = `v1.${'A'.repeat(59)}`;
      noticeShareMocks.getSharedNoticePreview.mockResolvedValue({
        postId: 99,
        title: '공유된 공지',
        noticeGubunCode: scenario === 'unknown' ? 'UNKNOWN' : 'OPS',
        contentsHtml: '<p>공유 공지 내용</p>',
      });
      if (scenario === 'lookup-error') {
        noticeShareMocks.fetchCommonCodeGroups.mockRejectedValueOnce(new Error('offline'));
      }
      render(
        <DocumentLinkPreviews
          html={`${window.location.origin}/groupware/community/notice?share=${token}`}
        />,
      );
      const card = await screen.findByRole('button', { name: '공지 상세 열기: 공유된 공지' });
      expect(within(card).getByText(scenario === 'known' ? '운영공지' : '공지', { exact: true })).toBeInTheDocument();
      expect(within(card).queryByText(/^(OPS|UNKNOWN)$/)).not.toBeInTheDocument();
    },
  );

  it('loads the linked notice detail in place without offering unsupported management actions', async () => {
    noticeShareMocks.fetchNoticePostDetail.mockResolvedValueOnce({
      postId: '99',
      title: '패널 공지',
      contentsHtml: '<p>패널에서 확인하는 전체 본문</p>',
    });
    render(<NoticeLinkedDetailPanel noticeId={99} onClose={vi.fn()} onOpenNotice={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('패널에서 확인하는 전체 본문')).toBeInTheDocument();
    });
    expect(noticeShareMocks.fetchNoticePostDetail).toHaveBeenCalledWith(99);
    expect(screen.queryByRole('button', { name: '공지 메뉴 패널 공지' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '상단 고정 패널 공지' })).not.toBeInTheDocument();
  });

  it('keeps a denied linked notice unavailable and allows closing the panel', async () => {
    const onClose = vi.fn();
    noticeShareMocks.fetchNoticePostDetail.mockRejectedValueOnce(new Error('unavailable'));
    render(<NoticeLinkedDetailPanel noticeId={99} onClose={onClose} onOpenNotice={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('공지사항 상세 정보를 불러오지 못했습니다.');
    expect(screen.queryByTestId('notice-feed-card-99')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('offers the owner a notice sharing action', () => {
    const item = noticeFeed[0];
    const onShare = vi.fn();
    render(<NoticeFeedList items={[item]} isDark={false} onShare={onShare} />);

    fireEvent.click(screen.getByRole('button', { name: `공지 메뉴 ${item.title}` }));
    fireEvent.click(screen.getByRole('menuitem', { name: '공지 공유하기' }));

    expect(onShare).toHaveBeenCalledWith(item.id);
  });

  it('previews notice links in the body and comments and opens the linked notice', async () => {
    const token = `v1.${'A'.repeat(59)}`;
    const shareUrl = `${window.location.origin}/groupware/community/notice?share=${token}`;
    const onOpenNotice = vi.fn();
    noticeShareMocks.getSharedNoticePreview.mockResolvedValue({
      postId: 99,
      title: '공유된 공지',
      noticeGubunCode: 'OPS',
      writerName: ' 테스트 작성자 ',
      contentsHtml: '<p>공유 공지 내용</p>',
    });
    const item = {
      ...noticeFeed[0],
      bodyHtml: `<p>${shareUrl}</p>`,
      summary: shareUrl,
      comments: [{
        id: 101,
        author: '작성자',
        time: '방금',
        content: shareUrl,
      }],
    };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        expandedNoticeId={item.id}
        onOpenNotice={onOpenNotice}
      />,
    );

    const cards = await screen.findAllByRole('button', {
      name: '공지 상세 열기: 공유된 공지',
    });
    expect(cards).toHaveLength(2);
    expect(noticeShareMocks.getSharedNoticePreview).toHaveBeenCalledTimes(2);
    fireEvent.click(cards[0]!);
    expect(onOpenNotice).toHaveBeenCalledWith(99);
    expect(within(cards[0]!).getByText('공지사항')).toBeInTheDocument();
    expect(within(cards[0]!).getByText('운영공지 · 테스트 작성자')).toBeInTheDocument();
    expect(within(cards[0]!).queryByText('OPS')).not.toBeInTheDocument();
  });
});
