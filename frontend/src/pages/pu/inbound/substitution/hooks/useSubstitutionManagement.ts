import { useCallback, useEffect, useRef, useState } from 'react';
import { todayDash } from '../../../../../shared/utils/excelFile';
import { fetchDetail, fetchMaterials, fetchSchedules } from '../services/materialSubstitution.service';
import type { SubstitutionDetail, SubstitutionMaterial, SubstitutionSchedule } from '../types/materialSubstitution.types';
import { applyCount } from '../utils/materialSubstitution';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 재료 치환등록 화면의 생산일자 · 목록 · 상세보기 상태. 마지막 요청의 응답만 쓴다
export function useSubstitutionManagement() {
  const requestIdRef = useRef(0);
  const [date, setDate] = useState(() => todayDash());
  const [rows, setRows] = useState<SubstitutionSchedule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<SubstitutionMaterial[]>([]);
  const [detail, setDetail] = useState<SubstitutionDetail | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);

  const load = useCallback(async (day: string) => {
    if (!day) {
      setAlertText('날짜를 골라주세요');
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const list = await fetchSchedules(day);
      if (requestId !== requestIdRef.current) return;
      setRows(list);
      setLoaded(true);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setAlertText(errorText(requestError, '불러오지 못했어요'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  // 송연과 같이 화면을 열면 오늘 것을 바로 조회한다
  useEffect(() => {
    void load(todayDash());
  }, [load]);

  const search = () => void load(date);

  const openDetail = useCallback(async (row: SubstitutionSchedule) => {
    try {
      // 후보 목록은 처음 열 때 한 번만 받는다
      if (materials.length === 0) setMaterials(await fetchMaterials());
      setDetail(await fetchDetail(row.id));
    } catch (requestError) {
      setAlertText(errorText(requestError, '불러오지 못했어요'));
    }
  }, [materials]);

  // 바꾸거나 되돌린 뒤 뒤에 깔린 목록의 '원재료치환' 칸도 같이 고친다
  const changed = (next: SubstitutionDetail) => {
    setDetail(next);
    setRows((current) => applyCount(current, next.header));
  };

  return {
    date,
    setDate,
    rows,
    loaded,
    loading,
    search,
    materials,
    detail,
    setDetail,
    openDetail,
    changed,
    alertText,
    setAlertText,
  };
}
