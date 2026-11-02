import { useCallback, useEffect, useState } from 'react';
import { useInitialLoadState } from './useInitialLoadState';
import { resolvePageSearchDefaults } from '../components/page-search/searchDefaults';
import type {
  PageSearchField,
  PageSearchFieldValue,
} from '../components/page-search/searchFields';

type PageSearchDefaultsState = {
  values: Record<string, PageSearchFieldValue> | null;
  loading: boolean;
  error: string | null;
};

export function usePageSearchDefaults(fields: PageSearchField[]) {
  const [state, setState] = useState<PageSearchDefaultsState>({
    values: null,
    loading: true,
    error: null,
  });
  const [retryToken, setRetryToken] = useState(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  useEffect(() => {
    let active = true;
    start();
    setState({ values: null, loading: true, error: null });

    resolvePageSearchDefaults(fields)
      .then((values) => {
        if (active) {
          succeed();
          setState({ values, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        fail(error);
        const message =
          error instanceof Error && error.message
            ? error.message
            : '기본 검색 조건을 불러오지 못했습니다.';
        setState({ values: null, loading: false, error: message });
      });

    return () => {
      active = false;
    };
  }, [fields, retryToken, start, succeed, fail]);

  const retry = useCallback(() => {
    setRetryToken((current) => current + 1);
  }, []);

  return { ...state, retry, initialLoad };
}
