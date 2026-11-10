import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridRef } from '../../../../../shared/components/f1-grid';
import { readSearchSession, saveSearchSession } from '../../../../../shared/utils/searchSession';
import { fetchReceivings } from '../services/receiving.service';
import type { Receiving } from '../types/receiving.types';
import { type DayPeriod, errorText, periodQuery, sumOf, todayPeriod } from '../utils/receiving';

// 입고등록 화면: 입고내역 조회. 열면 오늘 것을 바로 보여준다. 마지막 요청의 응답만 쓴다
export function useReceivingHistory(onError: (text: string) => void) {
  const gridRef = useRef<F1GridRef<Receiving>>(null);
  const requestRef = useRef(0);
  const [version, setVersion] = useState(0); // 다시 조회하면 표를 새로 그려 '지운 줄' 기록도 비운다
  const [dirty, setDirty] = useState(false);
  // 2026-11-04 마지막으로 조회한 기간 · 거래처는 탭 세션에 두고, 다른 화면에 갔다 돌아오면 그 조건으로 다시 부른다
  const [initial] = useState(() => readSearchSession('pu-receiving-register', { period: todayPeriod(), client: '' }));
  const [period, setPeriod] = useState<DayPeriod>(initial.period); // [조회]로 적용한 기간
  const [client, setClient] = useState(initial.client);
  const [rows, setRows] = useState<Receiving[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  // 반품은 반품등록 화면에서 따로 본다
  const load = useCallback(async (range: DayPeriod, clientQ: string) => {
    saveSearchSession('pu-receiving-register', { period: range, client: clientQ });
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const list = await fetchReceivings({ ...periodQuery(range.from, range.to), clientQ, kind: 'receiving' });
      if (requestId === requestRef.current) {
        setRows(list);
        setDirty(false);
        setVersion((previous) => previous + 1);
      }
    } catch (requestError) {
      if (requestId === requestRef.current) onError(errorText(requestError, '입고내역을 불러오지 못했어요'));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load(initial.period, initial.client);
  }, [load, initial]);

  // 등록한 입고일의 내역을 바로 보여준다
  const afterRegistered = (receiveDate: string) => {
    const next = { from: receiveDate, to: receiveDate };
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
    registerOpen,
    setRegisterOpen,
    afterRegistered,
  };
}
