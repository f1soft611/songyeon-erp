import { describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiDownload: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPostFormData: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

import {
  buildNoticeShareLink,
  deleteNoticeEmbeddedImage,
  downloadNoticeAttachment,
  fetchNoticePosts,
  getSharedNoticePreview,
  updateNoticePinned,
} from '../src/pages/groupware/community/notice/services/noticeBoardService';

describe('notice board downloads', () => {
  it('passes the uploaded file name to the download client', async () => {
    apiMocks.apiDownload.mockResolvedValue(undefined);

    await downloadNoticeAttachment({
      boardFileId: 5,
      postId: 54,
      fileName: '업무일정표.xlsx',
    });

    expect(apiMocks.apiDownload).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/notice/attachments/5/download?postId=54',
      '업무일정표.xlsx',
    );
  });
});

describe('notice embedded image temporary cleanup', () => {
  it('deletes a temporary upload by token and URL-encoded file name', async () => {
    apiMocks.apiDelete.mockResolvedValue(undefined);

    await deleteNoticeEmbeddedImage('token-1', 'pasted image.png');

    expect(apiMocks.apiDelete).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/notice/embedded-images/temp/token-1?fileName=pasted+image.png',
    );
  });
});

describe('notice board pagination', () => {
  it('requests pinned posts and preserves the shared list count', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [{ postId: 7, isPinned: 'Y' }],
      resultCnt: 21,
    });

    const result = await fetchNoticePosts(2, 20, 'maintenance', undefined, 'Y');

    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/notice/posts?pageIndex=2&pageUnit=20&keyword=maintenance&isPinned=Y',
    );
    expect(result).toEqual({
      resultList: [{ postId: 7, isPinned: 'Y' }],
      resultCnt: 21,
    });
  });

  describe('notice share links', () => {
    it('creates a canonical share URL from a valid server token', async () => {
      const token = `v1.${'A'.repeat(59)}`;
      apiMocks.apiPost.mockResolvedValue({ item: { token } });

      await expect(buildNoticeShareLink(42)).resolves.toBe(
        `${window.location.origin}/groupware/community/notice?share=${token}`,
      );
      expect(apiMocks.apiPost).toHaveBeenCalledWith(
        '/api/v1/groupware/boards/notice/posts/42/share-link',
        {},
      );
    });

    it('rejects invalid IDs and malformed tokens without returning a fallback link', async () => {
      apiMocks.apiPost.mockClear();
      await expect(buildNoticeShareLink(0)).rejects.toThrow();
      expect(apiMocks.apiPost).not.toHaveBeenCalled();

      apiMocks.apiPost.mockResolvedValue({ item: { token: 'bad-token' } });
      await expect(buildNoticeShareLink(42)).rejects.toThrow();
    });

    it('resolves a shared notice token and rejects malformed preview responses', async () => {
      const token = `v1.${'B'.repeat(59)}`;
      const post = { postId: 42, title: '공지 제목', noticeGubunCode: 'OPS' };
      apiMocks.apiGet.mockResolvedValue({ item: post });

      await expect(getSharedNoticePreview(token)).resolves.toEqual(post);
      expect(apiMocks.apiGet).toHaveBeenCalledWith(
        `/api/v1/groupware/boards/notice/shared-post?token=${token}`,
      );

      apiMocks.apiGet.mockResolvedValueOnce({ item: { title: '잘못된 응답' } });
      await expect(getSharedNoticePreview(token)).rejects.toThrow();
    });
  });

  it('normalizes a snake case pin field from the list response', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [{ postId: 8, is_pinned: 'Y' }],
      resultCnt: 1,
    });

    const result = await fetchNoticePosts(1, 20, '');

    expect(result.resultList[0]?.isPinned).toBe('Y');
  });

  it('updates only the pinned state through the dedicated endpoint', async () => {
    apiMocks.apiPut.mockResolvedValue(undefined);

    await updateNoticePinned(77, 'Y');

    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/notice/posts/77/pin',
      { isPinned: 'Y' },
    );
  });
});
