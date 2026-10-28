import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { fetchBoxTypeRows, saveBoxType, toBoxTypePayload } from '../services/boxType.service';
import type { BoxTypeRow } from '../types/boxType.types';

// 포장유형 화면의 조회 · 저장 상태(S_ERP 거래처관리 useCustomerManagement 와 같은 역할)
export function useBoxTypeManagement() {
  const { showSuccess } = useNotification();
  const [rows, setRows] = useState<BoxTypeRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const requestIdRef = useRef(0);

  // 포장유형 화면은 사용안함 줄까지 받는다(거르는 것은 화면에서)
  const loadRows = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await fetchBoxTypeRows(true);
      if (requestId !== requestIdRef.current) return;
      setRows(result);
      setHasChanges(false);
      setGridKey((current) => current + 1);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : '포장유형 목록을 불러오지 못했습니다.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const handleChangesChange = useCallback((changes: F1GridChanges<BoxTypeRow>) => {
    setHasChanges(
      changes.insertedRows.length > 0 ||
        changes.updatedRows.length > 0 ||
        changes.deletedRows.length > 0,
    );
  }, []);

  // 새 줄 · 고친 줄을 한 줄씩 보낸다(서버에 한꺼번에 저장하는 API 가 없다). 다 보내면 목록을 다시 불러온다
  const saveChanges = useCallback(
    async (changes: F1GridChanges<BoxTypeRow>) => {
      if (savingRef.current) return;
      const targets = [...changes.insertedRows, ...changes.updatedRows];
      if (!targets.length && !changes.deletedRows.length) return;
      savingRef.current = true;
      setSaving(true);
      setError('');
      let sent = 0;
      try {
        // 행삭제 없음(2026-10-27, S_ERP 거래처관리와 같음): 지운 줄이 있으면 저장하지 않고 안내한다
        if (changes.deletedRows.length) {
          throw new Error('포장유형은 삭제할 수 없습니다. 사용 여부를 변경해 주세요.');
        }
        for (const row of targets) {
          if (!row.boxTypeNm.trim()) throw new Error('포장유형명을 입력하세요');
        }
        for (const row of targets) {
          await saveBoxType(toBoxTypePayload(row));
          sent += 1;
        }
        await loadRows();
        showSuccess('포장유형을 저장했습니다.');
      } catch (saveError) {
        // 앞에서 보낸 줄은 이미 반영됐으니 목록을 다시 맞춘다(보내기 전에 막힌 것이면 고치던 내용을 그대로 둔다)
        if (sent) await loadRows();
        setError(saveError instanceof Error ? saveError.message : '포장유형을 저장하지 못했습니다.');
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [loadRows, showSuccess],
  );

  return {
    rows,
    error,
    setError,
    loading,
    saving,
    hasChanges,
    gridKey,
    reload: loadRows,
    handleChangesChange,
    saveChanges,
  };
}
