import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { createWarehouse, fetchWarehouseRows, updateWarehouse } from '../services/warehouse.service';
import type { WarehouseRow } from '../types/warehouse.types';
import { isNewWarehouseRow, validateWarehouseChanges } from '../utils/warehouse';

// 창고등록 화면의 조회 · 저장 상태(S_ERP 거래처관리 useCustomerManagement 와 같은 역할)
export function useWarehouseManagement() {
  const { showSuccess } = useNotification();
  const [rows, setRows] = useState<WarehouseRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const requestIdRef = useRef(0);

  // 창고등록 화면은 사용안함 줄까지 받는다(거르는 것은 화면에서)
  const loadRows = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await fetchWarehouseRows(true);
      if (requestId !== requestIdRef.current) return;
      setRows(result);
      setHasChanges(false);
      setGridKey((current) => current + 1);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : '창고 목록을 불러오지 못했습니다.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const handleChangesChange = useCallback((changes: F1GridChanges<WarehouseRow>) => {
    setHasChanges(
      changes.insertedRows.length > 0 ||
        changes.updatedRows.length > 0 ||
        changes.deletedRows.length > 0,
    );
  }, []);

  // activeRows: 지금 표에 남아 있는 줄 전체(같은 이름 · 기본창고 한 곳 확인용)
  // 저장된 창고 수정을 먼저, 새 창고 등록을 나중에 한 줄씩 보낸다(서버에 한꺼번에 저장하는 API 가 없다)
  const saveChanges = useCallback(
    async (changes: F1GridChanges<WarehouseRow>, activeRows: WarehouseRow[]) => {
      if (savingRef.current) return;
      if (!changes.insertedRows.length && !changes.updatedRows.length && !changes.deletedRows.length) return;
      savingRef.current = true;
      setSaving(true);
      setError('');
      let sent = 0;
      try {
        // 행삭제 없음(2026-10-27, S_ERP 거래처관리와 같음): 지운 줄이 있으면 저장하지 않고 안내한다
        if (changes.deletedRows.length) {
          throw new Error('창고는 삭제할 수 없습니다. 사용 여부를 변경해 주세요.');
        }
        const problem = validateWarehouseChanges(rows, activeRows, changes);
        if (problem) throw new Error(problem);

        // 기본창고(입고창고)로 켜는 줄을 먼저 보내야 원래 줄을 끌 수 있다
        // (서버는 입고창고가 하나도 안 남는 수정을 막는다)
        const originalById = new Map(rows.map((row) => [row.id, row]));
        const order = (row: WarehouseRow) => (row.isDefault ? 1 : 0);
        const updates = changes.updatedRows
          .filter((row) => !isNewWarehouseRow(row) && row.warehouseId !== null)
          .map((row) => {
            const original = originalById.get(row.id);
            const defaultChanged = original ? original.isDefault !== row.isDefault : false;
            return { row, isDefault: defaultChanged ? row.isDefault : undefined };
          })
          .sort((a, b) => order(b.row) - order(a.row));
        const inserts = [...changes.insertedRows, ...changes.updatedRows].filter(isNewWarehouseRow);

        let moved = 0;
        for (const { row, isDefault } of updates) {
          moved += await updateWarehouse(row.warehouseId as number, {
            name: row.name,
            warehouseType: row.warehouseType,
            remark: row.remark,
            isDefault,
            useYn: row.useYn === 'N' ? 'N' : 'Y',
          });
          sent += 1;
        }
        for (const row of inserts) {
          await createWarehouse({
            name: row.name,
            warehouseType: row.warehouseType,
            remark: row.remark,
            isDefault: row.isDefault,
            useYn: row.useYn === 'N' ? 'N' : 'Y',
          });
          sent += 1;
        }
        await loadRows();
        // 송연: 이름을 바꿔 원재료가 따라오면 그 수를 알려준다
        showSuccess(moved > 0 ? `저장했어요 — 원재료 ${moved}개도 같이 옮겼습니다` : '저장되었습니다');
      } catch (saveError) {
        // 앞에서 보낸 줄은 이미 반영됐으니 목록을 다시 맞춘다(보내기 전에 막힌 것이면 고치던 내용을 그대로 둔다)
        if (sent) await loadRows();
        setError(saveError instanceof Error ? saveError.message : '저장에 실패했어요');
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
