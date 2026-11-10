import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchInspectionLots, type InspectionLotQuery } from '../services/productInspection.service';
import { filterLots, type InspectionLotRow } from '../utils/productInspection';

const errorText = (error: unknown) => (error instanceof Error && error.message ? error.message : '생산 로트를 불러오지 못했습니다');

// 검사 탭: 화면을 처음 열면 부르고(송연 메뉴 열면 loadQdocSpec), [조회] · 생산예정도 보기를 바꾸면 다시 부른다.
// 상태 고르기는 받아온 줄을 화면에서 거른다(서버를 다시 부르지 않는다)
export function useInspectionLots(active: boolean) {
  const [dateBy, setDateBy] = useState('made');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [filter, setFilter] = useState('');
  const [planned, setPlannedState] = useState(false);
  const [lots, setLots] = useState<InspectionLotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (query: InspectionLotQuery) => {
    setLoading(true);
    setError('');
    try {
      setLots(await fetchInspectionLots(query));
    } catch (err) {
      setLots([]);
      setError(errorText(err));
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  // 탭을 처음 열 때 한 번(처음 조건은 비어 있다)
  useEffect(() => {
    if (active && !loaded && !loading) void load({ start: '', end: '', dateBy: 'made', planned: false });
  }, [active, loaded, loading, load]);

  const search = () => void load({ start, end, dateBy, planned });
  const setPlanned = (value: boolean) => {
    setPlannedState(value);
    void load({ start, end, dateBy, planned: value });
  };
  const rows = useMemo(() => filterLots(lots, filter), [lots, filter]);

  return { dateBy, setDateBy, start, setStart, end, setEnd, filter, setFilter, planned, setPlanned, lots, rows, loading, loaded, error, search };
}
