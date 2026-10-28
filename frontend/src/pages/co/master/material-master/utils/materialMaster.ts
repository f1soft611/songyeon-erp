import type { ExcelColumn } from '../../../../../shared/utils/excelFile';
import type { MaterialInfoSaved, MaterialPriceSaved, MaterialRow } from '../types/materialMaster.types';

// 송연 기초정보 원재료BOM·부자재BOM 화면 규칙(CM0001Tab08·09 와 그 창들에서 옮김). 2026-10-27 co/basic-info 에서 옮김. 거래처별 제품조회 규칙은 partner-item/hooks/usePartnerItemManagement.ts

// ===== 원재료BOM =====
// 조회 조건 사용여부(2026-10-23, 포장유형 · 창고등록 · 거래처마스터와 같은 전체 · 사용중 · 사용안함)
export type MaterialUseFilter = 'ALL' | 'Y' | 'N';
export const filterMaterialUse = (rows: MaterialRow[], useFilter: MaterialUseFilter): MaterialRow[] =>
  useFilter === 'ALL' ? rows : rows.filter((row) => row.useYn === useFilter);

export type StaleUnit = 'day' | 'month' | 'year';
export const STALE_UNITS: { value: StaleUnit; label: string }[] = [
  { value: 'day', label: '일' },
  { value: 'month', label: '월' },
  { value: 'year', label: '년' },
];

