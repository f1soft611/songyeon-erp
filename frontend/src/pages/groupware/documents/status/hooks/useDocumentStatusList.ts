import { useCallback, useEffect, useRef, useState } from 'react';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { searchDocumentStatus } from '../services/documentStatus.service';
import type {
  DocumentStatusFilters,
  DocumentStatusRow,
} from '../types/documentStatus.types';

export function useDocumentStatusList(
  appliedFilters: DocumentStatusFilters,
  enabled: boolean,
) {
  const [totalRowCount, setTotalRowCount] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [rows, setRows] = useState<DocumentStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryRequest, setRetryRequest] = useState({ version: 0, quiet: false });
  const previousRetryVersion = useRef(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const isQuietReload =
      retryRequest.quiet && retryRequest.version !== previousRetryVersion.current;
    previousRetryVersion.current = retryRequest.version;
    start();
    setHasLoaded(false);
    setError('');
    if (!isQuietReload) setLoading(true);

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
        if (!controller.signal.aborted && !isQuietReload) setLoading(false);
      });

    return () => controller.abort();
  }, [appliedFilters, enabled, retryRequest, start, succeed, fail]);

  const clearError = useCallback(() => setError(''), []);
  const retry = useCallback(() => {
    setHasLoaded(false);
    setError('');
    setRetryRequest((current) => ({ version: current.version + 1, quiet: false }));
  }, []);
  const refreshQuietly = useCallback(
    () => setRetryRequest((current) => ({ version: current.version + 1, quiet: true })),
    [],
  );

  return { initialLoad, rows, totalRowCount, hasLoaded, loading, error, clearError, retry, refreshQuietly };
}
