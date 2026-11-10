import { useCallback, useEffect, useState } from 'react';
import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';
import { fetchProductSpecs } from '../services/productInspection.service';
import type { ProductSpecRow, ProductSpecStats } from '../utils/productInspection';

const errorText = (error: unknown) => (error instanceof Error && error.message ? error.message : '제품 목록을 불러오지 못했습니다');

// 제품별 기준 탭: 탭을 처음 열면 부르고(송연 탭 누르면 loadQdocPspec), [조회] · 검색줄 Enter · 상세 조회로 다시 부른다.
// 검색줄 제품명/제품코드와 상세 조회 '보기' 는 서버가 거른다
export function useProductSpecs(active: boolean) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<ProductSpecRow[]>([]);
  const [stats, setStats] = useState<ProductSpecStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  // 상세 조회(⌄): [조회]로 적용한 값(조건 칩) · 고치는 중인 값
  const [detail, setDetail] = useState<Record<string, PageSearchFieldValue>>({});
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>({});

  const load = useCallback(async (query: string, only: PageSearchFieldValue | undefined) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchProductSpecs(query.trim(), typeof only === 'string' ? only : '');
      setRows(result.rows);
      setStats(result.stats);
    } catch (err) {
      setRows([]);
      setError(errorText(err));
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  // 탭을 처음 열 때 한 번
  useEffect(() => {
    if (active && !loaded && !loading) void load('', undefined);
  }, [active, loaded, loading, load]);

  const search = () => void load(q, detail.only);
  const applyDetail = (values: Record<string, PageSearchFieldValue>) => {
    setDetail(values);
    void load(q, values.only);
  };

  return { q, setQ, rows, stats, loading, loaded, error, detail, detailValues, setDetailValues, search, applyDetail };
}
