import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommonViewMode } from '../../../../../shared/components/view-mode/commonViewTypes';
import { fetchMyProfile } from '../../../../dashboard/services/profileSettings.service';
import {
  getDocumentApprovalSummary,
  listDocumentApprovals,
  listPinnedDocumentApprovals,
  pinDocumentApproval,
  unpinDocumentApproval,
} from '../services/documentApproval.service';
import {
  getDocumentApprovalScopeLabel,
  getApprovalStatusPresentation,
  getDocumentKindFromType,
  getDocumentKindPresentation,
} from '../data/documentPresentation';
import { getDocumentDisplayDate } from '../data/documentDate';
import { useDocumentFiles } from './useDocumentFiles';
import type {
  DocumentApprovalFeedRecord,
  DocumentApprovalRecord,
  DocumentApprovalScope,
  DocumentApprovalSummary,
  DocumentFeedWriteItem,
  DocumentKind,
  DocumentWriteItem,
} from '../types/documentWrite.types';

const DOCUMENT_PAGE_SIZE = 20;

type ActiveDocumentFilterChip = {
  key: 'scope' | 'kind' | 'document';
  label: string;
  deleteLabel: string;
  onDelete: () => void;
};

const documentTypeByKind: Record<DocumentKind, DocumentApprovalRecord['documentType']> = {
  기안서: 'DRAFTING',
  업무연락: 'BUSINESS_CONTACT',
  지출결의서: 'EXPENSE_RESOLUTION',
  근태신청: 'ATTENDANCE_APPLICATION',
};

function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = value.slice(0, 10);
  return date.includes('-') ? date.replaceAll('-', '.') : date;
}

function mapDocument(
  record: DocumentApprovalRecord,
  isPinned: boolean,
): DocumentWriteItem {
  const status = getApprovalStatusPresentation(record.documentStatus, record.documentType);
  const displayDate = getDocumentDisplayDate(record);
  return {
    id: record.electronicApprovalId,
    eabusNo: record.eabusNo,
    title: record.title,
    kind: getDocumentKindFromType(record.documentType),
    status: status.label,
    statusColor: status.color,
    statusVariant: status.variant,
    badgeBorderRadius: '8px',
    documentStatus: record.documentStatus,
    author: record.drafterName,
    date: formatDate(displayDate.value),
    dateSourceLabel: displayDate.sourceLabel,
    submittedDate: formatDate(record.submittedAt),
    summary: record.summary,
    isPinned,
    isDrafter: record.isDrafter,
  };
}

function mapFeedDocument(
  record: DocumentApprovalFeedRecord,
  isPinned: boolean,
): DocumentFeedWriteItem {
  return {
    ...mapDocument(record, isPinned),
    feedData: record,
  };
}

