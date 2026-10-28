import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../src/pages/groupware/documents/write/services/documentApproval.service', () => ({
  listDocumentFiles: api.list,
}));
import { useDocumentFiles } from '../src/pages/groupware/documents/write/hooks/useDocumentFiles';
import type { DocumentFileItem } from '../src/pages/groupware/documents/write/types/documentWrite.types';

const makeFile = (fileId: number): DocumentFileItem => ({
  fileId, fileName: `file-${fileId}.pdf`, fileSize: 10, mimeType: 'application/pdf',
  uploadedByName: 'Sample User', createdAt: '2026-10-20T09:00:00Z',
  electronicApprovalId: 10, documentTitle: 'Sample Document', commentId: null,
});
const first = Array.from({ length: 20 }, (_, index) => makeFile(45 - index));

describe('document file paging state', () => {
  beforeEach(() => vi.clearAllMocks());
  it('loads exactly 20 then 20 then 5 and prevents duplicate in-flight requests', async () => {
    api.list.mockResolvedValueOnce({ resultList: first, hasNext: true, nextBeforeFileId: 26 });
    const { result } = renderHook(() => useDocumentFiles(true, { scope: 'ALL' }, 0));
    await waitFor(() => expect(result.current.items).toHaveLength(20));
    let resolvePage!: (value: unknown) => void;
    api.list.mockImplementationOnce(() => new Promise((resolve) => { resolvePage = resolve; }));
    act(() => { result.current.loadMore(); result.current.loadMore(); });
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(api.list).toHaveBeenLastCalledWith({ scope: 'ALL', beforeFileId: 26 });
    await act(async () => resolvePage({
      resultList: Array.from({ length: 20 }, (_, index) => makeFile(25 - index)),
      hasNext: true, nextBeforeFileId: 6,
    }));
    expect(result.current.items).toHaveLength(40);
    api.list.mockResolvedValueOnce({
      resultList: Array.from({ length: 5 }, (_, index) => makeFile(5 - index)),
      hasNext: false, nextBeforeFileId: null,
    });
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(45));
    act(() => result.current.loadMore());
    expect(api.list).toHaveBeenCalledTimes(3);
    expect(result.current.items.map((file) => file.fileId)).toEqual(
      Array.from({ length: 45 }, (_, index) => 45 - index),
    );
  });

  it('ignores late responses after changing scope and does not load while disabled', async () => {
    let resolveOld!: (value: unknown) => void;
    api.list.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    const { result, rerender } = renderHook(
      ({ enabled, scope }: { enabled: boolean; scope: 'ALL' | 'DRAFT' }) =>
        useDocumentFiles(enabled, { scope }, 0),
      { initialProps: { enabled: true, scope: 'ALL' } },
    );
    api.list.mockResolvedValueOnce({ resultList: [makeFile(1)], hasNext: false, nextBeforeFileId: null });
    rerender({ enabled: true, scope: 'DRAFT' });
    await waitFor(() => expect(result.current.items.map((item) => item.fileId)).toEqual([1]));
    await act(async () => resolveOld({ resultList: first, hasNext: true, nextBeforeFileId: 26 }));
    expect(result.current.items.map((item) => item.fileId)).toEqual([1]);
    rerender({ enabled: false, scope: 'DRAFT' });
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('preserves existing rows on next-page errors and retries the failed cursor', async () => {
    api.list.mockResolvedValueOnce({ resultList: first, hasNext: true, nextBeforeFileId: 26 });
    const { result } = renderHook(() => useDocumentFiles(true, { scope: 'ALL' }, 0));
    await waitFor(() => expect(result.current.items).toHaveLength(20));
    api.list.mockRejectedValueOnce(new Error('파일 조회 실패'));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.error).toBe('파일 조회 실패'));
    expect(result.current.items).toHaveLength(20);
    act(() => result.current.loadMore());
    expect(api.list).toHaveBeenCalledTimes(2);
    api.list.mockResolvedValueOnce({ resultList: [makeFile(25)], hasNext: false, nextBeforeFileId: null });
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.items).toHaveLength(21));
    expect(api.list).toHaveBeenLastCalledWith({ scope: 'ALL', beforeFileId: 26 });
  });

  it('retries an initial failure and resets the cursor for filters and refresh', async () => {
    api.list.mockRejectedValueOnce(new Error('첫 조회 실패'));
    const { result, rerender } = renderHook(
      ({ documentType, electronicApprovalId, version }: {
        documentType?: 'DRAFTING' | 'BUSINESS_CONTACT'; electronicApprovalId?: number; version: number;
      }) => useDocumentFiles(true, { scope: 'ALL', documentType, electronicApprovalId }, version),
      { initialProps: { documentType: 'DRAFTING', electronicApprovalId: 10, version: 0 } },
    );
    await waitFor(() => expect(result.current.error).toBe('첫 조회 실패'));
    api.list.mockResolvedValueOnce({ resultList: first, hasNext: true, nextBeforeFileId: 26 });
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.items).toHaveLength(20));
    api.list.mockResolvedValue({ resultList: [], hasNext: false, nextBeforeFileId: null });
    rerender({ documentType: 'BUSINESS_CONTACT', electronicApprovalId: 11, version: 0 });
    await waitFor(() => expect(result.current.items).toHaveLength(0));
    expect(api.list).toHaveBeenLastCalledWith({
      scope: 'ALL', documentType: 'BUSINESS_CONTACT', electronicApprovalId: 11, beforeFileId: undefined,
    });
    rerender({ documentType: 'BUSINESS_CONTACT', electronicApprovalId: 11, version: 1 });
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(4));
    expect(api.list).toHaveBeenLastCalledWith({
      scope: 'ALL', documentType: 'BUSINESS_CONTACT', electronicApprovalId: 11, beforeFileId: undefined,
    });
  });
});
