import { useCallback, useMemo, useRef, useState } from 'react';
import { ApiNetworkError, ApiResponseError, isRequestAborted } from '../services/apiErrors';

export type PageLoadError = 'network' | 'authentication' | 'forbidden' | 'server';

export function useInitialLoadState() {
  const hasSucceeded = useRef(false);
  const [error, setError] = useState<PageLoadError | null>(null);
  const [loading, setLoading] = useState(false);

  const start = useCallback(() => setLoading(true), []);
  const succeed = useCallback(() => {
    hasSucceeded.current = true;
    setError(null);
    setLoading(false);
  }, []);
  const fail = useCallback((cause: unknown) => {
    setLoading(false);
    if (hasSucceeded.current) return;
    if (isRequestAborted(cause)) return;
    setError(
      cause instanceof ApiNetworkError ? 'network'
        : cause instanceof ApiResponseError && cause.status === 401 ? 'authentication'
          : cause instanceof ApiResponseError && cause.status === 403 ? 'forbidden'
            : 'server',
    );
  }, []);

  return useMemo(
    () => ({ error, loading, start, succeed, fail }),
    [error, loading, start, succeed, fail],
  );
}
