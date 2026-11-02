import { apiGet } from '../../../../../shared/services/apiClient';
import type {
  F1GridDataSource,
  F1GridDataSourceQuery,
} from '../../../../../shared/components/f1-grid/types/grid.types';
import type {
  DocumentStatusFilters,
  DocumentStatusRow,
} from '../types/documentStatus.types';
import type { DocumentStatusResult } from '../types/documentStatusApi.types';
import { validatePageResponse } from './documentStatusResponse';

const DOCUMENTS_API = '/api/v1/groupware/approvals/documents/search';

function buildFilterParams(filters: DocumentStatusFilters): URLSearchParams {
  const params = new URLSearchParams({ scope: filters.scope ?? 'ALL' });
  for (const [field, rawValue] of Object.entries(filters)) {
    if (field === 'scope') continue;
    const value = rawValue?.trim();
    if (value) params.set(field, value);
  }
  return params;
}

function buildPageQuery(
  filters: DocumentStatusFilters,
  query: F1GridDataSourceQuery<DocumentStatusRow>,
): URLSearchParams {
  const params = buildFilterParams(filters);
  params.set('offset', String(query.offset));
  params.set('limit', String(query.limit));

  const sort = query.sorts[0];
  if (sort) {
    const sortField =
      String(sort.field) === 'rowNumber'
        ? 'updatedAt'
        : String(sort.field);
    params.set('sortField', sortField);
    params.set('sortDirection', sort.direction.toUpperCase());
  }
  return params;
}

async function loadDocumentStatus(
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<DocumentStatusResult> {
  const response = await apiGet<unknown>(
    `${DOCUMENTS_API}?${params.toString()}`,
    signal,
  );
  const page = validatePageResponse(response);
  return {
    rows: page.resultList,
    totalRowCount: page.totalRowCount,
  };
}

export async function searchDocumentStatus(
  filters: DocumentStatusFilters,
  signal?: AbortSignal,
): Promise<DocumentStatusResult> {
  return loadDocumentStatus(buildFilterParams(filters), signal);
}

export function createDocumentStatusDataSource(
  filters: DocumentStatusFilters,
): F1GridDataSource<DocumentStatusRow> {
  return {
    pageSize: 200,
    load: (query) => loadDocumentStatus(buildPageQuery(filters, query), query.signal),
  };
}