export function useDocumentWritePage() {
  const [viewMode, setViewMode] = useState<CommonViewMode>('list');
  const [selectedKind, setSelectedKind] = useState<DocumentKind | ''>('');
  const [scope, setScope] = useState<DocumentApprovalScope>('ALL');
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | undefined>();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentWriteItem[]>([]);
  const [pinnedDocuments, setPinnedDocuments] = useState<DocumentWriteItem[]>([]);
  const [feedDocuments, setFeedDocuments] = useState<DocumentFeedWriteItem[]>([]);
  const pinnedIds = useMemo(
    () => new Set(pinnedDocuments.map((item) => item.id)),
    [pinnedDocuments],
  );
  const [summary, setSummary] = useState<DocumentApprovalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedEmployeeId, setFeedEmployeeId] = useState('');
  const [feedEmployeeError, setFeedEmployeeError] = useState('');
  const [feedEmployeeRetryToken, setFeedEmployeeRetryToken] = useState(0);
  const [pinPendingIds, setPinPendingIds] = useState<number[]>([]);
  const [reloadRequest, setReloadRequest] = useState({ version: 0, quiet: false });
  const previousReloadVersion = useRef(0);
  const pageGeneration = useRef(0);
  const nextOffset = useRef(0);
  const inFlightOffset = useRef<number | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pageError, setPageError] = useState('');
  const [detailDocumentId, setDetailDocumentId] = useState<number | null>(null);
  const openComposer = useCallback(() => setIsComposerOpen(true), []);
  const closeComposer = useCallback(() => setIsComposerOpen(false), []);
  const refresh = useCallback(({ quiet = false }: { quiet?: boolean } = {}) => {
    setReloadRequest((current) => ({
      version: current.version + 1,
      quiet,
    }));
  }, []);
  const files = useDocumentFiles(viewMode === 'file', {
    scope,
    documentType: selectedKind ? documentTypeByKind[selectedKind] : undefined,
    electronicApprovalId: selectedDocumentId,
  }, reloadRequest.version);

  useEffect(() => {
    let active = true;
    const generation = pageGeneration.current + 1;
    pageGeneration.current = generation;
    nextOffset.current = 0;
    inFlightOffset.current = null;
    setHasNextPage(false);
    setIsLoadingMore(false);
    setPageError('');
    const isReload = reloadRequest.version !== previousReloadVersion.current;
    const isQuietReload = isReload && reloadRequest.quiet;
    previousReloadVersion.current = reloadRequest.version;
    if (!isQuietReload) setIsLoading(true);
    setLoadError('');
    const documentType = selectedKind
      ? documentTypeByKind[selectedKind]
      : undefined;
    const listRequest =
      viewMode === 'file'
        ? listPinnedDocumentApprovals(scope, documentType, selectedDocumentId).then(
            (pinnedRecords) => ({
              pinnedDocuments: pinnedRecords.map((record) => mapDocument(record, true)),
              listDocuments: [] as DocumentWriteItem[],
              feedDocuments: [] as DocumentFeedWriteItem[],
              totalRowCount: 0,
              nextOffset: 0,
            }),
          )
        : viewMode === 'feed'
        ? Promise.all([
            listPinnedDocumentApprovals(scope, documentType, selectedDocumentId, true),
            listDocumentApprovals(scope, documentType, selectedDocumentId, true, {
              offset: 0,
              limit: DOCUMENT_PAGE_SIZE,
            }),
          ]).then(([pinnedRecords, page]) => {
            const pinnedIds = new Set(pinnedRecords.map((item) => item.electronicApprovalId));
            return {
              pinnedDocuments: pinnedRecords.map((record) => mapDocument(record, true)),
              listDocuments: page.resultList.map((record) =>
                mapDocument(record, pinnedIds.has(record.electronicApprovalId))),
              feedDocuments: page.resultList.map((record) =>
                mapFeedDocument(record, pinnedIds.has(record.electronicApprovalId))),
              totalRowCount: page.totalRowCount,
              nextOffset: page.resultList.length,
            };
          })
        : Promise.all([
            listPinnedDocumentApprovals(scope, documentType, selectedDocumentId),
            listDocumentApprovals(scope, documentType, selectedDocumentId, false, {
              offset: 0,
              limit: DOCUMENT_PAGE_SIZE,
            }),
          ]).then(([pinnedRecords, page]) => {
            const pinnedIds = new Set(pinnedRecords.map((item) => item.electronicApprovalId));
            return {
              pinnedDocuments: pinnedRecords.map((record) => mapDocument(record, true)),
              listDocuments: page.resultList.map((record) =>
                mapDocument(record, pinnedIds.has(record.electronicApprovalId))),
              feedDocuments: [] as DocumentFeedWriteItem[],
              totalRowCount: page.totalRowCount,
              nextOffset: page.resultList.length,
            };
          });
    void Promise.all([
      listRequest,
      getDocumentApprovalSummary(),
    ])
      .then(([nextDocuments, nextSummary]) => {
        if (!active) return;
        setPinnedDocuments(nextDocuments.pinnedDocuments);
        setDocuments(nextDocuments.listDocuments);
        setFeedDocuments(nextDocuments.feedDocuments);
        nextOffset.current = nextDocuments.nextOffset;
        setHasNextPage(nextDocuments.nextOffset < nextDocuments.totalRowCount);
        setSummary(nextSummary);
      })
      .catch((error: unknown) => {
        if (active) {
          setHasNextPage(false);
          if (!isQuietReload) {
            setDocuments([]);
            setPinnedDocuments([]);
            setFeedDocuments([]);
          }
          setLoadError(
            error instanceof Error
              ? error.message
              : '전자결재 문서를 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      if (pageGeneration.current === generation) {
        pageGeneration.current += 1;
      }
    };
  }, [reloadRequest, scope, selectedDocumentId, selectedKind, viewMode]);

  const requestNextPage = useCallback(async (isRetry = false) => {
    if (
      viewMode === 'file'
      || !hasNextPage
      || inFlightOffset.current !== null
      || (pageError && !isRetry)
    ) {
      return;
    }
    const offset = nextOffset.current;
    const generation = pageGeneration.current;
    inFlightOffset.current = offset;
    setIsLoadingMore(true);
    if (isRetry) setPageError('');
    const documentType = selectedKind ? documentTypeByKind[selectedKind] : undefined;

    try {
      if (viewMode === 'feed') {
        const page = await listDocumentApprovals(
          scope,
          documentType,
          selectedDocumentId,
          true,
          { offset, limit: DOCUMENT_PAGE_SIZE },
        );
        if (generation !== pageGeneration.current) return;
        setFeedDocuments((current) => {
          const existingIds = new Set(current.map((item) => item.id));
          return [
            ...current,
            ...page.resultList
              .filter((record) => !existingIds.has(record.electronicApprovalId))
              .map((record) =>
                mapFeedDocument(record, pinnedIds.has(record.electronicApprovalId))),
          ];
        });
        nextOffset.current = offset + page.resultList.length;
        setHasNextPage(nextOffset.current < page.totalRowCount);
      } else {
        const page = await listDocumentApprovals(
          scope,
          documentType,
          selectedDocumentId,
          false,
          { offset, limit: DOCUMENT_PAGE_SIZE },
        );
        if (generation !== pageGeneration.current) return;
        setDocuments((current) => {
          const existingIds = new Set(current.map((item) => item.id));
          return [
            ...current,
            ...page.resultList
              .filter((record) => !existingIds.has(record.electronicApprovalId))
              .map((record) =>
                mapDocument(record, pinnedIds.has(record.electronicApprovalId))),
          ];
        });
        nextOffset.current = offset + page.resultList.length;
        setHasNextPage(nextOffset.current < page.totalRowCount);
      }
    } catch (error: unknown) {
      if (generation === pageGeneration.current) {
        setPageError(
          error instanceof Error
            ? error.message
            : '다음 문서 페이지를 불러오지 못했습니다.',
        );
      }
    } finally {
      if (
        generation === pageGeneration.current
        && inFlightOffset.current === offset
      ) {
        inFlightOffset.current = null;
        setIsLoadingMore(false);
      }
    }
  }, [
    hasNextPage,
    pageError,
    pinnedIds,
    scope,
    selectedDocumentId,
    selectedKind,
    viewMode,
  ]);

  const loadMore = useCallback(() => requestNextPage(), [requestNextPage]);
  const retryLoadMore = useCallback(
    () => requestNextPage(true),
    [requestNextPage],
  );

  useEffect(() => {
    if (viewMode !== 'feed') return;
    let active = true;
    setFeedEmployeeId('');
    setFeedEmployeeError('');
    void fetchMyProfile()
      .then((profile) => {
        const employeeId = String(profile?.employeeId ?? '').trim();
        if (!employeeId) {
          throw new Error('로그인 사용자의 사원 ID를 확인할 수 없습니다.');
        }
        if (active) setFeedEmployeeId(employeeId);
      })
      .catch((error: unknown) => {
        if (active) {
          setFeedEmployeeError(
            error instanceof Error
              ? error.message
              : '로그인 사용자의 사원 정보를 불러오지 못했습니다.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [feedEmployeeRetryToken, viewMode]);

  const pinnedViewItems = useMemo(
    () =>
      pinnedDocuments.map((item) => ({
        id: item.id,
        title: item.title,
        authorLabel: item.author,
        dateLabel: item.date,
        isPinned: item.isPinned,
      })),
    [pinnedDocuments],
  );
  const listViewItems = useMemo(
    () =>
      documents.map((item) => {
        const kind = getDocumentKindPresentation(item.kind);
        return {
          id: item.id,
          title: item.title,
          authorLabel: item.author,
          dateLabel: item.date,
          categoryLabel: kind.label,
          categoryColor: kind.color,
          statusLabel: item.status,
          statusColor: item.statusColor,
          statusVariant: item.statusVariant,
          badgeBorderRadius: item.badgeBorderRadius,
          summary: item.summary,
          isPinned: item.isPinned,
          isDrafter: item.isDrafter,
          documentStatus: item.documentStatus,
        };
      }),
    [documents],
  );

  const selectScope = useCallback((nextScope: DocumentApprovalScope) => {
    setSelectedDocumentId(undefined);
    setScope(nextScope);
  }, []);
  const clearScopeFilter = useCallback(() => {
    setScope('ALL');
  }, []);
  const clearKindFilter = useCallback(() => {
    setSelectedKind('');
  }, []);
  const clearDocumentFilter = useCallback(() => {
    setSelectedDocumentId(undefined);
  }, []);
  const selectNotice = useCallback((documentId: number) => {
    setSelectedKind('');
    setScope('ALL');
    setSelectedDocumentId(documentId);
  }, []);
  const retry = useCallback(() => refresh(), [refresh]);
  const isPinPending = useCallback(
    (electronicApprovalId: number) => pinPendingIds.includes(electronicApprovalId),
    [pinPendingIds],
  );
  const togglePin = useCallback(
    async (electronicApprovalId: number, pinned: boolean) => {
      if (pinPendingIds.includes(electronicApprovalId)) return;
      setPinPendingIds((current) => [...current, electronicApprovalId]);
      try {
        if (pinned) {
          await unpinDocumentApproval(electronicApprovalId);
        } else {
          await pinDocumentApproval(electronicApprovalId);
        }
        refresh({ quiet: true });
      } finally {
        setPinPendingIds((current) =>
          current.filter((id) => id !== electronicApprovalId));
      }
    },
    [pinPendingIds, refresh],
  );
  const retryFeedEmployee = useCallback(
    () => setFeedEmployeeRetryToken((token) => token + 1),
    [],
  );
  const openDetail = useCallback((documentId: number) => {
    setDetailDocumentId(documentId);
  }, []);
  const closeDetail = useCallback(() => setDetailDocumentId(null), []);

  const activeFilterChips = useMemo<ActiveDocumentFilterChip[]>(() => {
    const chips: ActiveDocumentFilterChip[] = [];
    if (scope !== 'ALL') {
      const label = getDocumentApprovalScopeLabel(scope);
      chips.push({
        key: 'scope',
        label: `#${label}`,
        deleteLabel: `결재 범위 필터 ${label} 취소`,
        onDelete: clearScopeFilter,
      });
    }
    if (selectedKind) {
      chips.push({
        key: 'kind',
        label: `#${selectedKind}`,
        deleteLabel: `업무구분 필터 ${selectedKind} 취소`,
        onDelete: clearKindFilter,
      });
    }
    if (selectedDocumentId !== undefined) {
      const documentTitle =
        summary?.notices
          .find((record) => record.electronicApprovalId === selectedDocumentId)
          ?.title.trim() || `문서 ${selectedDocumentId}`;
      chips.push({
        key: 'document',
        label: `#${documentTitle}`,
        deleteLabel: `문서 필터 ${documentTitle} 취소`,
        onDelete: clearDocumentFilter,
      });
    }
    return chips;
  }, [
    clearDocumentFilter,
    clearKindFilter,
    clearScopeFilter,
    scope,
    selectedDocumentId,
    selectedKind,
    summary,
  ]);

  return {
    files,
    viewMode,
    setViewMode,
    selectedKind,
    setSelectedKind,
    activeFilterChips,
    clearScopeFilter,
    clearKindFilter,
    clearDocumentFilter,
    isComposerOpen,
    openComposer,
    closeComposer,
    pinnedDocuments,
    listDocuments: documents,
    feedDocuments,
    pinnedViewItems,
    listViewItems,
    summary,
    notices: (summary?.notices ?? []).map((notice) => mapDocument(notice, false)),
    isLoading,
    loadError,
    feedEmployeeId,
    feedEmployeeError,
    retryFeedEmployee,
    retry,
    scope,
    selectScope,
    selectNotice,
    openDetail,
    closeDetail,
    detailDocumentId,
    refresh,
    togglePin,
    isPinPending,
    hasNextPage,
    isLoadingMore,
    pageError,
    loadMore,
    retryLoadMore,
  };
}
