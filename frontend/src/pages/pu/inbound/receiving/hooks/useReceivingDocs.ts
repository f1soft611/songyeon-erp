import { useCallback, useMemo, useRef, useState } from 'react';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { fetchReceivingSummary, fetchReceivings } from '../services/receiving.service';
import type { DocQuery, DocRow, DocTarget, Receiving, ReceivingSummary } from '../types/receiving.types';
import { DOC_EXCEL_COLUMNS, errorText, filesOfMaterial, monthStart, rowsOfMaterial } from '../utils/receiving';

// 서류등록 탭: 품목별로 묶어 입고 건마다 서류를 붙인다. 마지막 요청의 응답만 쓴다
export function useReceivingDocs(onError: (text: string) => void) {
  const requestRef = useRef(0);
  const [query, setQuery] = useState<DocQuery>(() => ({ start: monthStart(), end: todayDash(), clientQ: '', materialQ: '' }));
  const queryRef = useRef(query);
  queryRef.current = query;
  const [summary, setSummary] = useState<ReceivingSummary[] | null>(null);
  const [files, setFiles] = useState<Receiving[]>([]); // 그 기간의 입고줄(+붙어있는 서류)
  const [loading, setLoading] = useState(false);
  const [missingOnly, setMissingOnly] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<DocTarget | null>(null);
  const [viewTarget, setViewTarget] = useState<DocTarget | null>(null);
  const [detailTarget, setDetailTarget] = useState<DocTarget | null>(null);
  const [detailQuery, setDetailQuery] = useState<DocQuery>(query);

  // 서류는 입고 한 줄 한 줄에 붙어있다. 품목별 표에 서류칸을 그리려면 그 기간의 입고줄을 같이 받아둬야 한다
  const loadFiles = useCallback(async (current: DocQuery) => {
    setFiles(await fetchReceivings({ start: current.start, end: current.end, clientQ: current.clientQ, kind: 'receiving' }));
  }, []);

  const load = useCallback(async () => {
    const current = queryRef.current;
    if (!current.start || !current.end) {
      onError('조회 기간을 선택해주세요');
      return;
    }
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const list = await fetchReceivingSummary(current.start, current.end, current.clientQ, current.materialQ);
      await loadFiles(current);
      if (requestId === requestRef.current) setSummary(list);
    } catch (requestError) {
      if (requestId === requestRef.current) onError(errorText(requestError, '조회에 실패했어요'));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [loadFiles, onError]);

  // 올리거나 지운 뒤 서류만 다시 받는다(열려있는 창도 같이 바뀐다)
  const refreshFiles = useCallback(async () => {
    try {
      await loadFiles(queryRef.current);
    } catch (requestError) {
      onError(errorText(requestError, '서류 목록을 다시 불러오지 못했어요'));
    }
  }, [loadFiles, onError]);

  const rows = useMemo<DocRow[]>(() => (summary ?? [])
    .map((row) => ({ ...row, key: row.materialCode, fileCount: filesOfMaterial(files, row.materialCode).length }))
    .filter((row) => !missingOnly || row.fileCount === 0), [summary, files, missingOnly]);

  const exportExcel = async () => {
    if (!summary || summary.length === 0) {
      onError('먼저 조회해주세요');
      return;
    }
    const { start, end } = queryRef.current;
    await downloadExcel(summary, DOC_EXCEL_COLUMNS, `입고현황_${start}~${end}.xlsx`, '서류등록');
  };

  const changeText = (key: 'clientQ' | 'materialQ') => (event: { target: { value: string } }) =>
    setQuery((current) => ({ ...current, [key]: event.target.value }));
  const setStart = (start: string) => setQuery((current) => ({ ...current, start }));
  const setEnd = (end: string) => setQuery((current) => ({ ...current, end }));

  const openDetail = useCallback((target: DocTarget) => {
    setDetailQuery(queryRef.current);
    setDetailTarget(target);
  }, []);

  return {
    query,
    summary,
    rows,
    loading,
    load,
    refreshFiles,
    exportExcel,
    changeText,
    setStart,
    setEnd,
    missingOnly,
    setMissingOnly,
    uploadTarget,
    setUploadTarget,
    uploadRows: uploadTarget ? rowsOfMaterial(files, uploadTarget.code) : [],
    viewTarget,
    setViewTarget,
    viewRows: viewTarget ? rowsOfMaterial(files, viewTarget.code) : [],
    detailTarget,
    setDetailTarget,
    detailQuery,
    openDetail,
  };
}
