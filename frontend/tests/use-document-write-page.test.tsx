import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDocumentWritePage } from '../src/pages/groupware/documents/write/hooks/useDocumentWritePage';
import {
  getDocumentApprovalSummary,
  listDocumentApprovals,
  listPinnedDocumentApprovals,
  pinDocumentApproval,
  unpinDocumentApproval,
} from '../src/pages/groupware/documents/write/services/documentApproval.service';
import type {
  DocumentApprovalRecord,
  DocumentApprovalSummary,
} from '../src/pages/groupware/documents/write/types/documentWrite.types';

vi.mock('../src/pages/groupware/documents/write/services/documentApproval.service', () => ({
  getDocumentApprovalSummary: vi.fn(),
  listDocumentApprovals: vi.fn(),
  listPinnedDocumentApprovals: vi.fn(),
  pinDocumentApproval: vi.fn(),
  unpinDocumentApproval: vi.fn(),
}));

const record: DocumentApprovalRecord = {
  electronicApprovalId: 42,
  eabusNo: '001',
  documentType: 'DRAFTING',
  documentStatus: 'IN_PROGRESS',
  title: '검증 문서',
  drafterName: '검증 기안자',
  createdAt: '2026-10-12T09:00:00',
  updatedAt: '2026-10-16T10:00:00',
  submittedAt: '2026-10-14T11:00:00',
  summary: '',
};

const emptySummary: DocumentApprovalSummary = {
  actionRequiredCount: 0,
  inProgressCount: 0,
  draftCount: 0,
  completedCount: 0,
  revisionRequestedCount: 0,
  rejectedCount: 0,
  notices: [],
};

const emptyPage = { resultList: [], totalRowCount: 0 };
const firstPage = { offset: 0, limit: 20 };

