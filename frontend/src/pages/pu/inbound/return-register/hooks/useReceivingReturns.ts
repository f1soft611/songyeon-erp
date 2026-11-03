import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridRef } from '../../../../../shared/components/f1-grid';
import { fetchReceivings } from '../../receiving-register/services/receiving.service';
import type { Receiving } from '../../receiving-register/types/receiving.types';
import { type DayPeriod, errorText, periodQuery, sumOf, todayPeriod } from '../../receiving-register/utils/receiving';

// 반품등록 화면: 반품내역 조회. 열면 오늘 것을 바로 보여준다. 마지막 요청의 응답만 쓴다
export function useReceivingReturns(onError: (text: string) => void) {
  const gridRef = useRef<F1GridRef<Receiving>>(null);
  const requestRef = useRef(0);
  const [version, setVersion] = useState(0); // 다시 조회하면 표를 새로 그려 '지운 줄' 기록도 비운다
  const [dirty, setDirty] = useState(false);
  const [period, setPeriod] = useState<DayPeriod>(todayPeriod); // [조회]로 적용한 기간
  const [client, setClient] = useState('');
  const [rows, setRows] = useState<Receiving[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  const load = useCallback(async (range: DayPeriod, clientQ: string) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const list = await fetchReceivings({ ...periodQuery(range.from, range.to), clientQ, kind: 'return' });
      if (requestId === requestRef.current) {
        setRows(list);
        setDirty(false);
        setVersion((previous) => previous + 1);
      }
    } catch (requestError) {
      if (requestId === requestRef.current) onError(errorText(requestError, '반품내역을 불러오지 못했어요'));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load(todayPeriod(), '');
  }, [load]);

  // 등록한 반품일의 내역을 바로 보여준다
  const afterRegistered = (returnDate: string) => {
    const next = { from: returnDate, to: returnDate };
    setPeriod(next);
    void load(next, client);
  };

  return {
    gridRef,
    version,
    dirty,
    setDirty,
    period,
    setPeriod,
    client,
    setClient,
    rows,
    totalAmount: sumOf(rows ?? [], 'totalAmount'),
    loading,
    load,
    returnOpen,
    setReturnOpen,
    afterRegistered,
  };
}
