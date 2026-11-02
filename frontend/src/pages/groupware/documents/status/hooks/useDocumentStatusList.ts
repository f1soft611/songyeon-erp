import { useCallback, useEffect, useState } from 'react';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { searchDocumentStatus } from '../services/documentStatus.service';
import type {
  DocumentStatusFilters,
  DocumentStatusRow,
} from '../types/documentStatus.types';

export function useDocumentStatusList(
  appliedFilters: DocumentStatusFilters,
  enabled: boolean,
  onLoadStart: () => void,
) {
  const [totalRowCount, setTotalRowCount] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [rows, setRows] = useState<DocumentStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    start();
    setHasLoaded(false);
    setError('');
    onLoadStart();
    setLoading(true);

    void searchDocumentStatus(appliedFilters, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setRows(result.rows);
        setTotalRowCount(result.totalRowCount);
        setHasLoaded(true);
        succeed();
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        fail(loadError);
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [appliedFilters, enabled, onLoadStart, retryToken, start, succeed, fail]);

  const clearError = useCallback(() => setError(''), []);
  const retry = useCallback(() => {
    setHasLoaded(false);
    setError('');
    setRetryToken((current) => current + 1);
  }, []);

  return { initialLoad, rows, totalRowCount, hasLoaded, loading, error, clearError, retry };
}
