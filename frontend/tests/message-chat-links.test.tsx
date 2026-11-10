// 2026-11-04 S_ERP message-chat-links.test.tsx 와 같은 확인. 송연은 사람 ID 가 사번 문자열, 이벤트 이름은 songyeon-erp: 이다
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSharedDocumentPreview: vi.fn(),
  listDocumentApprovals: vi.fn(),
  getExternalLinkPreview: vi.fn(),
  resolveNoticeLinkPreview: vi.fn(),
}));

vi.mock('../src/pages/groupware/documents/write/services/documentApproval.service', () => ({
  getSharedDocumentPreview: mocks.getSharedDocumentPreview,
  listDocumentApprovals: mocks.listDocumentApprovals,
  getExternalLinkPreview: mocks.getExternalLinkPreview,
}));
vi.mock('../src/pages/groupware/community/notice/services/noticeLinkPreview.service', () => ({
  resolveNoticeLinkPreview: mocks.resolveNoticeLinkPreview,
}));

import { MessageChatView } from '../src/pages/groupware/messages/components/MessageChatView';

const token = (letter: string) => `v1.${letter.repeat(59)}`;

describe('message chat link previews', () => {
  it('preserves scroll away from the bottom for read updates and incoming messages', () => {
    const message = {
      messageId: 1, threadId: 9, senderUserId: '1', senderUserName: '나',
      recipientUserId: '2', recipientUserName: '상대방', subject: null, content: '첫 메시지',
      readAt: null, createdAt: '2026-10-30T10:00:00',
    };
    const chat = (messages: (typeof message | { readAt: string } & Omit<typeof message, 'readAt'>)[]) => (
      <MemoryRouter><MessageChatView otherUserId="2" messages={messages} /></MemoryRouter>
    );
    const { rerender } = render(chat([message]));
    const scroller = screen.getByTestId('message-chat-view');
    Object.defineProperties(scroller, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 300 },
    });
    scroller.scrollTop = 150;
    fireEvent.scroll(scroller);
    rerender(chat([{ ...message, readAt: '2026-10-30T10:01:00' }]));
    expect(scroller.scrollTop).toBe(150);
    Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 1100 });
    rerender(chat([message, { ...message, messageId: 2, content: '새 메시지' }]));
    expect(scroller.scrollTop).toBe(150);
    scroller.scrollTop = 800;
    fireEvent.scroll(scroller);
    Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 1200 });
    rerender(chat([message, { ...message, messageId: 3, content: '하단 새 메시지' }]));
    expect(scroller.scrollTop).toBe(1200);
  });

  it('linkifies urls and shows document, notice, and OG previews under the bubble', async () => {
    const documentUrl = `${window.location.origin}/groupware/doc/write?share=${token('A')}`;
    const noticeUrl = `${window.location.origin}/groupware/community/notice?share=${token('B')}`;
    mocks.getSharedDocumentPreview.mockResolvedValue({
      electronicApprovalId: 21,
      title: '공유 결재 문서',
      documentType: 'BUSINESS_CONTACT',
      drafterName: '홍길동',
      summary: '문서 요약',
    });
    mocks.resolveNoticeLinkPreview.mockResolvedValue({
      id: 34, title: '공유 공지', subtitle: '운영', description: '공지 요약',
    });
    mocks.getExternalLinkPreview.mockResolvedValue({
      siteName: 'Example', title: '외부 OG 제목', description: '외부 설명', imageUrl: null,
    });

    render(
      <MemoryRouter>
        <MessageChatView
          otherUserId="2"
          messages={[{
            messageId: 1,
            threadId: 9,
            senderUserId: '2',
            senderUserName: '상대방',
            recipientUserId: '1',
            recipientUserName: '나',
            subject: null,
            content: `문서 ${documentUrl}\n공지 ${noticeUrl}\n<b>외부</b> https://example.com/post.`,
            readAt: null,
            createdAt: '2026-10-30T10:00:00',
          }]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'https://example.com/post' }))
      .toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: documentUrl }))
      .toHaveAttribute('href', `/groupware/doc/write?share=${token('A')}`);
    expect(screen.getByText(/<b>외부<\/b>/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '문서 상세 열기: 공유 결재 문서' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '공지 상세 열기: 공유 공지' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '외부 링크 열기: 외부 OG 제목' })).toBeInTheDocument();
    expect(mocks.getSharedDocumentPreview).toHaveBeenCalledWith(token('A'));
    expect(mocks.resolveNoticeLinkPreview).toHaveBeenCalledWith(token('B'));
    expect(mocks.getExternalLinkPreview).toHaveBeenCalledWith('https://example.com/post');
  });

  it('does not render previews for plain text messages', () => {
    render(
      <MemoryRouter>
        <MessageChatView
          otherUserId="2"
          messages={[{
            messageId: 2, threadId: 9, senderUserId: '1', senderUserName: '나',
            recipientUserId: '2', recipientUserName: '상대방', subject: null, content: '링크 없는 쪽지',
            readAt: null, createdAt: '2026-10-30T10:00:00',
          }]}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('message-link-previews')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
