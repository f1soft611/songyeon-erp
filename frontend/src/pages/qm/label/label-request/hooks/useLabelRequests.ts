import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';
import { fetchRequests } from '../../label-register/services/labelRegister.service';
import type { LabelRequestRow } from '../../label-register/utils/labelRegister';

const statusOf = (values: Record<string, PageSearchFieldValue>) => (typeof values.status === 'string' ? values.status : '');

// 표시사항 요청 화면: 요청 목록. 열면 바로 부른다(상세 조회는 빈 값 = 전체로 시작).
// 상세 조회 상태는 서버가 거르고, 검색줄 업체명/레시피명은 받은 목록 안에서 거른다
export function useLabelRequests() {
  const [keyword, setKeyword] = useState('');
  const [requests, setRequests] = useState<LabelRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [detail, setDetail] = useState<Record<string, PageSearchFieldValue>>({});
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>({});

  const load = useCallback(async (status: string) => {
    setLoading(true);
    try {
      setRequests(await fetchRequests(status));
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load('');
  }, [load]);

  const rows = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return requests;
    return requests.filter((row) => `${row.clientName ?? ''} ${row.recipeName ?? ''}`.toLowerCase().includes(text));
  }, [requests, keyword]);

  const reload = () => void load(statusOf(detail));
  const applyDetail = (values: Record<string, PageSearchFieldValue>) => {
    setDetail(values);
    void load(statusOf(values));
  };

  return { keyword, setKeyword, rows, loading, loaded, detail, detailValues, setDetailValues, reload, applyDetail };
}
