import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoxTypeRow } from '../../../../co/master/box-type/types/boxType.types';
import { fetchBoxTypeRows } from '../../../../co/master/box-type/services/boxType.service';
import { fetchPricingDetail, fetchPricingRows, savePricing } from '../services/pricing.service';
import type { PricingBomLine, PricingDetail, PricingRow } from '../types/pricing.types';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const SEARCH_DELAY_MS = 250;

// 단가관리 화면의 조회 · 저장 상태(S_ERP 품목관리 useMaterialManagement 와 같은 역할)
// 송연 loadTable: 검색어로 서버에서 다시 받는다(거래처 · 차액금은 받은 목록 안에서 화면이 거른다). 마지막 요청의 응답만 쓴다
export function usePricingManagement(search: string) {
  const requestIdRef = useRef(0);
  const detailRequestRef = useRef(0);
  const searchRef = useRef(search);
  searchRef.current = search;
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [packagingTypes, setPackagingTypes] = useState<BoxTypeRow[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ detail: PricingDetail; bom: PricingBomLine[] } | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const result = await fetchPricingRows(searchRef.current);
      if (requestId === requestIdRef.current) setRows(result);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorText(requestError, '단가 목록을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  // 검색어를 고치면 잠시 뒤 다시 받는다(송연과 같음)
  useEffect(() => {
    const timer = setTimeout(() => void reload(), search ? SEARCH_DELAY_MS : 0);
    return () => clearTimeout(timer);
  }, [search, reload]);

  // 송연 loadProductTypeDropdown: 단가상세 창의 포장유형 목록을 화면을 열 때 한 번
  useEffect(() => {
    fetchBoxTypeRows().then(setPackagingTypes).catch(() => undefined);
  }, []);

  // 송연 selectProduct: [상세] 칸 연필을 누르면 상세를 받아 창을 연다(못 받으면 창을 열지 않는다)
  const loadDetail = useCallback(async (code: string) => {
    const requestId = ++detailRequestRef.current;
    try {
      const result = await fetchPricingDetail(code);
      if (requestId === detailRequestRef.current) setDetail(result);
    } catch (requestError) {
      if (requestId === detailRequestRef.current) setError(errorText(requestError, '단가상세를 불러오지 못했습니다.'));
    }
  }, []);

  const openDetail = useCallback((row: PricingRow) => {
    setSelectedCode(row.id);
    setDetail(null);
    void loadDetail(row.id);
  }, [loadDetail]);

  const closeDetail = useCallback(() => {
    detailRequestRef.current++;
    setSelectedCode(null);
    setDetail(null);
  }, []);

  // 송연 reg-save: 저장 → 목록 다시 조회 → 상세도 최신 값으로
  const saveDetail = async (body: Record<string, unknown>) => {
    if (!selectedCode) return;
    await savePricing(selectedCode, body);
    void reload();
    await loadDetail(selectedCode);
  };

  return {
    rows,
    loading,
    packagingTypes,
    selectedCode,
    detail,
    error,
    setError,
    reload,
    openDetail,
    closeDetail,
    saveDetail,
  };
}
