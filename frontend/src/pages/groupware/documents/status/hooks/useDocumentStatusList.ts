import { useCallback, useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    setHasLoaded(false);
    setError('');
    setTotalRowCount(0);
    setRows([]);
    onLoadStart();
    setLoading(true);

    void searchDocumentStatus(appliedFilters, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setRows(result.rows);
        setTotalRowCount(result.totalRowCount);
        setHasLoaded(true);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [appliedFilters, enabled, onLoadStart, retryToken]);

  const clearError = useCallback(() => setError(''), []);
  const retry = useCallback(() => {
    setHasLoaded(false);
    setError('');
    setRetryToken((current) => current + 1);
  }, []);

  return { rows, totalRowCount, hasLoaded, loading, error, clearError, retry };
}
