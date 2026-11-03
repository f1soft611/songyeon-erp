import { useRef, useState, type RefObject } from 'react';
import type { F1GridRef } from '../../../../../shared/components/f1-grid';
import { cancelReceiving } from '../services/receiving.service';
import type { DeleteKind, Receiving } from '../types/receiving.types';
import { errorText } from '../utils/receiving';

type DeleteSaveList = {
  gridRef: RefObject<F1GridRef<Receiving> | null>;
  setDirty: (dirty: boolean) => void;
  reload: () => Promise<void>;
};

// 2026-10-26 입고내역 · 반품내역 [삭제] · [저장]: 줄을 골라 [삭제](오른쪽 클릭 [행 삭제])로 표에서 빼고 [저장] 때 지운다.
// 2026-11-03 탭을 화면으로 나누며 입고등록 · 반품등록 화면이 같이 쓰도록 뺐다
export function useReceivingDeleteSave(
  kind: DeleteKind,
  list: DeleteSaveList,
  setAlertText: (text: string | null) => void,
  setNotice: (text: string) => void,
) {
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: DeleteKind; count: number } | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<(() => void) | null>(null);
  // 이번에 이미 지운 줄(저장 도중 오류가 나도 또 지우지 않게)
  const deletedIdsRef = useRef<Set<number>>(new Set());

  const removedRows = () =>
    (list.gridRef.current?.getChanges().deletedRows ?? []).filter((row) => !deletedIdsRef.current.has(row.id));
  const refreshDirty = () => list.setDirty(removedRows().length > 0);

  // 저장하지 않은 삭제가 있으면 먼저 묻고 한다([조회])
  const guard = (action: () => void) => {
    if (removedRows().length > 0) {
      setConfirmLeave(() => action);
      return;
    }
    action();
  };

  const removeSelected = () => {
    const grid = list.gridRef.current;
    if ((grid?.getSelectedRows() ?? []).length === 0) {
      setAlertText(kind === 'return' ? '지울 반품 줄을 먼저 골라주세요(줄을 누르면 골라집니다)' : '지울 입고 줄을 먼저 골라주세요(줄을 누르면 골라집니다)');
      return;
    }
    grid?.deleteSelectedRows();
  };

  const askSave = () => {
    const count = removedRows().length;
    if (count > 0) setConfirmDelete({ kind, count });
  };

  // 뺀 줄을 차례대로 지운다(서버 규칙은 예전 [취소] 와 같다). 거절되면 거기서 멈추고 알린 뒤 다시 조회한다
  const saveAll = async () => {
    const targets = removedRows();
    if (targets.length === 0) return;
    setSaving(true);
    try {
      for (const row of targets) {
        try {
          await cancelReceiving(row.id);
          deletedIdsRef.current.add(row.id);
        } catch (requestError) {
          setAlertText(errorText(requestError, '지우지 못했어요'));
          break;
        }
      }
      if (targets.every((row) => deletedIdsRef.current.has(row.id))) setNotice('저장되었습니다');
      await list.reload();
    } finally {
      setSaving(false);
    }
  };

  const confirmSave = () => {
    const target = confirmDelete;
    setConfirmDelete(null);
    if (target) void saveAll();
  };

  const continueLeave = () => {
    const action = confirmLeave;
    setConfirmLeave(null);
    action?.();
  };

  return {
    saving,
    confirmDelete,
    setConfirmDelete,
    confirmLeave,
    setConfirmLeave,
    refreshDirty,
    guard,
    removeSelected,
    askSave,
    confirmSave,
    continueLeave,
  };
}
