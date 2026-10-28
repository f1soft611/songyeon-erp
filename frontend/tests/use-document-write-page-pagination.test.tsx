import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDocumentWritePage } from '../src/pages/groupware/documents/write/hooks/useDocumentWritePage';
import {
  getDocumentApprovalSummary,
  listDocumentApprovals,
  listPinnedDocumentApprovals,
} from '../src/pages/groupware/documents/write/services/documentApproval.service';

vi.mock('../src/pages/groupware/documents/write/services/documentApproval.service', () => ({
  getDocumentApprovalSummary: vi.fn(),
  listDocumentApprovals: vi.fn(),
  listPinnedDocumentApprovals: vi.fn(),
  pinDocumentApproval: vi.fn(),
  unpinDocumentApproval: vi.fn(),
}));

describe('useDocumentWritePage pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDocumentApprovalSummary).mockResolvedValue({
      actionRequiredCount: 0,
      inProgressCount: 0,
      draftCount: 0,
      completedCount: 0,
      revisionRequestedCount: 0,
      rejectedCount: 0,
      notices: [],
    });
    vi.mocked(listDocumentApprovals).mockResolvedValue({ resultList: [], totalRowCount: 0 } as never);
    vi.mocked(listPinnedDocumentApprovals).mockResolvedValue([]);
  });

  const makeDocs = (start: number, count: number) =>
    Array.from({ length: count }, (_, i) => ({
      electronicApprovalId: start + i,
      eabusNo: `DOC-${start + i}`,
      documentType: 'BUSINESS_CONTACT',
      documentStatus: 'IN_PROGRESS',
      title: `문서 ${start + i}`,
      drafterName: '작성자',
      createdAt: '2026-10-12T09:00:00',
      updatedAt: '2026-10-16T10:00:00',
      submittedAt: null,
      summary: '',
    }));

  it('appends the next page at offset 20, ignores duplicates and stops at the total', async () => {
    vi.mocked(listDocumentApprovals)
      .mockResolvedValueOnce({ resultList: makeDocs(1, 20), totalRowCount: 25 } as never)
      .mockResolvedValueOnce({ resultList: makeDocs(20, 6), totalRowCount: 25 } as never);
    const { result } = renderHook(() => useDocumentWritePage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      result.current.loadMore();
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.listDocuments).toHaveLength(25));
    expect(listDocumentApprovals).toHaveBeenCalledTimes(2);
    expect(listDocumentApprovals).toHaveBeenLastCalledWith('ALL', undefined, undefined, false, {
      offset: 20,
      limit: 20,
    });
    expect(result.current.hasNextPage).toBe(false);
  });

  it('keeps loaded documents and retries the same offset after a page failure', async () => {
    vi.mocked(listDocumentApprovals)
      .mockResolvedValueOnce({ resultList: makeDocs(1, 20), totalRowCount: 40 } as never)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ resultList: makeDocs(21, 20), totalRowCount: 40 } as never);
    const { result } = renderHook(() => useDocumentWritePage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.pageError).toBeTruthy());
    expect(result.current.listDocuments).toHaveLength(20);

    await act(async () => {
      result.current.retryLoadMore();
    });
    await waitFor(() => expect(result.current.listDocuments).toHaveLength(40));
    expect(listDocumentApprovals).toHaveBeenLastCalledWith('ALL', undefined, undefined, false, {
      offset: 20,
      limit: 20,
    });
  });

  it('requests only the first twenty ordinary documents for list mode', async () => {
    const { result } = renderHook(() => useDocumentWritePage());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(listDocumentApprovals).toHaveBeenCalledWith(
      'ALL',
      undefined,
      undefined,
      false,
      { offset: 0, limit: 20 },
    );
    expect(result.current.listDocuments).toHaveLength(0);
  });
});
