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
  COMMON_COMMENT_OWNER_TYPE,
  createCommonComment,
  deleteCommonFile,
  downloadCommonFile,
  fetchCommonComments,
  fetchCommonFiles,
  updateCommonComment,
  uploadCommonFile,
} from '../src/shared/services/commonContentApi';

describe('common content API contracts', () => {
  it('fetches files by owner type and owner id', async () => {
    apiMocks.apiGet.mockResolvedValue({ resultList: [{ fileId: 7 }] });

    await expect(fetchCommonFiles('NOTICE_COMMENT', 42)).resolves.toEqual([
      { fileId: 7 },
    ]);

    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/common/files?ownerType=NOTICE_COMMENT&ownerId=42',
    );
  });

  it('uploads a file with the owner contract in multipart form data', async () => {
    const file = new File(['content'], 'comment.txt', { type: 'text/plain' });
    apiMocks.apiPostFormData.mockResolvedValue({ item: { fileId: 8 } });

    await uploadCommonFile(COMMON_COMMENT_OWNER_TYPE, 42, file, 'writer-1');

    const formData = apiMocks.apiPostFormData.mock.calls[0][1] as FormData;
    expect(apiMocks.apiPostFormData.mock.calls[0][0]).toBe(
      '/api/v1/common/files/upload',
    );
    expect(formData.get('ownerType')).toBe('NOTICE_COMMENT');
    expect(formData.get('ownerId')).toBe('42');
    expect(formData.get('uploaderId')).toBe('writer-1');
    expect(formData.get('file')).toBe(file);
  });

  it('deletes and downloads a file with its owner query contract', async () => {
    apiMocks.apiDelete.mockResolvedValue(undefined);
    apiMocks.apiDownload.mockResolvedValue(undefined);

    await deleteCommonFile('NOTICE_COMMENT', 42, 8);
    await downloadCommonFile('NOTICE_COMMENT', 42, 8);

    expect(apiMocks.apiDelete).toHaveBeenCalledWith(
      '/api/v1/common/files/8?ownerType=NOTICE_COMMENT&ownerId=42',
    );
    expect(apiMocks.apiDownload).toHaveBeenCalledWith(
      '/api/v1/common/files/8/download?ownerType=NOTICE_COMMENT&ownerId=42',
    );
  });

  it('keeps legacy fileId-only delete and download contracts', async () => {
    apiMocks.apiDelete.mockResolvedValue(undefined);
    apiMocks.apiDownload.mockResolvedValue(undefined);

    await deleteCommonFile(8);
    await downloadCommonFile(8);

    expect(apiMocks.apiDelete).toHaveBeenCalledWith('/api/v1/common/files/8');
    expect(apiMocks.apiDownload).toHaveBeenCalledWith(
      '/api/v1/common/files/8/download',
    );
  });

  it('returns paged comment metadata while accepting the legacy resultList field', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [{ commentId: 3 }],
      comments: [{ commentId: 3 }],
      hasPrevious: true,
      nextBeforeCommentId: 2,
    });

    await expect(
      fetchCommonComments('NOTICE', 42, {
        limit: 10,
        beforeCommentId: 20,
      }),
    ).resolves.toEqual({
      comments: [{ commentId: 3 }],
      hasPrevious: true,
      nextBeforeCommentId: 2,
    });

    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/common/comments?ownerType=NOTICE&ownerId=42&limit=10&beforeCommentId=20',
    );
  });

  it('falls back to a legacy resultList-only comment response', async () => {
    apiMocks.apiGet.mockResolvedValue({ resultList: [{ commentId: 3 }] });

    await expect(fetchCommonComments('NOTICE', 42)).resolves.toEqual({
      comments: [{ commentId: 3 }],
      hasPrevious: false,
      nextBeforeCommentId: undefined,
    });
  });

  it('sends editor HTML unchanged in create and update comment payloads', async () => {
    apiMocks.apiPost.mockResolvedValue({ item: { commentId: 1 } });
    apiMocks.apiPut.mockResolvedValue({ item: { commentId: 1 } });
    const content = '<p><strong>공지</strong> 본문</p>';

    await createCommonComment('NOTICE', 42, { content, parentCommentId: 5 });
    await updateCommonComment('NOTICE', 42, 1, { content });

    expect(apiMocks.apiPost).toHaveBeenCalledWith('/api/v1/common/comments', {
      ownerType: 'NOTICE',
      ownerId: 42,
      content,
      parentCommentId: 5,
    });
    expect(apiMocks.apiPut).toHaveBeenCalledWith('/api/v1/common/comments/1', {
      ownerType: 'NOTICE',
      ownerId: 42,
      content,
    });
  });
});
