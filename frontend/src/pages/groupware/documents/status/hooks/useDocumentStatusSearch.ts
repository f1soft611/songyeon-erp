import { useCallback, useEffect, useMemo, useState } from 'react';
import { toPageSearchFields } from '../../../../../shared/components/page-search/searchFields';
import { usePageSessionState } from '../../../../../shared/hooks/usePageSessionState';
import { usePageSearchDefaults } from '../../../../../shared/hooks/usePageSearchDefaults';
import { createDocumentStatusColumns } from '../data/documentStatusColumns';
import {
  cloneDetailValues,
  isDocumentStatusSearchSession,
  toDocumentStatusFilters,
} from '../services/documentStatusSearch';
import type { DocumentStatusFilters } from '../types/documentStatus.types';
import type {
  DocumentStatusSearchSession,
  DocumentStatusSearchValues,
} from '../types/documentStatusSearch.types';

const DOCUMENT_STATUS_SESSION_KEY = 's-erp:page:document-status';
const DOCUMENT_STATUS_SESSION_VERSION = 1;

export function useDocumentStatusSearch() {
  const detailFields = useMemo(
    () => toPageSearchFields(createDocumentStatusColumns()),
    [],
  );
  const {
    values: defaultValues,
    loading: defaultsLoading,
    error: defaultsError,
    retry: retryDefaults,
  } = usePageSearchDefaults(detailFields);
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<DocumentStatusSearchSession | null>(
      DOCUMENT_STATUS_SESSION_KEY,
      null,
      {
        version: DOCUMENT_STATUS_SESSION_VERSION,
        validate: (value): value is DocumentStatusSearchSession | null =>
          value === null || isDocumentStatusSearchSession(value),
        persistWhen: (value) => value !== null,
      },
    );
  const [defaultsInitialized, setDefaultsInitialized] = useState(false);
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<DocumentStatusSearchValues>(
    () => cloneDetailValues(searchSession?.detailValues ?? {}),
  );
  const [appliedFilters, setAppliedFilters] = useState<DocumentStatusFilters>(
    () => toDocumentStatusFilters(
      searchSession?.keyword ?? '',
      searchSession?.detailValues ?? {},
    ),
  );

  useEffect(() => {
    if (!defaultValues) return;

    if (searchSession === null) {
      const initialSnapshot: DocumentStatusSearchSession = {
        keyword: '',
        detailValues: cloneDetailValues(defaultValues),
      };
      setKeyword(initialSnapshot.keyword);
      setDetailValues(initialSnapshot.detailValues);
      setSearchSession(initialSnapshot);
      setAppliedFilters(
        toDocumentStatusFilters(
          initialSnapshot.keyword,
          initialSnapshot.detailValues,
        ),
      );
    }
    setDefaultsInitialized(true);
  }, [defaultValues, searchSession, setSearchSession]);

  const applySearch = useCallback(
    (values: DocumentStatusSearchValues = detailValues) => {
      const snapshot = {
        keyword,
        detailValues: cloneDetailValues(values),
      };
      setSearchSession(snapshot);
      setAppliedFilters(
        toDocumentStatusFilters(snapshot.keyword, snapshot.detailValues),
      );
    },
    [detailValues, keyword, setSearchSession],
  );

  const resetSearch = useCallback(() => {
    if (!defaultValues) return;
    const resetDetailValues = cloneDetailValues(defaultValues);
    const resetSnapshot = {
      keyword: '',
      detailValues: resetDetailValues,
    };
    setKeyword('');
    setDetailValues(resetDetailValues);
    setSearchSession(resetSnapshot);
    setAppliedFilters(
      toDocumentStatusFilters(resetSnapshot.keyword, resetSnapshot.detailValues),
    );
  }, [defaultValues, setSearchSession]);

  return {
    keyword,
    setKeyword,
    detailFields,
    detailValues,
    setDetailValues,
    appliedFilters,
    defaultsInitialized,
    defaultsLoading,
    defaultsError,
    retryDefaults,
    searchAreaDefaultValues: searchSession === null ? (defaultValues ?? {}) : {},
    applySearch,
    resetSearch,
  };
}
