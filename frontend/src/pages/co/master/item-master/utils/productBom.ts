import type { BomEditRow, BomLine, MaterialOption, ProductBomRow } from '../types/itemMaster.types';
import { formatQty, percentText } from '../../../../../shared/utils/numberFormat';

// 송연 기초정보 제품BOM 화면 규칙(CM0001Tab05·CM0001Tab05Modal·BomRowsTable 에서 옮김). 2026-10-27 co/basic-info 에서 옮김

// 송연 recalcAmount: 적용단가 = 배합비율(%) / 100 × 원재료단가
export function appliedPrice(ratioPercent: number | null, unitPrice: number | null): string {
  if (ratioPercent === null || unitPrice === null) return '';
  return formatQty((ratioPercent / 100) * unitPrice);
}

// 송연 onNameChange: 등록된 원재료명과 정확히 같으면 그 단가를 채운다.
// 자동으로 채운 단가는 이름이 더는 맞지 않으면 비운다(손으로 넣은 단가는 그대로).
export function materialNamePatch(
  row: Pick<BomEditRow, 'autoPrice'>,
  name: string,
  materials: MaterialOption[],
): Partial<BomEditRow> {
  const match = materials.find((material) => material.name === name.trim());
  if (match && match.unitPrice != null) {
    return { materialName: name, unitPrice: match.unitPrice, autoPrice: true, materialCode: match.code };
  }
  const clearAuto = row.autoPrice ? { unitPrice: null, autoPrice: false } : {};
  return { materialName: name, materialCode: match ? match.code : null, ...clearAuto };
}

// 송연 diffBomSummary: 바뀌기 전·후를 견줘 추가·바뀜·삭제만 적는다
export type BomDiffLine = { kind: 'add' | 'change' | 'remove'; text: string };
export function diffBom(oldBom: BomLine[], newBom: BomLine[]): BomDiffLine[] {
  const round = (value: number | null | undefined) =>
    value == null ? null : Math.round(value * 10000) / 10000;
  const oldMap = new Map(oldBom.map((line) => [line.materialName || '', line.ratio]));
  const newMap = new Map(newBom.map((line) => [line.materialName || '', line.ratio]));
  const lines: BomDiffLine[] = [];
  newMap.forEach((ratio, name) => {
    if (!oldMap.has(name)) {
      lines.push({ kind: 'add', text: `+ 추가됨 — ${name} (${percentText(ratio)})` });
    } else if (round(oldMap.get(name)) !== round(ratio)) {
      lines.push({ kind: 'change', text: `${name} — ${percentText(oldMap.get(name))} → ${percentText(ratio)}` });
    }
  });
  oldMap.forEach((ratio, name) => {
    if (!newMap.has(name)) {
      lines.push({ kind: 'remove', text: `− 삭제됨 — ${name} (${percentText(ratio)})` });
    }
  });
  return lines;
}

// 송연 '안 만든 기간' 단추
export const STALE_PERIODS = [
  { months: 6, label: '6개월' },
  { months: 12, label: '1년' },
  { months: 18, label: '1년6개월' },
  { months: 24, label: '2년' },
] as const;

// 기준일: 오늘에서 N개월 전(이 날짜보다 오래된 것만 남긴다)
export function staleCutoff(months: number, today = new Date()): string {
  const date = new Date(today);
  date.setMonth(date.getMonth() - months);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 송연 renderPbomList: 제품명·제품코드 부분 일치 + '안 만든 기간'(생산이력이 없거나 기준일보다 오래된 것)
export function filterProductRows(
  rows: ProductBomRow[],
  search: string,
  staleMonths: number | null,
  today = new Date(),
): ProductBomRow[] {
  const query = search.trim().toLowerCase();
  let result = query
    ? rows.filter((row) => row.name.toLowerCase().includes(query) || row.code.includes(query))
    : rows;
  if (staleMonths) {
    const limit = staleCutoff(staleMonths, today);
    result = result.filter((row) => !row.lastProducedDate || row.lastProducedDate < limit);
  }
  return result;
}

// 송연 unknownClientMessage: 거래처BOM에 없는 이름을 칸을 떠날 때 알리는 문구
export function unknownClientMessage(typed: string, names: string[]): string {
  const near = names.find((name) => name.replace(/\s/g, '').includes(typed.replace(/\s/g, '')));
  return `'${typed}' 은 거래처BOM에 없는 거래처예요.${near ? `\n혹시 '${near}' 인가요?` : ''}`
    + '\n\n목록에서 골라주세요. 없는 곳이면 공통관리 > 기초정보 > 거래처BOM 에 먼저 등록해주세요.';
}

// 편집 그리드 빈 줄(송연은 빈 행 3개로 시작·전체 초기화)
export const INITIAL_BOM_ROWS = 3;
export const emptyBomEditRow = (id: string): BomEditRow => ({
  id,
  materialName: '',
  ratioPercent: null,
  unitPrice: null,
  autoPrice: false,
  materialCode: null,
});
