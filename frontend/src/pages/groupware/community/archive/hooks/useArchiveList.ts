import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { fetchArchiveFiles } from '../services/archiveBoardService';
import type {
  ArchiveFileRow,
  ArchiveFileSearchFilters,
} from '../types/archive.types';

function createInitialFilters(): ArchiveFileSearchFilters {
  const today = dayjs();
  return {
    keyword: '',
    folderCode: '',
    uploadedFrom: today.subtract(1, 'year').format('YYYY-MM-DD'),
    uploadedTo: today.format('YYYY-MM-DD'),
    fileType: 'ALL',
  };
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export function useArchiveList() {
  const [filters, setFilters] =
    useState<ArchiveFileSearchFilters>(createInitialFilters);
  const [rows, setRows] = useState<ArchiveFileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const requestSequence = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestSequence.current;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    void fetchArchiveFiles(filters, controller.signal)
      .then((result) => {
        if (currentRequest === requestSequence.current) {
          setRows(result.resultList);
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || currentRequest !== requestSequence.current) {
          return;
        }
        setRows([]);
        setError(asError(cause));
      })
      .finally(() => {
        if (currentRequest === requestSequence.current) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [filters, retryToken]);

  const retry = useCallback(() => {
    setRetryToken((current) => current + 1);
  }, []);

  return { filters, setFilters, rows, isLoading, error, retry };
}
