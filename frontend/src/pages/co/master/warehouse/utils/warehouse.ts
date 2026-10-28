import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import type { ExcelColumn } from '../../../../../shared/utils/excelFile';
import { WAREHOUSE_TYPES, type WarehouseRow, type WarehouseUseFilter } from '../types/warehouse.types';

export const NEW_WAREHOUSE_ROW_PREFIX = 'new-warehouse-';

export const LAST_RECEIVING_MESSAGE =
  '입고가 들어오는 창고는 한 곳은 있어야 해요. 다른 창고를 먼저 지정해주세요';

export const isNewWarehouseRow = (row: WarehouseRow): boolean =>
  !row.id || String(row.id).startsWith(NEW_WAREHOUSE_ROW_PREFIX);

// 조회 조건: 창고명(포함) + 상태(코드 칸은 2026-10-22 뺐다). 서버에서 다 받아 화면에서 거른다
export function filterWarehouseRows(rows: WarehouseRow[], search: string, useFilter: WarehouseUseFilter): WarehouseRow[] {
  const query = search.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (useFilter === 'ALL' || row.useYn === useFilter) &&
      (!query || row.name.toLowerCase().includes(query)),
  );
}

// 엑셀 다운로드 칸(그리드와 같은 차례)
export const WAREHOUSE_EXCEL_COLUMNS: ExcelColumn<WarehouseRow>[] = [
  { key: 'name', label: '창고명', width: 24 },
  { key: (row) => (row.isDefault ? 'Y' : ''), label: '기본창고', width: 10 },
  { key: 'remark', label: '설명', width: 30 },
  { key: 'materialCount', label: '두고 있는 원재료', width: 14 },
  { key: (row) => (row.useYn === 'N' ? '사용안함' : '사용중'), label: '상태', width: 10 },
  { key: 'regUserNm', label: '등록자', width: 12 },
  { key: 'regDt', label: '등록일시', width: 20 },
  { key: 'updUserNm', label: '수정자', width: 12 },
  { key: 'updDt', label: '수정일시', width: 20 },
];

// 기본창고는 전체에서 한 곳이고 그곳이 입고창고다(2026-10-19 사용자 결정).
// 어떤 줄을 기본창고로 켜면 원래 켜져 있던 줄은 화면에서 바로 끈다. 끌 줄의 id 를 돌려준다.
// previous: 직전에 본 줄별 기본창고 상태
export function defaultRowsToClear(
  previous: Map<string, boolean>,
  activeRows: WarehouseRow[],
): string[] {
  const turnedOn = activeRows.find((row) => row.isDefault && !previous.get(row.id));
  if (!turnedOn) return [];
  return activeRows
    .filter((row) => row.id !== turnedOn.id && row.isDefault)
    .map((row) => row.id);
}

// 저장 전 확인(송연 문구). 문제가 없으면 null.
export function validateWarehouseChanges(
  originalRows: WarehouseRow[],
  activeRows: WarehouseRow[],
  changes: F1GridChanges<WarehouseRow>,
): string | null {
  for (const row of [...changes.insertedRows, ...changes.updatedRows]) {
    if (!row.name.trim()) return '창고 이름을 입력해주세요';
    if (!(WAREHOUSE_TYPES as readonly string[]).includes(row.warehouseType)) {
      return `${row.name.trim()}: 창고유형을 골라주세요`;
    }
  }
  const names = new Set<string>();
  for (const row of activeRows) {
    const name = row.name.trim();
    if (!name) continue;
    if (names.has(name)) return `${name}: 같은 이름의 창고가 있어요`;
    names.add(name);
  }
  if (activeRows.filter((row) => row.isDefault).length > 1) {
    return '기본창고는 한 곳만 정할 수 있어요';
  }
  // 입고창고(기본창고)는 저장된 창고 가운데 한 곳은 남아 있어야 한다(서버는 수정을 먼저 처리한다)
  const hadReceiving = originalRows.some((row) => row.isDefault);
  // 상태를 끈(사용안함) 기본창고는 입고창고가 아니다(2026-10-22 상태 체크박스)
  const savedReceiving = activeRows.filter(
    (row) => row.isDefault && row.useYn !== 'N' && !isNewWarehouseRow(row),
  );
  if (hadReceiving && savedReceiving.length === 0) return LAST_RECEIVING_MESSAGE;
  return null;
}
