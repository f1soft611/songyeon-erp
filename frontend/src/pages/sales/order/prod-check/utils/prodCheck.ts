import type { ExcelColumn } from '../../../../shared/utils/excelFile';
import { formatQty } from '../../../../shared/utils/numberFormat';

// 영업관리 > 생산가능확인 (송연 SA0006, 기존 34-prod-check.js). 조회만 한다.

// 만들 것 한 줄(수량은 적는 칸의 값 그대로)
export type FeasibilityLine = { product: string; qty: number | string | null };

// 원재료 한 줄. per 는 합계 표에서만 제품마다의 필요량(lines 순서)
export type FeasibilityRow = {
  code: string;
  name: string | null;
  spec: string | null;
  known: boolean;
  needQty: number;
  stockQty: number;
  afterQty: number;
  shortage: number;
  per?: number[] | null;
};

export type FeasibilityByProduct = { product: string; qty: number; rows: FeasibilityRow[]; shortageCount: number; ok: boolean };

export type FeasibilityResult = {
  date: string;
  lines: { product: string; qtyKg: number }[];
  rows: FeasibilityRow[];
  byProduct: FeasibilityByProduct[];
  unknownProducts: string[];
  shortageCount: number;
  ok: boolean;
};

// 표에 보이는 한 줄(제품마다 필요량은 per0, per1 … 칸으로 펼친다 — 머리글로 정렬할 수 있게)
export type FeasibilityGridRow = FeasibilityRow & { id: string; [perKey: `per${number}`]: number };

export const qtyText = (value: number | null | undefined) => formatQty(value == null ? 0 : value);
const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);

export const toGridRows = (rows: FeasibilityRow[]): FeasibilityGridRow[] =>
  rows.map((row, index) => {
    const grid: FeasibilityGridRow = { ...row, id: `${row.code}-${index}` };
    (row.per ?? []).forEach((value, i) => {
      grid[`per${i}`] = value || 0;
    });
    return grid;
  });

// 송연: 수량이 비었거나 0 이하인 줄
export const emptyQtyLines = (lines: FeasibilityLine[]) => lines.filter((line) => !(parseFloat(String(line.qty ?? '')) > 0));

// 이미 줄에 있는 제품은 다시 넣지 않는다(같은 제품이 두 줄이면 어느 수량이 맞는지 모른다)
export const addLines = (current: FeasibilityLine[], picked: string[]): FeasibilityLine[] =>
  [...current, ...picked.filter((product) => !current.some((line) => line.product === product)).map((product) => ({ product, qty: null }))];

export type Verdict = { tone: 'warning' | 'success' | 'error'; text: string };

export function verdictOf(data: FeasibilityResult | null): Verdict | null {
  if (!data) return null;
  if (data.unknownProducts.length > 0) return { tone: 'warning', text: `BOM 을 못 찾은 제품이 있어요 — ${data.unknownProducts.join(', ')}` };
  if (data.ok) return { tone: 'success', text: `생산할 수 있어요. 원재료 ${data.rows.length}가지가 모두 넉넉합니다` };
  return { tone: 'error', text: `원재료 ${data.shortageCount}가지가 모자랍니다 (전체 ${data.rows.length}가지)` };
}

export function conditionText(data: FeasibilityResult | null, lineCount: number): string {
  if (data) {
    return `${data.date} · 제품 ${data.lines.length}개 · 모두 ${qtyText(sum(data.lines.map((line) => line.qtyKg || 0)))}kg`;
  }
  return lineCount ? '수량을 적고 확인을 눌러주세요' : '검색 을 눌러 생산일자와 제품을 골라주세요';
}

// 표 아래 합계: 필요량(제품별·합계)만 더한다(재고·생산 후 재고는 서로 다른 원재료라 더하지 않는다)
export function footerOf(rows: FeasibilityRow[], perCount: number) {
  return {
    count: rows.length,
    per: Array.from({ length: perCount }, (_, i) => sum(rows.map((row) => (row.per ?? [])[i] || 0))),
    need: sum(rows.map((row) => row.needQty)),
    shortage: sum(rows.map((row) => row.shortage)),
  };
}

// 송연 pchk-excel-btn: 합계 표를 화면에 보이는 칸 그대로(제품별 필요량 칸 포함)
export function excelColumnsOf(data: FeasibilityResult): ExcelColumn<FeasibilityRow>[] {
  const many = data.lines.length > 1;
  return [
    { key: 'name', label: '원재료명', width: 26 },
    { key: 'spec', label: '규격', width: 12 },
    { key: 'stockQty', label: `${data.date} 재고`, width: 14 },
    ...(many ? data.lines.map((line, i) => ({ key: (row: FeasibilityRow) => (row.per ?? [])[i] || 0, label: `필요량${i + 1} ${line.product}`, width: 16 })) : []),
    { key: 'needQty', label: many ? '필요량 합계' : '필요량', width: 12 },
    { key: 'afterQty', label: '생산 후 재고', width: 12 },
    { key: 'shortage', label: '부족량', width: 10 },
  ];
}
