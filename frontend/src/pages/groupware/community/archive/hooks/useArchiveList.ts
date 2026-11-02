import { useCallback, useEffect, useRef, useState } from 'react';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { fetchArchiveFiles } from '../services/archiveBoardService';
import type {
  ArchiveFileRow,
  ArchiveFileSearchFilters,
} from '../types/archive.types';

function createInitialFilters(): ArchiveFileSearchFilters {
  return {
    keyword: '',
    folderCode: '',
    uploadedFrom: '',
    uploadedTo: '',
    fileType: 'ALL',
  };
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export function useArchiveList(enabled: boolean) {
  const [filters, setFilters] =
    useState<ArchiveFileSearchFilters>(createInitialFilters);
  const [rows, setRows] = useState<ArchiveFileRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const requestSequence = useRef(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  useEffect(() => {
    if (!enabled) return;

    const currentRequest = ++requestSequence.current;
    const controller = new AbortController();
    start();
    setIsLoading(true);
    setError(null);

    void fetchArchiveFiles(filters, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted && currentRequest === requestSequence.current) {
          setRows(result.resultList);
          succeed();
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || currentRequest !== requestSequence.current) {
          return;
        }
        fail(cause);
        setError(asError(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted && currentRequest === requestSequence.current) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [enabled, filters, retryToken, start, succeed, fail]);

  const retry = useCallback(() => {
    setRetryToken((current) => current + 1);
  }, []);

  return { initialLoad, filters, setFilters, rows, isLoading, error, retry };
}
