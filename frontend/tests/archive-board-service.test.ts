import { act, renderHook, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiDownload: vi.fn(),
  apiGet: vi.fn(),
  apiPostFormData: vi.fn(),
  apiPut: vi.fn(),
}));

const commonCodeMocks = vi.hoisted(() => ({
  fetchCommonCodeGroups: vi.fn(),
  fetchCommonCodeItems: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);
vi.mock(
  '../src/pages/co/master/common-code/services/commonCodeManagement.service',
  () => commonCodeMocks,
);

import {
  deleteArchiveAttachment,
  downloadArchiveAttachment,
  fetchArchiveFiles,
  updateArchiveFile,
  uploadArchiveFile,
} from '../src/pages/groupware/community/archive/services/archiveBoardService';
import { useArchiveCategories } from '../src/pages/groupware/community/archive/hooks/useArchiveCategories';
import { useArchiveList } from '../src/pages/groupware/community/archive/hooks/useArchiveList';

describe('archive board service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serializes all archive filters without pagination', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [{ boardFileId: 7, fileName: 'Travel policy.pdf' }],
      resultCnt: 21,
    });
    await expect(
      fetchArchiveFiles({
        keyword: 'travel policy',
        folderCode: 'GUIDE',
        uploadedFrom: '2025-10-20',
        uploadedTo: '2026-10-20',
        fileType: 'PDF',
      }),
    ).resolves.toEqual({
      resultList: [{ boardFileId: 7, fileName: 'Travel policy.pdf' }],
      resultCnt: 21,
    });
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/archive/files?keyword=travel+policy&folderCode=GUIDE&uploadedFrom=2025-10-20&uploadedTo=2026-10-20&fileType=PDF',
    );
  });

  it('omits empty optional list filters and normalizes missing ResultVO fields', async () => {
    apiMocks.apiGet.mockResolvedValue({});

    await expect(
      fetchArchiveFiles({
        keyword: '  ',
        folderCode: '',
        uploadedFrom: '',
        uploadedTo: '',
        fileType: 'ALL',
      }),
    ).resolves.toEqual({
      resultList: [],
      resultCnt: 0,
    });
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/archive/files',
    );
  });

  it('passes the list request signal to the API', async () => {
    const signal = new AbortController().signal;
    apiMocks.apiGet.mockResolvedValue({ resultList: [], resultCnt: 0 });
    await fetchArchiveFiles(
      {
        keyword: ' policy ',
        folderCode: 'GUIDE',
        uploadedFrom: '',
        uploadedTo: '',
        fileType: 'ALL',
      },
      signal,
    );
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/archive/files?keyword=policy&folderCode=GUIDE',
      signal,
    );
  });

  it('uploads one file as multipart field file and optional folderCode', async () => {
    const file = new File(['archive data'], 'guide.pdf', {
      type: 'application/pdf',
    });
    apiMocks.apiPostFormData.mockResolvedValue({ item: { boardFileId: 4 } });

    await expect(uploadArchiveFile(file, 'GUIDE')).resolves.toEqual({
      boardFileId: 4,
    });

    const [path, body] = apiMocks.apiPostFormData.mock.calls[0] as [
      string,
      FormData,
    ];
    expect(path).toBe('/api/v1/groupware/boards/archive/files');
    expect(body.get('file')).toBe(file);
    expect(body.get('folderCode')).toBe('GUIDE');
  });

  it('uses file update endpoint and validates item envelope', async () => {
    apiMocks.apiPut.mockResolvedValue({
      item: { boardFileId: 12, fileName: 'renamed.pdf' },
    });
    await expect(
      updateArchiveFile(12, {
        postId: 9,
        fileName: 'renamed.pdf',
        folderCode: 'GENERAL',
      }),
    ).resolves.toMatchObject({ boardFileId: 12, fileName: 'renamed.pdf' });
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/archive/files/12',
      {
        postId: 9,
        fileName: 'renamed.pdf',
        folderCode: 'GENERAL',
      },
    );
  });

  it('passes post ownership parameters to attachment removal and download', async () => {
    apiMocks.apiDelete.mockResolvedValue(undefined);
    apiMocks.apiDownload.mockResolvedValue(undefined);
    const file = { boardFileId: 12, postId: 9, fileName: 'guide.pdf' };

    await deleteArchiveAttachment(12, 9);
    await downloadArchiveAttachment(file);

    expect(apiMocks.apiDelete).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/archive/attachments/12?postId=9',
    );
    expect(apiMocks.apiDownload).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/archive/attachments/12/download?postId=9',
      'guide.pdf',
    );
  });
});

describe('archive hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads all files with the recent-year default filters', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [{ boardFileId: 7, fileName: 'guide.pdf' }],
      resultCnt: 1,
    });
    const { result } = renderHook(() => useArchiveList());
    const today = dayjs().format('YYYY-MM-DD');
    const uploadedFrom = dayjs().subtract(1, 'year').format('YYYY-MM-DD');

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.filters).toEqual({
      keyword: '',
      folderCode: '',
      uploadedFrom,
      uploadedTo: today,
      fileType: 'ALL',
    });
    expect(result.current.rows).toEqual([
      { boardFileId: 7, fileName: 'guide.pdf' },
    ]);
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      `/api/v1/groupware/boards/archive/files?uploadedFrom=${uploadedFrom}&uploadedTo=${today}`,
      expect.any(AbortSignal),
    );
  });

  it('exposes request errors and retries without a success-shaped fallback', async () => {
    apiMocks.apiGet
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({ resultList: [], resultCnt: 0 });
    const { result } = renderHook(() => useArchiveList());

    await waitFor(() =>
      expect(result.current.error?.message).toBe('network unavailable'),
    );
    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(apiMocks.apiGet).toHaveBeenCalledTimes(2);
  });

  it('loads active and inactive categories from the editable archive category group', async () => {
    commonCodeMocks.fetchCommonCodeGroups.mockResolvedValue([
      { id: '5', groupCode: 'WF_ARCHIVE_CATEGORY', useAt: 'Y' },
    ]);
    commonCodeMocks.fetchCommonCodeItems.mockResolvedValue([
      {
        id: '1',
        groupId: '5',
        itemCode: 'POLICY',
        itemNm: 'Policies',
        useAt: 'Y',
      },
      {
        id: '2',
        groupId: '5',
        itemCode: 'OLD',
        itemNm: 'Retired',
        useAt: 'N',
      },
      {
        id: '3',
        groupId: '5',
        itemCode: 'GUIDE',
        itemNm: 'Guides',
        useAt: 'Y',
      },
    ]);

    const { result } = renderHook(() => useArchiveCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(commonCodeMocks.fetchCommonCodeGroups).toHaveBeenCalledWith({
      groupCode: 'WF_ARCHIVE_CATEGORY',
    });
    expect(commonCodeMocks.fetchCommonCodeItems).toHaveBeenCalledWith('5');
    expect(result.current.categories).toEqual([
      { code: 'POLICY', name: 'Policies', active: true },
      { code: 'OLD', name: 'Retired', active: false },
      { code: 'GUIDE', name: 'Guides', active: true },
    ]);
    expect(result.current.groupId).toBe('5');
    expect(result.current.items).toHaveLength(3);
  });
});
