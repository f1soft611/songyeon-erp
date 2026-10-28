import type { ProductBomRow } from '../types/itemMaster.types';

// 제품마스터 그리드 줄: 제품BOM 줄 + 사용여부 체크박스 값(2026-10-23, 창고등록 · 포장유형과 같은 Y/N)
// detailAction · historyAction: 표의 [상세] · [이력] 단추 칸 자리(값 없음, 2026-10-27)
export type ItemMasterRow = ProductBomRow & { useYn: 'Y' | 'N'; detailAction?: never; historyAction?: never };

// 조회 조건 사용여부(2026-10-23, 포장유형 · 창고등록 · 거래처마스터와 같은 전체 · 사용중 · 사용안함)
export type ItemMasterUseFilter = 'ALL' | 'Y' | 'N';

export const filterItemMasterByUse = (rows: ItemMasterRow[], useFilter: ItemMasterUseFilter): ItemMasterRow[] =>
  useFilter === 'ALL' ? rows : rows.filter((row) => row.useYn === useFilter);

export const toItemMasterRows = (rows: ProductBomRow[]): ItemMasterRow[] =>
  rows.map((row) => ({ ...row, useYn: row.discontinued ? 'N' : 'Y' }));

// [저장] 때 보낼 것: 처음 불러온 값과 사용여부가 달라진 줄만(바꿨다가 되돌린 줄은 보내지 않는다)
export function discontinueChangesOf(
  originals: ItemMasterRow[],
  updatedRows: ItemMasterRow[],
): { code: string; discontinued: boolean }[] {
  const before = new Map(originals.map((row) => [row.id, row.useYn]));
  return updatedRows
    .filter((row) => before.has(row.id) && before.get(row.id) !== row.useYn)
    .map((row) => ({ code: row.code, discontinued: row.useYn === 'N' }));
}
