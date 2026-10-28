import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoticeFeedItem } from '../src/pages/groupware/community/notice/types/community.types';

const commonMocks = vi.hoisted(() => ({
  createCommonComment: vi.fn(),
  deleteCommonComment: vi.fn(),
  deleteCommonFile: vi.fn(),
  downloadCommonFile: vi.fn(),
  fetchCommonComments: vi.fn(),
  uploadCommonFile: vi.fn(),
  updateCommonComment: vi.fn(),
}));

vi.mock('../src/shared/services/commonContentApi', () => commonMocks);

import { useNoticeComments } from '../src/pages/groupware/community/notice/hooks/useNoticeComments';

const notice: NoticeFeedItem = {
  id: 7,
  title: '공지',
  meta: '운영팀 · 날짜 · 조회 0',
  state: '공지',
  summary: '본문',
  body: '본문',
  commentCount: 0,
  comments: [],
};

describe('useNoticeComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commonMocks.createCommonComment.mockResolvedValue({
      commentId: 51,
      writerName: '사용자',
      content: '새 댓글',
    });
  });

  it('creates a comment and updates the notice tree and count', async () => {
    const showSuccess = vi.fn();
    const { result } = renderHook(() => {
      const [noticeItems, setNoticeItems] = useState([notice]);
      const comments = useNoticeComments({
        setNoticeItems,
        showError: vi.fn(),
        showSuccess,
      });
      return { noticeItems, comments };
    });

    await act(async () => {
      await result.current.comments.handleAddComment(7, '<p>새 댓글</p>');
    });

    expect(commonMocks.createCommonComment).toHaveBeenCalledWith(
      'NOTICE',
      7,
      '<p>새 댓글</p>',
      undefined,
    );
    expect(result.current.noticeItems[0].commentCount).toBe(1);
    expect(result.current.noticeItems[0].comments?.[0].content).toBe('새 댓글');
    expect(showSuccess).toHaveBeenCalledWith('댓글이 등록되었습니다.');
  });

  it('preserves image MIME metadata for files uploaded while editing a comment', async () => {
    commonMocks.updateCommonComment.mockResolvedValue({
      commentId: 51,
      content: '<p>수정 댓글</p>',
    });
    commonMocks.uploadCommonFile.mockResolvedValue({
      fileId: 77,
      fileName: 'photo.png',
      fileSize: 123,
      mimeType: 'image/png',
    });
    const noticeWithComment: NoticeFeedItem = {
      ...notice,
      comments: [
        {
          id: 51,
          author: '사용자',
          time: '2026-10-20 10:00',
          content: '기존 댓글',
          attachments: [],
        },
      ],
    };
    const { result } = renderHook(() => {
      const [noticeItems, setNoticeItems] = useState([noticeWithComment]);
      const comments = useNoticeComments({
        setNoticeItems,
        showError: vi.fn(),
        showSuccess: vi.fn(),
      });
      return { noticeItems, comments };
    });

    await act(async () => {
      await result.current.comments.handleUpdateComment(
        7,
        51,
        '<p>수정 댓글</p>',
        [new File(['image'], 'photo.png', { type: 'image/png' })],
      );
    });

    expect(result.current.noticeItems[0].comments?.[0].attachments?.[0]).toMatchObject({
      id: '77',
      name: 'photo.png',
      size: 123,
      mimeType: 'image/png',
    });
  });
});
