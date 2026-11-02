import { useCallback, useMemo, useRef, useState } from 'react';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { fetchReceivings } from '../services/receiving.service';
import type { InQuery, Kind, Receiving, StatusRow } from '../types/receiving.types';
import { IN_STATUS_EXCEL_COLUMNS, errorText, monthStart, noPriceRows, sortInStatus, sumOf, toInStatusRows } from '../utils/receiving';

// 입고현황 탭: 기간 안에 들어온 것을 한 줄씩(반품 포함). 마지막 요청의 응답만 쓴다
export function useReceivingStatus(onError: (text: string) => void) {
  const requestRef = useRef(0);
  const [query, setQuery] = useState<InQuery>(() => ({ start: monthStart(), end: todayDash(), clientQ: '', materialQ: '', kind: '' }));
  const queryRef = useRef(query);
  queryRef.current = query;
  const [records, setRecords] = useState<Receiving[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (override?: Partial<InQuery>) => {
    const current = { ...queryRef.current, ...override };
    if (!current.start || !current.end) {
      onError('조회 기간을 선택해주세요');
      return;
    }
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const list = await fetchReceivings(current);
      if (requestId === requestRef.current) setRecords(list);
    } catch (requestError) {
      if (requestId === requestRef.current) onError(errorText(requestError, '조회에 실패했어요'));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [onError]);

  // 품목 칸은 날짜·거래처 안에서 같은 품목끼리 묶되, 입고와 반품은 따로 묶는다('반품' 딱지가 어느 줄 것인지 보이게)
  const rows = useMemo<StatusRow[]>(
    () => toInStatusRows(records ?? []).map((row) => ({ ...row, materialKey: `${row.materialName || ''}|${row.isReturn ? 1 : 0}` })),
    [records],
  );

  const exportExcel = async () => {
    if (!records || records.length === 0) {
      onError('먼저 조회해주세요');
      return;
    }
    const { start, end } = queryRef.current;
    await downloadExcel(sortInStatus(records), IN_STATUS_EXCEL_COLUMNS, `입고현황_${start}_${end}.xlsx`, '입고현황');
  };

  const changeText = (key: 'clientQ' | 'materialQ') => (event: { target: { value: string } }) =>
    setQuery((current) => ({ ...current, [key]: event.target.value }));
  const setStart = (start: string) => setQuery((current) => ({ ...current, start }));
  const setEnd = (end: string) => setQuery((current) => ({ ...current, end }));

  const changeKind = (kind: Kind) => {
    setQuery((current) => ({ ...current, kind }));
    // 송연과 같이 고르면 바로 다시 부른다
    void load({ kind });
  };

  return {
    query,
    records,
    rows,
    noPrice: noPriceRows(records ?? []),
    supplyAmount: sumOf(records ?? [], 'supplyAmount'),
    vatAmount: sumOf(records ?? [], 'vatAmount'),
    totalAmount: sumOf(records ?? [], 'totalAmount'),
    loading,
    load,
    exportExcel,
    changeText,
    setStart,
    setEnd,
    changeKind,
  };
}
