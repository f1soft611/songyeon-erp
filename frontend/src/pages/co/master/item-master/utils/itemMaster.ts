import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import type { ClientOption, ProductBomRow } from '../types/itemMaster.types';

// 거래처 팝업(2026-10-28, 제품마스터 · 제품등록): 칸에 보일 값. 목록에 없는(사용안함) 지금 값이면 fallbackName 에 '(사용안함)'
export function clientPickerValueOf(clients: ClientOption[], clientCode: string, fallbackName = ''): MasterPickerOption | null {
  if (!clientCode) return null;
  const listed = clients.find((client) => client.clientCode === clientCode);
  return { id: 0, code: clientCode, name: listed?.name ?? (fallbackName ? `${fallbackName} (사용안함)` : '') };
}

// 거래처 팝업 검색: 사용 중 거래처 목록에서 거래처코드 · 이름 일부로 찾는다(대소문자 무시)
export function clientPickerOptions(clients: ClientOption[], keyword: string): MasterPickerOption[] {
  const query = keyword.trim().toLowerCase();
  return clients
    .filter((client) => !query || client.clientCode.toLowerCase().includes(query) || client.name.toLowerCase().includes(query))
    .map((client, index) => ({ id: index + 1, code: client.clientCode, name: client.name }));
}

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
