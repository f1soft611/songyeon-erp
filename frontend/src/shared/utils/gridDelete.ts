import type { F1GridRef } from '../components/f1-grid';

// F1-Grid 는 Delete 키로 고른 줄을 바로 지운다. 오른쪽 클릭 [행 삭제] 설정(allowDeleteRowInContextMenu · deleteMenuDisabled)을 보지 않는다.
// F1-Grid 는 S_ERP 것을 그대로 쓰므로 화면에서 막는다: 삭제 권한이 없거나 지울 수 없는 줄이 섞였으면 표에서 지운 줄을 모두 되살린다.
// 되살린 줄을 돌려준다(막을 것이 없으면 빈 목록). onChangesChange 에서 부른다
export function restoreBlockedGridDeletes<T extends object>(
  grid: F1GridRef<T> | null,
  allowed: boolean,
  canDelete: (row: T) => boolean,
): T[] {
  const deleted = grid?.getChanges().deletedRows ?? [];
  if (deleted.length === 0 || (allowed && deleted.every(canDelete))) return [];
  grid?.restoreDeletedRows();
  return deleted;
}
