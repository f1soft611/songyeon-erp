import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDocumentWritePage } from '../src/pages/groupware/documents/write/hooks/useDocumentWritePage';
import { fetchMyProfile } from '../src/pages/dashboard/services/profileSettings.service';
import type { DocumentApprovalFeedRecord } from '../src/pages/groupware/documents/write/types/documentWrite.types';
import {
  getDocumentApprovalSummary,
  listDocumentApprovals,
  listPinnedDocumentApprovals,
  pinDocumentApproval,
  unpinDocumentApproval,
} from '../src/pages/groupware/documents/write/services/documentApproval.service';

vi.mock('../src/pages/groupware/documents/write/services/documentApproval.service', () => ({
  getDocumentApprovalSummary: vi.fn(),
  listDocumentApprovals: vi.fn(),
  listPinnedDocumentApprovals: vi.fn(),
  pinDocumentApproval: vi.fn(),
  unpinDocumentApproval: vi.fn(),
}));
vi.mock('../src/pages/dashboard/services/profileSettings.service', () => ({
  fetchMyProfile: vi.fn(),
}));

const documentA = {
  electronicApprovalId: 41,
  eabusNo: '001',
  documentType: 'DRAFTING' as const,
  documentStatus: 'PENDING' as const,
  title: '고정 문서',
  drafterName: '작성자',
  createdAt: '2026-10-10T00:00:00',
  updatedAt: '2026-10-11T00:00:00',
  submittedAt: '2026-10-12T00:00:00',
  summary: '요약',
};

const documentB = {
  ...documentA,
  electronicApprovalId: 42,
  title: '일반 문서',
};

describe('useDocumentWritePage pins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchMyProfile).mockResolvedValue({ employeeId: 'test-employee' } as Awaited<ReturnType<typeof fetchMyProfile>>);
    vi.mocked(getDocumentApprovalSummary).mockResolvedValue({
      actionRequiredCount: 0,
      inProgressCount: 0,
      draftCount: 0,
      completedCount: 0,
      revisionRequestedCount: 0,
      rejectedCount: 0,
      notices: [],
    });
    vi.mocked(listPinnedDocumentApprovals).mockResolvedValue([documentA]);
    vi.mocked(listDocumentApprovals).mockResolvedValue({
      resultList: [documentA, documentB],
      totalRowCount: 2,
    } as never);
    vi.mocked(pinDocumentApproval).mockResolvedValue({
      electronicApprovalId: 42,
      pinned: true,
    });
    vi.mocked(unpinDocumentApproval).mockResolvedValue({
      electronicApprovalId: 41,
      pinned: false,
    });
  });

  it('keeps pinned documents in the ordinary list in API order', async () => {
    vi.mocked(listDocumentApprovals).mockResolvedValue({
      resultList: [documentB, documentA],
      totalRowCount: 2,
    } as never);
    const { result } = renderHook(() => useDocumentWritePage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.pinnedDocuments).toHaveLength(1);
    expect(result.current.pinnedDocuments[0]?.id).toBe(41);
    expect(result.current.listDocuments.map((item) => item.id)).toEqual([42, 41]);
    expect(result.current.listViewItems.map((item) => item.isPinned)).toEqual([false, true]);
  });

  it('does not inject separately fetched pins into ordinary pages and preserves pin state on later pages', async () => {
    vi.mocked(listDocumentApprovals)
      .mockResolvedValueOnce({ resultList: [documentB], totalRowCount: 2 } as never)
      .mockResolvedValueOnce({ resultList: [documentA], totalRowCount: 2 } as never);
    const { result } = renderHook(() => useDocumentWritePage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.listDocuments.map((item) => item.id)).toEqual([42]);
    expect(result.current.pinnedDocuments.map((item) => item.id)).toEqual([41]);
    await act(async () => { await result.current.loadMore(); });
    expect(result.current.listDocuments.map((item) => item.id)).toEqual([42, 41]);
    expect(result.current.listViewItems[1]?.isPinned).toBe(true);
  });

  it('keeps ordinary feed order without promoting or injecting pinned documents', async () => {
    const toFeed = (record: typeof documentA): DocumentApprovalFeedRecord => ({
      ...record,
      viewCount: 0,
      isDrafter: false,
      draftingWorkCategoryId: null,
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>test</p>',
      contentsText: 'test',
      approvalLines: [],
      attachments: [],
      systemEvents: [],
      comments: [],
      commentCount: 0,
      hasPreviousComments: false,
      nextBeforeCommentId: null,
    });
    const outsidePage = { ...documentA, electronicApprovalId: 43 };
    vi.mocked(listPinnedDocumentApprovals).mockResolvedValue(
      [toFeed(documentA), toFeed(outsidePage)],
    );
    vi.mocked(listDocumentApprovals)
      .mockResolvedValueOnce({ resultList: [], totalRowCount: 0 } as never)
      .mockResolvedValueOnce({
        resultList: [toFeed(documentB), toFeed(documentA)],
        totalRowCount: 3,
      } as never)
      .mockResolvedValueOnce({ resultList: [toFeed(outsidePage)], totalRowCount: 3 } as never);
    const { result } = renderHook(() => useDocumentWritePage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setViewMode('feed'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.feedDocuments.map((item) => item.id)).toEqual([42, 41]);
    expect(result.current.feedDocuments.map((item) => item.isPinned)).toEqual([false, true]);
    await act(async () => { await result.current.loadMore(); });
    expect(result.current.feedDocuments.map((item) => item.id)).toEqual([42, 41, 43]);
    expect(result.current.feedDocuments[2]?.isPinned).toBe(true);
  });
  it('toggles pin state through authenticated pin APIs and clears pending state', async () => {
    const { result } = renderHook(() => useDocumentWritePage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.togglePin(42, false);
    });
    expect(pinDocumentApproval).toHaveBeenCalledWith(42);
    expect(result.current.isPinPending(42)).toBe(false);

    await act(async () => {
      await result.current.togglePin(41, true);
    });
    expect(unpinDocumentApproval).toHaveBeenCalledWith(41);
    expect(result.current.isPinPending(41)).toBe(false);
  });
});
