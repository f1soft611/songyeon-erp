// 2026-11-04 S_ERP message-inbox.test.tsx 와 같은 확인. 송연은 사람 ID 가 사번 문자열, 이벤트 이름은 songyeon-erp: 이다
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listMessageThreads: vi.fn(),
  getThreadMessages: vi.fn(),
  markThreadRead: vi.fn(),
  createThread: vi.fn(),
  replyToThread: vi.fn(),
  deleteThread: vi.fn(),
  fetchDraftFormUsers: vi.fn(),
}));

vi.mock('../src/pages/groupware/messages/services/messageService', () => mocks);
vi.mock('../src/pages/co/workflow/form/services/draftFormManagement.service', () => ({
  fetchDraftFormUsers: mocks.fetchDraftFormUsers,
}));

import { MessageInboxPage } from '../src/pages/groupware/messages/MessageInboxPage';

function dayPage(resultList: unknown[], messageDate = '2026-10-30', hasPrevious = false) {
  return { resultList, messageDate, hasPrevious };
}

function chatMessage(messageId: number, content: string, createdAt: string) {
  return {
    threadId: 31, messageId, senderUserId: '22', senderUserName: '홍길동',
    recipientUserId: '11', recipientUserName: '나', subject: '일정 확인',
    content, createdAt, readAt: createdAt,
  };
}