describe('useDocumentWritePage date metadata', () => {
  beforeEach(() => {
    vi.mocked(listDocumentApprovals).mockResolvedValue(emptyPage as never);
    vi.mocked(listPinnedDocumentApprovals).mockResolvedValue([]);
    vi.mocked(pinDocumentApproval).mockResolvedValue({ electronicApprovalId: 42, pinned: true });
    vi.mocked(unpinDocumentApproval).mockResolvedValue({ electronicApprovalId: 42, pinned: false });
  });

  it.each([
    {
      submittedAt: record.submittedAt,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
      expectedDate: '2026.10.14',
      expectedLabel: '상신일',
    },
    {
      submittedAt: null,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
      expectedDate: '2026.10.16',
      expectedLabel: '수정일',
    },
    {
      submittedAt: '',
      updatedAt: null,
      createdAt: record.createdAt,
      expectedDate: '2026.10.12',
      expectedLabel: '작성일',
    },
    {
      submittedAt: null,
      updatedAt: undefined,
      createdAt: record.createdAt,
      expectedDate: '2026.10.12',
      expectedLabel: '작성일',
    },
  ])(
    'maps the preferred date for submittedAt=$submittedAt, updatedAt=$updatedAt',
    async ({
      submittedAt,
      updatedAt,
      createdAt,
      expectedDate,
      expectedLabel,
    }) => {
      const dateRecord = { ...record, submittedAt, updatedAt, createdAt };
      vi.mocked(listDocumentApprovals).mockResolvedValue({ resultList: [dateRecord], totalRowCount: 1 } as never);
      vi.mocked(getDocumentApprovalSummary).mockResolvedValue({
        actionRequiredCount: 1,
        inProgressCount: 1,
        draftCount: 0,
        completedCount: 0,
        revisionRequestedCount: 0,
        rejectedCount: 0,
        notices: [dateRecord],
      });
      const { result } = renderHook(() => useDocumentWritePage());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.listDocuments[0]).toMatchObject({
        date: expectedDate,
        dateSourceLabel: expectedLabel,
      });
      expect(result.current.listViewItems[0]?.dateLabel).toBe(expectedDate);
      expect(result.current.notices[0]).toMatchObject({
        author: record.drafterName,
        kind: '기안서',
        status: '결재진행중',
        submittedDate: submittedAt ? '2026.10.14' : '',
        date: expectedDate,
        dateSourceLabel: expectedLabel,
      });
    });

  describe('useDocumentWritePage active filter chips', () => {
    beforeEach(() => {
      vi.mocked(listDocumentApprovals).mockResolvedValue(emptyPage as never);
      vi.mocked(getDocumentApprovalSummary).mockResolvedValue(emptySummary);
    });

    it('starts without active filter chips', async () => {
      const { result } = renderHook(() => useDocumentWritePage());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.activeFilterChips).toEqual([]);
    });

    it('starts with the dashboard scope and requests only matching documents', async () => {
      vi.mocked(getDocumentApprovalSummary).mockResolvedValue(emptySummary);
      const { result } = renderHook(() => useDocumentWritePage('DRAFT'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.scope).toBe('DRAFT');
      expect(result.current.activeFilterChips).toEqual([
        expect.objectContaining({ key: 'scope', label: '#작성 중 문서' }),
      ]);
      expect(listDocumentApprovals).toHaveBeenLastCalledWith(
        'DRAFT',
        undefined,
        undefined,
        false,
        firstPage,
      );
    });

    it('clears the dashboard scope when selecting a notice', async () => {
      const onScopeChange = vi.fn();
      const { result } = renderHook(() => useDocumentWritePage('DRAFT', onScopeChange));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.selectNotice(42));
      await waitFor(() =>
        expect(listDocumentApprovals).toHaveBeenLastCalledWith(
          'ALL',
          undefined,
          42,
          false,
          firstPage,
        ),
      );

      expect(result.current.scope).toBe('ALL');
      expect(onScopeChange).toHaveBeenCalledWith(null);
    });

    it.each([
      ['MY_PENDING', '#내가 처리할 결재'],
      ['IN_PROGRESS', '#결재 진행 중'],
      ['DRAFT', '#작성 중 문서'],
      ['COMPLETED', '#승인'],
      ['REVISION_REQUESTED', '#보완요청'],
      ['REJECTED', '#반려'],
    ] as const)('shows the %s scope label as a filter chip', async (scope, label) => {
      const { result } = renderHook(() => useDocumentWritePage());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.selectScope(scope));
      await waitFor(() =>
        expect(result.current.activeFilterChips).toEqual([
          expect.objectContaining({ key: 'scope', label }),
        ]),
      );
    });

    it('removes only the scope filter and preserves the selected kind', async () => {
      const { result } = renderHook(() => useDocumentWritePage());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.selectScope('IN_PROGRESS');
        result.current.setSelectedKind('업무연락');
      });
      await waitFor(() =>
        expect(listDocumentApprovals).toHaveBeenLastCalledWith(
          'IN_PROGRESS',
          'BUSINESS_CONTACT',
          undefined,
          false,
          firstPage,
        ),
      );
      expect(result.current.activeFilterChips).toEqual([
        expect.objectContaining({ key: 'scope', label: '#결재 진행 중' }),
        expect.objectContaining({ key: 'kind', label: '#업무연락' }),
      ]);

      act(() => result.current.clearScopeFilter());
      await waitFor(() =>
        expect(listDocumentApprovals).toHaveBeenLastCalledWith(
          'ALL',
          'BUSINESS_CONTACT',
          undefined,
          false,
          firstPage,
        ),
      );
      expect(result.current.scope).toBe('ALL');
      expect(result.current.selectedKind).toBe('업무연락');
      expect(result.current.activeFilterChips).toEqual([
        expect.objectContaining({ key: 'kind', label: '#업무연락' }),
      ]);
    });

    it('removes only the kind filter and preserves the selected scope', async () => {
      const { result } = renderHook(() => useDocumentWritePage());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.selectScope('IN_PROGRESS');
        result.current.setSelectedKind('업무연락');
      });
      await waitFor(() =>
        expect(listDocumentApprovals).toHaveBeenLastCalledWith(
          'IN_PROGRESS',
          'BUSINESS_CONTACT',
          undefined,
          false,
          firstPage,
        ),
      );

      act(() => result.current.clearKindFilter());
      await waitFor(() =>
        expect(listDocumentApprovals).toHaveBeenLastCalledWith(
          'IN_PROGRESS',
          undefined,
          undefined,
          false,
          firstPage,
        ),
      );
      expect(result.current.scope).toBe('IN_PROGRESS');
      expect(result.current.selectedKind).toBe('');
      expect(result.current.activeFilterChips).toEqual([
        expect.objectContaining({ key: 'scope', label: '#결재 진행 중' }),
      ]);
    });

    it('shows a notice title and removes only the selected document filter', async () => {
      vi.mocked(getDocumentApprovalSummary).mockResolvedValue({
        ...emptySummary,
        notices: [record],
      });
      const { result } = renderHook(() => useDocumentWritePage());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.selectNotice(42));
      await waitFor(() =>
        expect(result.current.activeFilterChips).toEqual([
          expect.objectContaining({
            key: 'document',
            label: '#검증 문서',
          }),
        ]),
      );
      act(() => result.current.setSelectedKind('업무연락'));
      await waitFor(() =>
        expect(listDocumentApprovals).toHaveBeenLastCalledWith(
          'ALL',
          'BUSINESS_CONTACT',
          42,
          false,
          firstPage,
        ),
      );

      act(() => result.current.clearDocumentFilter());
      await waitFor(() =>
        expect(listDocumentApprovals).toHaveBeenLastCalledWith(
          'ALL',
          'BUSINESS_CONTACT',
          undefined,
          false,
          firstPage,
        ),
      );
      expect(result.current.selectedKind).toBe('업무연락');
      expect(result.current.activeFilterChips).toEqual([
        expect.objectContaining({ key: 'kind', label: '#업무연락' }),
      ]);
    });

    it('uses a document identifier fallback when its notice is unavailable', async () => {
      const { result } = renderHook(() => useDocumentWritePage());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.selectNotice(42));
      await waitFor(() =>
        expect(result.current.activeFilterChips).toEqual([
          expect.objectContaining({ key: 'document', label: '#문서 42' }),
        ]),
      );
    });
  });
});
