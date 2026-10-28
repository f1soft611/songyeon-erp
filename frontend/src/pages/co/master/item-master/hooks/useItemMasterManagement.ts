import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { fetchProductBomRows, setProductDiscontinued } from '../services/itemMaster.service';
import { discontinueChangesOf, toItemMasterRows, type ItemMasterRow } from '../utils/itemMaster';

// 제품마스터 화면의 조회 · 저장 상태(S_ERP 거래처관리 useCustomerManagement 와 같은 역할)
export function useItemMasterManagement() {
  const { showSuccess } = useNotification();
  const [rows, setRows] = useState<ItemMasterRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const requestIdRef = useRef(0);

  // 2026-10-23 사용안함 제품도 늘 받아 두고, 조회 조건 사용여부로 화면에서 거른다
  const loadRows = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await fetchProductBomRows(true);
      if (requestId !== requestIdRef.current) return;
      setRows(toItemMasterRows(result));
      setHasChanges(false);
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

  // 이 화면은 사용여부만 고친다(새 줄 · 지운 줄은 생기지 않는다)
  const handleChangesChange = useCallback((changes: F1GridChanges<ItemMasterRow>) => {
    setHasChanges(changes.updatedRows.length > 0);
  }, []);

  // 제목줄 [저장]: 사용여부를 바꾼 줄만 보낸다(PUT .../discontinue). 다 보내면 목록을 다시 불러온다
  const saveChanges = useCallback(
    async (changes: F1GridChanges<ItemMasterRow>) => {
      if (savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      setError('');
      let sent = 0;
      try {
        const targets = discontinueChangesOf(rows, changes.updatedRows);
        for (const target of targets) {
          await setProductDiscontinued(target.code, target.discontinued);
          sent += 1;
        }
        await loadRows();
        if (targets.length) showSuccess('저장되었습니다');
      } catch (saveError) {
        // 앞에서 보낸 줄은 이미 반영됐으니 목록을 다시 맞춘다
        if (sent) await loadRows();
        setError(saveError instanceof Error && saveError.message ? saveError.message : '저장하지 못했어요');
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [loadRows, rows, showSuccess],
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
