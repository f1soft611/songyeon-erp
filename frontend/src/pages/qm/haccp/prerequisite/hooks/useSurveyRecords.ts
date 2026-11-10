import { useCallback, useEffect, useState } from 'react';
import { fetchMissing, fetchRecordSheet, fetchSurveyRecords, type FetchedSheet } from '../services/prerequisite.service';
import type { SurveyMissing, SurveyRecordRow } from '../utils/prerequisite';

const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

// 현황 탭(송연 qvLoadRecords · qvOpenRecord): 탭을 처음 열면 · [조회] · 서류를 바꾸면 목록과 안 쓴 기간을 부른다.
// 기간은 처음엔 비어 있다(원본은 최근 3개월을 채우지만 ERP 는 조회 조건을 비워 둔다). 줄을 누르면 보기 전용으로 연다
export function useSurveyRecords(active: boolean) {
  const [formId, setFormIdState] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [rows, setRows] = useState<SurveyRecordRow[]>([]);
  const [missing, setMissing] = useState<SurveyMissing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [viewSheet, setViewSheet] = useState<FetchedSheet | null>(null);

  const load = useCallback(async (query: { start: string; end: string; formId: string }) => {
    setLoading(true);
    setError('');
    setViewSheet(null);
    try {
      const [records, gaps] = await Promise.all([fetchSurveyRecords(query.start, query.end, query.formId), fetchMissing()]);
      setRows(records);
      setMissing(gaps);
    } catch (err) {
      setRows([]);
      setError(errorText(err, '점검표 목록을 불러오지 못했습니다'));
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (active && !loaded && !loading) void load({ start: '', end: '', formId: '' });
  }, [active, loaded, loading, load]);

  const search = () => void load({ start, end, formId });
  // 서류를 바꾸면 바로 조회(원본 qv-list-form change)
  const setFormId = (value: string) => {
    setFormIdState(value);
    void load({ start, end, formId: value });
  };

  const openRecord = async (recordId: number) => {
    try {
      setViewSheet(await fetchRecordSheet(recordId));
    } catch (err) {
      setError(errorText(err, '점검표를 열지 못했습니다'));
    }
  };

  return { formId, setFormId, start, setStart, end, setEnd, rows, missing, loading, loaded, error, search, viewSheet, openRecord };
}
