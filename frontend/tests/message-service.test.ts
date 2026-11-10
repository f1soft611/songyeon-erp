// 2026-11-04 S_ERP message-service.test.ts 와 같은 확인. 송연은 사람 ID 가 사번 문자열, 이벤트 이름은 songyeon-erp: 이다
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiDelete: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => mocks);

import {
  createThread,
  deleteThread,
  getMessageSummary,
  getThreadMessages,
  listMessageThreads,
  resolveMessageThread,
} from '../src/pages/groupware/messages/services/messageService';

describe('message service', () => {
  beforeEach(() => {
    mocks.apiGet.mockReset();
    mocks.apiPost.mockReset();
  });

  it('rejects invalid text before sending a request', async () => {
    await expect(createThread({ recipientUserId: '5', content: '   ' }))
      .rejects.toThrow('쪽지 본문은 1자 이상 5,000자 이하여야 합니다.');
    await expect(createThread({ recipientUserId: '5', subject: 'x'.repeat(121), content: '내용' }))
      .rejects.toThrow('쪽지 제목은 120자 이하여야 합니다.');
    expect(mocks.apiPost).not.toHaveBeenCalled();
  });

  it('preserves API errors instead of returning a fake unread count', async () => {
    const failure = new Error('network failure');
    mocks.apiGet.mockRejectedValue(failure);

    await expect(getMessageSummary()).rejects.toBe(failure);
  });

  it('resolves a notification message to its authorized conversation', async () => {
    mocks.apiGet.mockResolvedValue({ threadId: 65 });

    await expect(resolveMessageThread(101)).resolves.toBe(65);
    expect(mocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/groupware/messages/101/thread',
    );
  });

  it('requests one message day before the cursor date and validates the page', async () => {
    mocks.apiGet.mockResolvedValue({ resultList: [], messageDate: '2026-10-27', hasPrevious: true });

    await expect(getThreadMessages(65, '2026-10-30'))
      .resolves.toEqual({ resultList: [], messageDate: '2026-10-27', hasPrevious: true });
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/groupware/messages/threads/65?beforeDate=2026-10-30');

    await expect(getThreadMessages(65, '2026/10/30')).rejects.toThrow('이전 대화 기준일이 올바르지 않습니다.');
    mocks.apiGet.mockResolvedValue({ resultList: [], messageDate: 'x', hasPrevious: true });
    await expect(getThreadMessages(65)).rejects.toThrow('쪽지 대화 응답을 확인할 수 없습니다.');
  });

  it('lists every conversation by default', async () => {
    mocks.apiGet.mockResolvedValue({ resultList: [], hasNext: false, nextBeforeUpdatedAt: null, nextBeforeThreadId: null });

    await listMessageThreads();
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/groupware/messages/threads?folder=ALL&limit=20');
  });

  it('deletes a conversation for the current user with DELETE', async () => {
    mocks.apiDelete.mockResolvedValue({});

    await deleteThread(65);
    expect(mocks.apiDelete).toHaveBeenCalledWith('/api/v1/groupware/messages/threads/65');

    mocks.apiDelete.mockClear();
    await expect(deleteThread(0)).rejects.toThrow('대화 ID가 올바르지 않습니다.');
    expect(mocks.apiDelete).not.toHaveBeenCalled();
  });
});