describe('MessageInboxPage', () => {
  it('receives realtime messages without losing the reply draft', async () => {
    render(<MemoryRouter><MessageInboxPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /홍길동/ }));
    await screen.findByText('<script>alert(1)</script>');
    const input = screen.getByRole('textbox', { name: /답장/ });
    fireEvent.change(input, { target: { value: '작성 중인 답장' } });
    mocks.getThreadMessages.mockResolvedValue(dayPage([
      chatMessage(81, '기존 메시지', '2026-10-30T09:30:00'),
      chatMessage(82, '실시간 수신 메시지', '2026-10-30T09:31:00'),
    ]));
    fireEvent(window, new CustomEvent('songyeon-erp:realtime', { detail: { areas: ['MESSAGE'] } }));
    expect(await screen.findByText('실시간 수신 메시지')).toBeVisible();
    expect(input).toHaveValue('작성 중인 답장');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('does not replace a newly selected conversation with an older failed request', async () => {
    const first = (await mocks.listMessageThreads()).resultList[0];
    mocks.listMessageThreads.mockResolvedValue({
      resultList: [first, { ...first, threadId: 32, otherUserName: '다른 사용자' }],
    });
    let rejectOlder!: (error: Error) => void;
    mocks.getThreadMessages.mockImplementationOnce(() => new Promise((_resolve, reject) => {
      rejectOlder = reject;
    })).mockResolvedValue(dayPage([chatMessage(90, '새로 선택한 대화', '2026-10-30T09:32:00')]));
    render(<MemoryRouter><MessageInboxPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /홍길동/ }));
    fireEvent.click(screen.getByRole('button', { name: /다른 사용자/ }));
    await screen.findByText('새로 선택한 대화');
    await act(async () => { rejectOlder(new Error('older request failed')); });
    expect(screen.getByText('새로 선택한 대화')).toBeVisible();
    expect(screen.queryByText('쪽지 대화를 불러오지 못했습니다.')).not.toBeInTheDocument();
  });

  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.listMessageThreads.mockResolvedValue({
      resultList: [{
        threadId: 31,
        subject: '일정 확인',
        updatedAt: '2026-10-30T09:30:00',
        otherUserId: '22',
        otherUserName: '홍길동',
        latestContent: '오늘 일정 확인 부탁합니다.',
        latestMessageAt: '2026-10-30T09:30:00',
        unreadCount: 1,
      }],
      hasNext: false,
      nextBeforeUpdatedAt: null,
      nextBeforeThreadId: null,
    });
    mocks.getThreadMessages.mockResolvedValue(dayPage([{
      threadId: 31,
      messageId: 81,
      senderUserId: '22',
      senderUserName: '홍길동',
      recipientUserId: '11',
      recipientUserName: '나',
      subject: '일정 확인',
      content: '<script>alert(1)</script>',
      createdAt: '2026-10-30T09:30:00',
      readAt: null,
    }]));
    mocks.markThreadRead.mockResolvedValue(undefined);
    mocks.fetchDraftFormUsers.mockResolvedValue([]);
  });

  it('marks a selected conversation read and renders message content as text', async () => {
    render(
      <MemoryRouter>
        <MessageInboxPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /홍길동/ }));

    expect(await screen.findByText('<script>alert(1)</script>')).toBeVisible();
    expect(document.querySelector('script')).toBeNull();
    await waitFor(() => {
      expect(mocks.markThreadRead).toHaveBeenCalledWith(31);
    });
  });

  it('renders the conversation as chat bubbles split by sender like a messenger', async () => {
    mocks.getThreadMessages.mockResolvedValue(dayPage([
      {
        threadId: 31, messageId: 81, senderUserId: '22', senderUserName: '홍길동',
        recipientUserId: '11', recipientUserName: '나', subject: '일정 확인',
        content: '첫 메시지', createdAt: '2026-10-30T09:30:00', readAt: '2026-10-30T09:31:00',
      },
      {
        threadId: 31, messageId: 82, senderUserId: '22', senderUserName: '홍길동',
        recipientUserId: '11', recipientUserName: '나', subject: '일정 확인',
        content: '같은 분 메시지', createdAt: '2026-10-30T09:30:30', readAt: '2026-10-30T09:31:00',
      },
      {
        threadId: 31, messageId: 83, senderUserId: '11', senderUserName: '나',
        recipientUserId: '22', recipientUserName: '홍길동', subject: '일정 확인',
        content: '내 답장', createdAt: '2026-10-30T09:40:00', readAt: null,
      },
    ]));
    render(
      <MemoryRouter>
        <MessageInboxPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /홍길동/ }));

    const mine = (await screen.findByText('내 답장')).closest('[data-chat-direction]');
    const theirs = screen.getByText('첫 메시지').closest('[data-chat-direction]');
    expect(mine).toHaveAttribute('data-chat-direction', 'sent');
    expect(theirs).toHaveAttribute('data-chat-direction', 'received');
    expect(screen.getAllByTestId('chat-sender-name')).toHaveLength(1);
    expect(screen.getAllByTestId('chat-message-time')).toHaveLength(2);
    expect(screen.getByTestId('chat-unread-mark')).toHaveTextContent('1');
    expect(screen.getAllByTestId('chat-date-divider')).toHaveLength(1);
  });

  it('keeps the inbox within available height and the reply form outside the message scroller', async () => {
    render(
      <MemoryRouter>
        <MessageInboxPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /홍길동/ }));
    await screen.findByTestId('message-chat-view');

    expect(screen.getByTestId('message-inbox-shell')).toHaveStyle({
      height: '100%',
      minHeight: '0',
      overflow: 'hidden',
    });
    expect(screen.getByTestId('message-inbox-layout')).toHaveStyle({
      flex: '1 1 0%',
      minHeight: '0',
    });
    expect(screen.getByTestId('message-thread-list-panel')).toHaveStyle({
      minHeight: '0',
      overflow: 'auto',
    });
    expect(screen.getByTestId('message-chat-view')).toHaveStyle({
      flex: '1 1 0%',
      minHeight: '0',
      overflow: 'auto',
    });
    expect(screen.getByTestId('message-reply-form')).toHaveStyle({
      flexShrink: '0',
    });
  });

  it('renders the thread list like a messenger chat list', async () => {
    render(
      <MemoryRouter>
        <MessageInboxPage />
      </MemoryRouter>,
    );

    const row = await screen.findByTestId('message-thread-row');
    expect(row.querySelector('[data-testid="message-thread-avatar"]')).toHaveTextContent('홍');
    expect(row.querySelector('[data-testid="message-thread-name"]')).toHaveTextContent('홍길동');
    expect(row.querySelector('[data-testid="message-thread-preview"]')).toHaveTextContent('오늘 일정 확인 부탁합니다.');
    expect(row.querySelector('[data-testid="message-thread-time"]')?.textContent).toMatch(/오전 9:30|2026|\d+월/);
    expect(row.querySelector('[data-testid="message-thread-unread"]')).toHaveTextContent('1');
  });

  it('refreshes quietly after sending a reply without flashing loaders', async () => {
    render(
      <MemoryRouter>
        <MessageInboxPage />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: /홍길동/ }));
    await screen.findByText('<script>alert(1)</script>');

    mocks.replyToThread.mockResolvedValue({});
    mocks.listMessageThreads.mockReturnValue(new Promise(() => undefined));
    fireEvent.change(screen.getByRole('textbox', { name: '답장' }), { target: { value: '확인했습니다' } });
    fireEvent.click(screen.getByRole('button', { name: '전송' }));

    await waitFor(() => expect(mocks.listMessageThreads).toHaveBeenCalledTimes(2));
    expect(screen.queryByLabelText('쪽지함 불러오는 중')).toBeNull();
    expect(screen.queryByLabelText('대화 불러오는 중')).toBeNull();
    expect(screen.getByTestId('message-thread-row')).toBeVisible();
    expect(screen.getByTestId('message-chat-view')).toBeVisible();
  });

  it('shows the profile photo when available and the initial otherwise', async () => {
    mocks.listMessageThreads.mockResolvedValue({
      resultList: [{
        threadId: 31, subject: '일정 확인', updatedAt: '2026-10-30T09:30:00', otherUserId: '22',
        otherUserName: '홍길동', otherUserProfileImage: 'data:image/png;base64,AAAA',
        latestContent: '오늘 일정 확인 부탁합니다.', latestMessageAt: '2026-10-30T09:30:00', unreadCount: 0,
      }],
      hasNext: false, nextBeforeUpdatedAt: null, nextBeforeThreadId: null,
    });
    render(
      <MemoryRouter>
        <MessageInboxPage />
      </MemoryRouter>,
    );

    const row = await screen.findByTestId('message-thread-row');
    expect(row.querySelector('[data-testid="message-thread-avatar"] img'))
      .toHaveAttribute('src', 'data:image/png;base64,AAAA');
    fireEvent.click(row);
    const bubble = (await screen.findByText('<script>alert(1)</script>')).closest('[data-chat-direction]');
    expect(bubble?.querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,AAAA');
  });

  it('opens compose in the common dialog with send before cancel', async () => {
    render(
      <MemoryRouter>
        <MessageInboxPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '새 쪽지' }));

    const actions = await screen.findByTestId('common-dialog-actions');
    const labels = Array.from(actions.querySelectorAll('button')).map((button) => button.textContent);
    expect(labels).toEqual(['보내기', '취소']);
    expect(screen.getByRole('dialog', { name: '새 쪽지' })).toBeVisible();
  });

  it('searches recipients by name or department with profile photo or initial', async () => {
    mocks.fetchDraftFormUsers.mockResolvedValue([
      { userId: '22', userNm: '홍길동', departmentNm: '영업팀', profileImage: '/profile/22.png' },
      { userId: '33', userNm: '관리자', departmentNm: '경영지원', profileImage: null },
      { userId: '44', userNm: '김철수', departmentNm: '관리팀', profileImage: null },
    ]);
    mocks.createThread.mockResolvedValue({ threadId: 31, messageId: 90 });
    render(
      <MemoryRouter>
        <MessageInboxPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '새 쪽지' }));
    const input = await screen.findByRole('combobox', { name: /받는 사람/ }) as HTMLInputElement;
    await waitFor(() => expect(mocks.fetchDraftFormUsers).toHaveBeenCalled());
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '관리' } });

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('관리자'),
      expect.stringContaining('김철수'),
    ]);
    expect(screen.getAllByTestId('recipient-option-avatar').map((avatar) => avatar.textContent)).toEqual(['관', '김']);

    fireEvent.change(input, { target: { value: '홍' } });
    const photoOption = await screen.findByRole('option', { name: /홍길동/ });
    expect(photoOption.querySelector('img')).toHaveAttribute('src', '/profile/22.png');
    fireEvent.click(photoOption);

    fireEvent.change(screen.getByLabelText(/내용/), { target: { value: '안녕하세요' } });
    fireEvent.click(screen.getByRole('button', { name: '보내기' }));

    await waitFor(() => expect(mocks.createThread).toHaveBeenCalledWith({
      recipientUserId: '22',
      subject: undefined,
      content: '안녕하세요',
    }));
  });

  it('shows one merged conversation list without inbox and sent toggles', async () => {
    render(
      <MemoryRouter>
        <MessageInboxPage />
      </MemoryRouter>,
    );

    await screen.findByTestId('message-thread-row');
    expect(mocks.listMessageThreads).toHaveBeenCalledWith('ALL');
    expect(screen.queryByRole('button', { name: '받은함' })).toBeNull();
    expect(screen.queryByRole('button', { name: '보낸함' })).toBeNull();
  });

  it('shows the other user avatar in the conversation header', async () => {
    render(
      <MemoryRouter>
        <MessageInboxPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /홍길동/ }));
    const panel = await screen.findByTestId('message-detail-panel');
    await waitFor(() => expect(panel.querySelector('[data-testid="message-detail-avatar"]')).toHaveTextContent('홍'));
  });

  it('loads the latest day first and the previous day when scrolled to the top', async () => {
    mocks.getThreadMessages
      .mockResolvedValueOnce(dayPage([chatMessage(90, '오늘 메시지', '2026-10-30T10:00:00')], '2026-10-30', true))
      .mockResolvedValueOnce(dayPage([chatMessage(80, '지난 메시지', '2026-10-27T15:00:00')], '2026-10-27', false));
    render(
      <MemoryRouter>
        <MessageInboxPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /홍길동/ }));
    await screen.findByText('오늘 메시지');
    expect(mocks.getThreadMessages).toHaveBeenLastCalledWith(31);
    expect(screen.queryByText('지난 메시지')).toBeNull();

    const chat = screen.getByTestId('message-chat-view');
    chat.scrollTop = 0;
    fireEvent.scroll(chat);

    expect(await screen.findByText('지난 메시지')).toBeVisible();
    expect(mocks.getThreadMessages).toHaveBeenLastCalledWith(31, '2026-10-30');
    const contents = screen.getAllByTestId('chat-bubble').map((bubble) => bubble.textContent);
    expect(contents).toEqual(['지난 메시지', '오늘 메시지']);

    fireEvent.scroll(chat);
    await waitFor(() => expect(mocks.getThreadMessages).toHaveBeenCalledTimes(2));
  });

  it('quietly refreshes the open conversation when the user returns to the tab', async () => {
    render(
      <MemoryRouter>
        <MessageInboxPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /홍길동/ }));
    await screen.findByText('<script>alert(1)</script>');
    mocks.markThreadRead.mockClear();
    mocks.listMessageThreads.mockResolvedValue({
      resultList: [{
        threadId: 31, subject: '일정 확인', updatedAt: '2026-10-30T10:00:00',
        otherUserId: '22', otherUserName: '홍길동', latestContent: '새로 온 메시지',
        latestMessageAt: '2026-10-30T10:00:00', unreadCount: 1,
      }],
      hasNext: false, nextBeforeUpdatedAt: null, nextBeforeThreadId: null,
    });
    mocks.getThreadMessages.mockResolvedValue(dayPage([
      chatMessage(81, '<script>alert(1)</script>', '2026-10-30T09:30:00'),
      chatMessage(82, '새로 온 메시지', '2026-10-30T10:00:00'),
    ]));
    const readListener = vi.fn();
    window.addEventListener('songyeon-erp:message-read', readListener);

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    fireEvent(document, new Event('visibilitychange'));

    expect(screen.queryByLabelText('대화 불러오는 중')).toBeNull();
    expect(screen.queryByLabelText('쪽지함 불러오는 중')).toBeNull();
    expect(await screen.findAllByText('새로 온 메시지')).not.toHaveLength(0);
    await waitFor(() => expect(mocks.markThreadRead).toHaveBeenCalledWith(31));
    expect(readListener).toHaveBeenCalled();
    expect(mocks.getThreadMessages).toHaveBeenLastCalledWith(31);
    window.removeEventListener('songyeon-erp:message-read', readListener);
  });

  it('deletes a conversation only after confirmation and removes it from the list', async () => {
    mocks.deleteThread.mockResolvedValue(undefined);
    const readListener = vi.fn();
    window.addEventListener('songyeon-erp:message-read', readListener);
    render(
      <MemoryRouter>
        <MessageInboxPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /홍길동/ }));
    await screen.findByText('<script>alert(1)</script>');
    readListener.mockClear();

    fireEvent.click(screen.getByRole('button', { name: '대화방 삭제' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('상대방이 새 쪽지를 보내면 대화방이 다시 표시됩니다.');
    expect(mocks.deleteThread).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(mocks.deleteThread).toHaveBeenCalledWith(31));
    await waitFor(() => expect(screen.queryByRole('button', { name: /홍길동/ })).toBeNull());
    expect(screen.getByText('쪽지가 없습니다.')).toBeVisible();
    expect(readListener).toHaveBeenCalled();
    window.removeEventListener('songyeon-erp:message-read', readListener);
  });

  it('keeps the conversation when deletion is cancelled', async () => {
    render(
      <MemoryRouter>
        <MessageInboxPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /홍길동/ }));
    await screen.findByText('<script>alert(1)</script>');
    fireEvent.click(screen.getByRole('button', { name: '대화방 삭제' }));
    fireEvent.click(await screen.findByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mocks.deleteThread).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /홍길동/ })).toBeVisible();
  });
});
