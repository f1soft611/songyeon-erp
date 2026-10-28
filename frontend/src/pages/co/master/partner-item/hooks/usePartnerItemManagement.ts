import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPartnerItemRows } from '../services/partnerItem.service';
import type { PartnerItemRow } from '../types/partnerItem.types';

// 송연 renderClientBomList: 검색어를 적어야 그 거래처의 제품만 보여준다(아무것도 안 적으면 목록을 내놓지 않는다)
// 2026-10-27 거래처명뿐 아니라 거래처코드로도 찾는다(부분 일치)
export function filterClientProducts(rows: PartnerItemRow[], search: string): PartnerItemRow[] {
  const query = search.trim().toLowerCase();
  if (!query) return [];
  return rows.filter(
    (row) => row.clientName.toLowerCase().includes(query) || row.clientCode.toLowerCase().includes(query),
  );
}

// 거래처별 제품조회 화면의 조회 상태(S_ERP 거래처관리 useCustomerManagement 와 같은 역할). 보기 전용이라 저장은 없다
export function usePartnerItemManagement() {
  const [rows, setRows] = useState<PartnerItemRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [gridKey, setGridKey] = useState(0);
  const requestIdRef = useRef(0);

  const loadRows = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await fetchPartnerItemRows();
      if (requestId !== requestIdRef.current) return;
      setRows(result);
      setGridKey((current) => current + 1);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setRows([]);
      setError(loadError instanceof Error && loadError.message ? loadError.message : '제품 목록을 불러오지 못했습니다.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  return {
    rows,
    error,
    setError,
    loading,
    gridKey,
    reload: loadRows,
  };
}