// 오늘에서 그만큼 거슬러 올라간 날짜(YYYY-MM-DD)
export function materialStaleCutoff(value: number, unit: StaleUnit, today = new Date()): string {
  const cutoff = new Date(today);
  if (unit === 'day') cutoff.setDate(cutoff.getDate() - value);
  else if (unit === 'year') cutoff.setFullYear(cutoff.getFullYear() - value);
  else cutoff.setMonth(cutoff.getMonth() - value);
  return `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
}

// 송연 renderMaterialTab: 부자재는 빼고, 걸어둔 '안 쓴 기간' 으로 한 번 더 거른다(한 번도 안 쓴 것도 들어간다)
export function filterMaterialRows(
  rows: MaterialRow[],
  stale: { value: number; unit: StaleUnit } | null,
  today = new Date(),
): MaterialRow[] {
  let shown = rows.filter((row) => !row.subCategory);
  if (stale) {
    const cutoff = materialStaleCutoff(stale.value, stale.unit, today);
    shown = shown.filter((row) => !row.lastUsedDate || row.lastUsedDate < cutoff);
  }
  return shown;
}

// 안전재고보다 적으면 '부족', 0 보다 적으면 마이너스
export const isLowStock = (row: Pick<MaterialRow, 'safetyStock' | 'stockQty'>): boolean =>
  row.safetyStock != null && row.stockQty != null && row.stockQty < row.safetyStock;
export const isMinusStock = (row: Pick<MaterialRow, 'stockQty'>): boolean =>
  row.stockQty != null && row.stockQty < 0;

// 납품업체 이름 목록
// (materials.supplier 는 업체코드 배열 '[3,5]' 이라 그대로 보여주지 않는다 — 옛 업체명은 서버가 suppliers 에 넣어 준다)
export const vendorListOf = (row: Pick<MaterialRow, 'suppliers'>): string[] =>
  row.suppliers.map((vendor) => vendor.name);

// 표에 보일 납품업체: 한 곳이면 이름, 여러 곳이면 '첫 곳 외 N'
export function vendorText(row: Pick<MaterialRow, 'suppliers'>): string {
  const vendors = vendorListOf(row);
  if (vendors.length === 0) return '';
  if (vendors.length === 1) return vendors[0];
  return `${vendors[0]} 외 ${vendors.length - 1}`;
}

const excelVendors = (row: MaterialRow) => vendorListOf(row).join(', ');

// 송연 원재료BOM 엑셀 칸
export const MATERIAL_EXCEL_COLUMNS: ExcelColumn<MaterialRow>[] = [
  { key: 'code', label: '원재료코드' },
  { key: 'name', label: '원재료명' },
  { key: 'spec', label: '규격' },
  { key: excelVendors, label: '납품업체' },
  { key: (row) => row.unitNm || row.unit, label: '단위' },
  { key: 'unitWeight', label: '단위중량(한 봉 kg)' },
  { key: 'boxQty', label: '박스입수량(몇 봉)' },
  { key: 'unitPrice', label: '단가(원)' },
  { key: 'stockQty', label: '재고' },
  { key: 'safetyStock', label: '안전재고' },
  { key: 'baseOrderQty', label: '기초발주량' },
  { key: 'allergens', label: '알러지유발물질' },
  { key: 'lastUsedDate', label: '마지막사용일' },
];

// 송연 부자재BOM 엑셀 칸
export const SUB_MATERIAL_EXCEL_COLUMNS: ExcelColumn<MaterialRow>[] = [
  { key: 'code', label: '코드' },
  { key: 'name', label: '부자재명' },
  { key: 'spec', label: '규격' },
  { key: (row) => row.subCategoryNm || row.subCategory, label: '분류' },
  { key: (row) => row.unitNm || row.unit, label: '단위' },
  { key: excelVendors, label: '납품업체' },
  { key: 'unitPrice', label: '단가(원)' },
  { key: 'stockQty', label: '재고' },
  { key: 'safetyStock', label: '안전재고' },
  { key: 'usedByCount', label: '쓰는 제품 수' },
];

// ===== 저장 안내 =====
// 이름을 바꿨을 때 알릴 것. 레시피를 손대지 않았으면 알림 창(alert), 아니면 저장 문구 뒤에 붙인다.
export function renameNotice(
  saved: MaterialInfoSaved,
  newName: string,
): { alert?: string; suffix?: string } {
  if (!saved.renamedFrom) return {};
  const parts: string[] = [];
  if (saved.cascadedBom) parts.push(`제품BOM ${saved.cascadedBom}줄`);
  if (saved.cascadedRecipeVersion) parts.push(`레시피 ${saved.cascadedRecipeVersion}줄`);
  if (saved.cascadedRecipeSkipped) {
    return {
      alert: `이름을 '${saved.renamedFrom}' 에서 '${newName}' 으로 바꿨어요.\n\n`
        + (parts.length ? `${parts.join(' · ')} 도 같이 바뀌었습니다.\n\n` : '')
        + '다만 레시피·상품개발은 그대로 두었습니다.\n'
        + `'${saved.renamedFrom}' 이라는 이름을 쓰는 원재료가 ${saved.cascadedRecipeSkipped}개 더 있어서,\n`
        + '이름만 보고 바꾸면 그쪽 배합표까지 같이 바뀝니다.\n'
        + '레시피는 직접 확인하고 고쳐주세요.',
    };
  }
  return parts.length ? { suffix: ` — ${parts.join(' · ')} 도 같이 바뀌었어요` } : {};
}

// 송연 단가 저장 문구
export function priceSavedText(saved: MaterialPriceSaved): string {
  return saved.scheduled
    ? `${saved.effectiveDate}부터 적용되도록 예약되었습니다`
    : `저장되었습니다${saved.affectedProducts ? ` (이 원재료를 쓰는 제품 ${saved.affectedProducts}건의 단가도 자동 반영됨)` : ''}`;
}

// 송연 부자재 분류
// 부자재 분류 항목은 2026-10-23 부터 공통코드 SUB_MATERIAL_CATEGORY 에서 받는다(hooks/useSubMaterialCategories)

// ===== 일괄적용 =====
// 송연 findReplaceTarget: 대체할 원재료를 이름 또는 코드로 찾는다.
// 이름이 같은데 코드가 다른 원재료가 실제로 있어(계피분말 같은 것) 코드로도 찾고, 이름이 겹치면 코드를 물어본다.
export function findReplaceTarget(
  input: string,
  pool: Pick<MaterialRow, 'code' | 'name'>[],
): { material?: Pick<MaterialRow, 'code' | 'name'>; error?: string } {
  const value = (input || '').trim();
  if (!value) return { error: '대체할 원재료를 적어주세요' };
  const byCode = pool.find((m) => String(m.code) === value);
  if (byCode) return { material: byCode };
  // '계피분말 (002797)' 처럼 목록에서 긁어 붙여넣는 경우
  const paren = value.match(/\(([^()]+)\)\s*$/);
  if (paren) {
    const hit = pool.find((m) => String(m.code) === paren[1].trim());
    if (hit) return { material: hit };
  }
  const byName = pool.filter((m) => m.name === value);
  if (byName.length === 1) return { material: byName[0] };
  if (byName.length > 1) {
    return {
      error: `'${value}' 이라는 원재료가 ${byName.length}개예요 (${byName.map((m) => m.code).join(', ')}). `
        + '어느 것인지 원재료코드로 적어주세요.',
    };
  }
  return { error: '대체할 원재료명이나 원재료코드를 정확히 적어주세요' };
}

// ===== 같은 원재료 확인 =====
// 이름·규격 비교: 띄어쓰기 없애고 소문자(서버와 같은 규칙)
export const sameKey = (value: string | null | undefined): string => (value ?? '').replace(/\s/g, '').toLowerCase();

// 이름이나 규격이 바뀌었을 때만(또는 신규일 때) 같은 원재료를 확인한다
export const needsSameMaterialCheck = (
  isNew: boolean,
  saved: { name: string; spec: string },
  next: { name: string; spec: string },
): boolean => isNew || sameKey(saved.name) !== sameKey(next.name) || sameKey(saved.spec) !== sameKey(next.spec);

export function sameMaterialMessage(same: { code: string; name: string; spec: string }[]): string {
  return '같은 이름·규격의 원재료가 이미 있어요.\n\n'
    + same.map((m) => `· ${m.name}${m.spec ? ` ${m.spec}` : ''} (${m.code})`).join('\n')
    + '\n\n그래도 저장할까요?';
}
