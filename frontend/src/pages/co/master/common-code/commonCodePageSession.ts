import type { PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import type { CommonCodeGroupSearchFilters } from './services/commonCodeManagement.service';

export type CommonCodeSearchMode = 'default' | 'detail';

export type CommonCodePageSession = {
  searchQuery: string;
  detailValues: Record<string, PageSearchFieldValue>;
  appliedFilters: CommonCodeGroupSearchFilters;
  searchMode: CommonCodeSearchMode;
  selectedGroupId: string;
  selectedGroupRowIds: string[];
  selectedItemRowIds: string[];
  splitterSize: number;
  page: number;
};

export const initialCommonCodePageSession: CommonCodePageSession = {
  searchQuery: '',
  detailValues: {},
  appliedFilters: {},
  searchMode: 'default',
  selectedGroupId: '',
  selectedGroupRowIds: [],
  selectedItemRowIds: [],
  splitterSize: 600,
  page: 0,
};

export function applyCommonCodeSearchSession(
  current: CommonCodePageSession,
  next: {
    mode: CommonCodeSearchMode;
    searchQuery: string;
    detailValues: Record<string, PageSearchFieldValue>;
    filters: CommonCodeGroupSearchFilters;
  },
): CommonCodePageSession {
  return {
    ...current,
    searchQuery: next.searchQuery,
    detailValues: next.detailValues,
    appliedFilters: next.filters,
    searchMode: next.mode,
  };
}

export function getCommonCodeInitialFilters(
  session: CommonCodePageSession,
): CommonCodeGroupSearchFilters {
  return session.appliedFilters;
}

function isPageSearchFieldValue(value: unknown): value is PageSearchFieldValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }

  if (!value || typeof value !== 'object') return false;
  const candidate = value as { from?: unknown; to?: unknown };
  return (
    (candidate.from === undefined || typeof candidate.from === 'string') &&
    (candidate.to === undefined || typeof candidate.to === 'string')
  );
}

export function isCommonCodePageSession(
  value: unknown,
): value is CommonCodePageSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CommonCodePageSession>;
  const detailValues = candidate.detailValues;
  const appliedFilters = candidate.appliedFilters;

  return (
    typeof candidate.searchQuery === 'string' &&
    candidate.searchMode !== undefined &&
    (candidate.searchMode === 'default' || candidate.searchMode === 'detail') &&
    Boolean(detailValues) &&
    typeof detailValues === 'object' &&
    Object.values(detailValues).every(isPageSearchFieldValue) &&
    Boolean(appliedFilters) &&
    typeof appliedFilters === 'object' &&
    Object.values(appliedFilters).every(
      (filter) => filter === undefined || typeof filter === 'string',
    ) &&
    typeof candidate.selectedGroupId === 'string' &&
    Array.isArray(candidate.selectedGroupRowIds) &&
    Array.isArray(candidate.selectedItemRowIds) &&
    typeof candidate.splitterSize === 'number' &&
    typeof candidate.page === 'number'
  );
}
