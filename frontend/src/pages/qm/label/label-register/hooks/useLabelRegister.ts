import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';
import { fetchLabelProducts } from '../services/labelRegister.service';
import { filterProducts, type LabelProductRow, type ProductFilter } from '../utils/labelRegister';

const toFilter = (value: PageSearchFieldValue | undefined): ProductFilter => (value === 'done' || value === 'todo' ? value : 'all');

// 라벨등록 화면: 제품 목록. 열면 바로 부른다. 검색줄 제품명/제품코드는 서버가 찾고, 상세 조회 라벨 상태는 받은 목록 안에서 거른다
export function useLabelRegister() {
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<LabelProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // 상세 조회(⌄): [조회]로 적용한 값(조건 칩) · 고치는 중인 값
  const [detail, setDetail] = useState<Record<string, PageSearchFieldValue>>({});
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>({});

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      setProducts(await fetchLabelProducts(query.trim()));
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load('');
  }, [load]);

  const rows = useMemo(() => filterProducts(products, toFilter(detail.labelState)), [products, detail]);

  const search = () => void load(q);
  const applyDetail = (values: Record<string, PageSearchFieldValue>) => {
    setDetail(values);
    void load(q);
  };

  return { q, setQ, rows, loading, loaded, detail, detailValues, setDetailValues, search, applyDetail };
}
