import type { F1GridColumn } from '../components/f1-grid';
import type { MenuPermission } from '../../pages/dashboard/types/dashboard';

// 메뉴관리 '기본기능' 4칸(읽기 · 쓰기 · 삭제 · 엑셀)으로 본 화면 권한(2026-10-21)
// - 읽기 = READ, 쓰기 = CREATE 또는 UPDATE, 삭제 = DELETE, 엑셀 = EXCEL
export type ScreenPermissions = {
  read: boolean;
  write: boolean;
  delete: boolean;
  excel: boolean;
};

export const screenPermissionsOf = (permission?: MenuPermission): ScreenPermissions => ({
  read: Boolean(permission?.read),
  write: Boolean(permission?.create || permission?.update),
  delete: Boolean(permission?.delete),
  excel: Boolean(permission?.excel),
});

// 쓰기 권한이 없으면 모든 칸을 고칠 수 없게 한다(체크 칸 포함 — 체크 칸은 editable 을 비워 두면 고칠 수 있는 칸이 된다).
// 그리드(F1-Grid)는 고치지 않고 칸 정의만 바꾼다
// 같은 칸 정의에는 같은 배열을 돌려준다(렌더마다 새 배열이 그리드로 가지 않게)
const readOnlyCache = new WeakMap<object, unknown>();

export function readOnlyColumns<T extends object>(columns: F1GridColumn<T>[], canWrite: boolean): F1GridColumn<T>[] {
  if (canWrite) return columns;
  const cached = readOnlyCache.get(columns) as F1GridColumn<T>[] | undefined;
  if (cached) return cached;
  const next = columns.map((column) => (column.type === 'rownumber' ? column : { ...column, editable: false }));
  readOnlyCache.set(columns, next);
  return next;
}
