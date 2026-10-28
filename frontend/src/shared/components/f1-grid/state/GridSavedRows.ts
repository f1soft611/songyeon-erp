import type { F1GridSavedRow } from '../types/grid.types';
import { getGridRowId } from '../utils/grid.utils';

export class GridSaveReconciliationError extends Error {
  constructor(cause: unknown) {
    super('저장은 완료했지만 화면 반영에 실패했습니다. 조회를 다시 실행해 주세요.', { cause });
    this.name = 'GridSaveReconciliationError';
  }
}

export function resolveSavedGridRows<T extends object>(
  requested: T[],
  saved: T[],
  mappings: unknown,
  rowKey: keyof T,
): F1GridSavedRow<T>[] {
  const invalid = () => new Error('저장 응답의 행 ID 매핑을 확인할 수 없습니다.');
  if (!mappings || typeof mappings !== 'object' || Array.isArray(mappings)) throw invalid();
  const entries = Object.entries(mappings);
  const ids = new Map(entries);
  const savedById = new Map(saved.map((row) => [String(getGridRowId(row, rowKey)), row]));
  if (entries.length !== requested.length || saved.length !== requested.length || savedById.size !== saved.length) {
    throw invalid();
  }
  const sourceIds = new Set<string>();
  const targetIds = new Set<string>();
  return requested.map((row) => {
    const previousRowId = getGridRowId(row, rowKey);
    const sourceId = String(previousRowId);
    const targetId: unknown = ids.get(sourceId);
    if (typeof targetId !== 'number' || !Number.isSafeInteger(targetId) || targetId <= 0 ||
        sourceIds.has(sourceId) || targetIds.has(String(targetId))) throw invalid();
    const canonical = savedById.get(String(targetId));
    if (!canonical) throw invalid();
    sourceIds.add(sourceId);
    targetIds.add(String(targetId));
    return { previousRowId, row: canonical };
  });
}
