import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDocumentStatusList } from '../src/pages/groupware/documents/status/hooks/useDocumentStatusList';
import { useDocumentStatusDetail } from '../src/pages/groupware/documents/status/hooks/useDocumentStatusDetail';
import type { DocumentStatusResult } from '../src/pages/groupware/documents/status/types/documentStatusApi.types';
import type { DocumentApprovalDetail } from '../src/pages/groupware/documents/write/types/documentWrite.types';
import type { DocumentStatusFilters } from '../src/pages/groupware/documents/status/types/documentStatus.types';

const service = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock('../src/pages/groupware/documents/status/services/documentStatus.service', () => ({
  searchDocumentStatus: service.search,
}));

describe('document status hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('waits for defaults and cancels obsolete requests without accepting late results', async () => {
    let resolveFirst!: (value: DocumentStatusResult) => void;
    service.search.mockImplementationOnce(() => new Promise<DocumentStatusResult>((resolve) => {
      resolveFirst = resolve;
    })).mockResolvedValue({ rows: [], totalRowCount: 2 });
    const onLoadStart = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ enabled, filters }: { enabled: boolean; filters: DocumentStatusFilters }) =>
        useDocumentStatusList(filters, enabled, onLoadStart),
      { initialProps: { enabled: false, filters: {} } },
    );
    expect(service.search).not.toHaveBeenCalled();
    rerender({ enabled: true, filters: {} });
    const firstSignal = service.search.mock.calls[0][1] as AbortSignal;
    rerender({ enabled: true, filters: { keyword: 'new' } });
    await waitFor(() => expect(result.current.totalRowCount).toBe(2));
    expect(firstSignal.aborted).toBe(true);
    await act(async () => resolveFirst({ rows: [], totalRowCount: 99 }));
    expect(result.current.totalRowCount).toBe(2);
    expect(onLoadStart).toHaveBeenCalledTimes(2);
    const latestSignal = service.search.mock.calls[1][1] as AbortSignal;
    unmount();
    expect(latestSignal.aborted).toBe(true);
  });

  it('shows load errors and retries the same applied filters', async () => {
    service.search.mockRejectedValueOnce(new Error('Search failed'))
      .mockResolvedValue({ rows: [], totalRowCount: 0 });
    const filters = { title: 'Plan' };
    const onLoadStart = vi.fn();
    const { result } = renderHook(() =>
      useDocumentStatusList(filters, true, onLoadStart));
    await waitFor(() => expect(result.current.error).toBe('Search failed'));
    expect(result.current.hasLoaded).toBe(false);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(result.current.error).toBe('');
    expect(result.current.loading).toBe(false);
    expect(service.search.mock.calls.map(([value]) => value)).toEqual([filters, filters]);
  });

  it('ignores rejected obsolete requests while the latest request is still loading', async () => {
    let rejectFirst!: (reason: Error) => void;
    let resolveLatest!: (value: DocumentStatusResult) => void;
    service.search.mockImplementationOnce(() => new Promise<DocumentStatusResult>((_, reject) => {
      rejectFirst = reject;
    })).mockImplementationOnce(() => new Promise<DocumentStatusResult>((resolve) => {
      resolveLatest = resolve;
    }));
    const onLoadStart = vi.fn();
    const { result, rerender } = renderHook(
      ({ filters }: { filters: DocumentStatusFilters }) =>
        useDocumentStatusList(filters, true, onLoadStart),
      { initialProps: { filters: {} } },
    );
    rerender({ filters: { keyword: 'latest' } });
    await act(async () => rejectFirst(new Error('Obsolete failure')));
    expect(result.current.error).toBe('');
    expect(result.current.loading).toBe(true);
    await act(async () => resolveLatest({ rows: [], totalRowCount: 0 }));
    expect(result.current.loading).toBe(false);
    expect(result.current.hasLoaded).toBe(true);
  });

  it('validates selection, clears editing state and refreshes detail', () => {
    const { result } = renderHook(() => useDocumentStatusDetail());
    act(() => result.current.handleSelectionChange([1, '41']));
    expect(result.current.selectedDocumentId).toBe(41);
    act(() => result.current.handleSelectionChange(['not-an-id']));
    expect(result.current.selectedDocumentId).toBeNull();
    for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      act(() => result.current.handleSelectionChange([id]));
      expect(result.current.selectedDocumentId).toBeNull();
    }
    const document = { electronicApprovalId: 41 } as DocumentApprovalDetail;
    act(() => result.current.handleEditDocument(document));
    expect(result.current.editingDocument).toBe(document);
    expect(result.current.isComposerOpen).toBe(true);
    act(() => result.current.closeComposer());
    expect(result.current.isComposerOpen).toBe(false);
    expect(result.current.editingDocument).toBeNull();
    act(() => result.current.refreshDetail());
    expect(result.current.detailRefreshToken).toBe(1);
    act(() => result.current.refreshDetail());
    expect(result.current.detailRefreshToken).toBe(2);
    act(() => result.current.handleSelectionChange([41]));
    act(() => result.current.closeDetail());
    expect(result.current.selectedDocumentId).toBeNull();
  });
});
