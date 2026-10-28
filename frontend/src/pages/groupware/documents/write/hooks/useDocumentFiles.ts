import { useCallback, useEffect, useRef, useState } from 'react';
import { listDocumentFiles } from '../services/documentApproval.service';
import type { DocumentFileItem, DocumentFileQuery } from '../types/documentWrite.types';

export function useDocumentFiles(
  enabled: boolean,
  { scope, documentType, electronicApprovalId }: Omit<DocumentFileQuery, 'beforeFileId'>,
  reloadVersion: number,
) {
  const [items, setItems] = useState<DocumentFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasNext, setHasNext] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const generation = useRef(0);
  const inFlight = useRef(false);

  const loadPage = useCallback(async (beforeFileId: number | undefined, version: number) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsLoading(true);
    setError('');
    try {
      const page = await listDocumentFiles({ scope, documentType, electronicApprovalId, beforeFileId });
      if (version !== generation.current) return;
      setItems((previous) => beforeFileId === undefined ? page.resultList : [...previous, ...page.resultList]);
      setHasNext(page.hasNext);
      setCursor(page.nextBeforeFileId);
    } catch (cause: unknown) {
      if (version === generation.current) {
        setError(cause instanceof Error ? cause.message : '첨부파일을 불러오지 못했습니다.');
      }
    } finally {
      if (version === generation.current) {
        inFlight.current = false;
        setIsLoading(false);
      }
    }
  }, [scope, documentType, electronicApprovalId]);

  useEffect(() => {
    const version = ++generation.current;
    inFlight.current = false;
    setItems([]);
    setCursor(null);
    setHasNext(false);
    setError('');
    setIsLoading(enabled);
    if (enabled) void loadPage(undefined, version);
    return () => { generation.current = version + 1; };
  }, [enabled, loadPage, reloadVersion]);

  const loadMore = useCallback(() => {
    if (enabled && hasNext && cursor !== null && !error) {
      void loadPage(cursor, generation.current);
    }
  }, [enabled, hasNext, cursor, error, loadPage]);
  const retry = useCallback(() => {
    if (enabled) void loadPage(cursor ?? undefined, generation.current);
  }, [enabled, cursor, loadPage]);

  return { items, isLoading, error, hasNext, loadMore, retry };
}
