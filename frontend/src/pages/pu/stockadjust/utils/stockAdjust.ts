import type { ExcelColumn } from '../../../../shared/utils/excelFile';

// 구매관리 > 재고조정 (송연 18-stock.js 1-598 · 30-warehouse-move.js)
// 엑셀로 센 재고는 대기 목록에 쌓였다가, 반영일을 정해 확정할 때 실제 재고에 들어간다.
export type StockSchedule = {
  id: number;
  code: string;
  name?: string | null;
  newStockQty?: number | null;
  editedQty?: number | null;
  effectiveDate?: string | null;
  currentStockQty?: number | null;
  warehouse?: string | null;
  unitPrice?: number | null;
  targetQty?: number | null;
  diff?: number | null;
  oldStockQty?: number | null;
  note?: string | null;
};

export type MaterialStock = { code: string; name?: string | null; spec?: string | null; unitPrice?: number | null; stockQty?: number | null };

export type ProductMovement = {
  productCode: string;
  productName?: string | null;
  movedOn?: string | null;
  kind?: string | null;
  qty?: number | null;
  balanceAfter?: number | null;
  clientName?: string | null;
  note?: string | null;
  createdByName?: string | null;
};

export type WarehouseLookup = {
  materialCode: string;
  materialName: string;
  barcode?: string | null;
  lotDate?: string | null;
  unitWeight?: number | null;
  boxQty?: number | null;
  unit?: string | null;
  stockQty?: number | null;
  inMaterialWarehouse?: number | null;
  inWeighingWarehouse?: number | null;
};

export type WarehouseMove = {
  id: number;
  materialCode: string;
  materialName?: string | null;
  barcode?: string | null;
  fromWarehouse?: string | null;
  toWarehouse?: string | null;
  packCount?: number | null;
  unitWeight?: number | null;
  qty?: number | null;
  movedDate?: string | null;
  movedBy?: string | null;
};

export type UploadResult = { staged: number; skipped: number };
export type ConfirmResult = { confirmed: number; effectiveDate: string };

// 송연 fmt / fmtPrice
export const formatQty = (value: number | null | undefined) =>
  value == null || !Number.isFinite(Number(value)) ? '' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
export const formatMoney = (value: number | null | undefined) =>
  value == null || !Number.isFinite(Number(value)) ? '' : (Math.round(Number(value) * 10000) / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 4 });
// 창고이동은 소수 셋째 자리까지(송연 whmNum)
export const whmNum = (value: number | null | undefined) => Number(value || 0).toLocaleString('ko-KR', { maximumFractionDigits: 3 });

// 차이 표기: 늘면 +, 줄면 그대로(-), 모르면 빈칸
export const diffText = (diff: number | null | undefined) => (diff == null ? '' : diff > 0 ? `+${formatQty(diff)}` : formatQty(diff));
export const diffColor = (diff: number | null | undefined) => (diff == null || diff === 0 ? undefined : diff > 0 ? '#2563eb' : '#dc2626');

export const finalQty = (row: StockSchedule) => (row.editedQty != null ? row.editedQty : row.newStockQty);

// 창고별 합계(전산 = 지금 프로그램이 아는 재고, 실사 = 엑셀에 적힌 수량). 어느 창고에서 어긋났는지 알아야 찾으러 갈 곳이 정해진다.
// 순서는 기초정보 > 창고등록 순, 등록 안 된 이름은 그 뒤, 미지정은 맨 뒤. 없는 창고는 줄을 만들지 않는다.
export type WarehouseTotal = { label: string; count: number; current: number; target: number; diff: number; all?: boolean };
export function warehouseTotals(rows: StockSchedule[], registered: string[]): WarehouseTotal[] {
  if (rows.length === 0) return [];
  const groups = new Map<string, { count: number; current: number; target: number }>();
  rows.forEach((row) => {
    const key = row.warehouse || '미지정';
    const g = groups.get(key) ?? { count: 0, current: 0, target: 0 };
    g.count += 1;
    g.current += row.currentStockQty || 0;
    g.target += finalQty(row) || 0;
    groups.set(key, g);
  });
  const order = [...registered, ...[...groups.keys()].filter((k) => k !== '미지정' && !registered.includes(k)), '미지정'].filter((k, i, all) => groups.has(k) && all.indexOf(k) === i);
  const lines = order.map((k) => {
    const g = groups.get(k)!;
    return { label: k === '미지정' ? '창고 미지정 합계' : `${k} 합계`, ...g, diff: g.target - g.current };
  });
  const sum = lines.reduce((a, l) => ({ count: a.count + l.count, current: a.current + l.current, target: a.target + l.target }), { count: 0, current: 0, target: 0 });
  return [...lines, { label: '전체 합계', ...sum, diff: sum.target - sum.current, all: true }];
}

// 적용된 재고조정 내역: 반영일로 묶는다(최근 날짜 위). 사유는 묶음마다 하나지만 같은 날 여러 번 확정했으면 여럿.
export type HistoryNode = {
  id: string;
  parentId: string | null;
  kind: 'group' | 'item';
  label: string;
  count?: number;
  notes?: string;
  oldQty?: number | null;
  newQty?: number | null;
  diff?: number | null;
};
export function historyTree(rows: StockSchedule[]): HistoryNode[] {
  const byDate = new Map<string, StockSchedule[]>();
  rows.forEach((row) => {
    const d = row.effectiveDate || '';
    byDate.set(d, [...(byDate.get(d) ?? []), row]);
  });
  return [...byDate.keys()].sort().reverse().flatMap((d) => {
    const items = byDate.get(d) ?? [];
    const notes = [...new Set(items.map((r) => r.note).filter(Boolean))] as string[];
    const group: HistoryNode = { id: `g:${d}`, parentId: null, kind: 'group', label: d, count: items.length, notes: notes.join(' · ') };
    return [group, ...items.map((r, i) => ({
      id: `i:${d}:${i}`, parentId: group.id, kind: 'item' as const, label: `${r.name || ''} (${r.code})`,
      oldQty: r.oldStockQty, newQty: r.newStockQty, diff: r.diff,
    }))];
  });
}

// 제품 입출고 종류: 들어온 것(파랑)과 나간 것(빨강)을 색으로 가른다
export const PRODUCT_KINDS = ['생산입고', '출하', '재고조정', '생산정정', '입고취소', '출하정정', '생산취소', '출하취소'];
const KIND_COLOR: Record<string, 'success' | 'error' | 'default'> = {
  생산입고: 'success', 생산정정: 'success', 출하취소: 'success', 출하: 'error', 생산취소: 'error', 출하정정: 'error', 재고조정: 'default',
};
export const kindColor = (kind?: string | null) => KIND_COLOR[kind || ''] ?? 'default';

// 품목명은 서버에 보내지 않고 화면에서 거른다(원장은 한 번에 받는다)
export const filterByProduct = (rows: ProductMovement[], query: string) => {
  const q = query.trim().toLowerCase();
  return q ? rows.filter((r) => (r.productName || '').toLowerCase().includes(q)) : rows;
};

// 엑셀 첫 장 → 보낼 줄(칸은 글자로). 숫자는 그대로 글자로 바꾼다
export const toUploadRows = (values: unknown[][]) =>
  values.map((row) => row.map((cell) => (cell == null ? '' : cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell))));

// ===== 문구(송연과 같음) =====
export const materialUploadMessage = (warehouse: string, result: UploadResult) =>
  `${warehouse ? `${warehouse} ` : ''}${result.staged}건 올렸어요 (건너뜀 ${result.skipped}건) — 반영일과 사유를 적고 확정을 눌러주세요`;
export const productUploadMessage = (result: UploadResult) =>
  `대기목록에 ${result.staged}건 등록됨 (건너뜀 ${result.skipped}건) — 반영일을 지정하고 확정을 눌러주세요`;
export const confirmQuestion = (date: string, note?: string) =>
  `대기 중인 재고조정을 전부 ${date} 기준으로 확정할까요?${note ? `\n사유: ${note}` : ''}`;
export const confirmedMessage = (result: ConfirmResult) => `${result.confirmed}건이 ${result.effectiveDate} 기준으로 재고에 반영됐어요`;
export const CANCEL_ALL_QUESTION = '대기 중인 재고조정 내역을 전부 취소할까요? 엑셀을 잘못 올렸을 때 사용해요. (이미 확정 반영된 건은 취소되지 않아요)';
export const NOTE_REQUIRED = '조정 사유를 적어주세요.\n예: 9월 정기 재고조사';
export const DATE_REQUIRED = '반영일을 먼저 선택해주세요';

// 창고이동: 찍은 것을 옮겼을 때 안내
export const movedMessage = (found: WarehouseLookup, packs: number, qty: number, to: string) =>
  `${found.materialName} ${packs}봉 (${whmNum(qty)}${found.unit || 'kg'}) 을 ${to}로 옮겼어요`;

// ===== 엑셀(송연과 같은 칸) =====
export const MATERIAL_HISTORY_EXCEL_COLUMNS: ExcelColumn<StockSchedule>[] = [
  { key: 'effectiveDate', label: '반영일', width: 12 },
  { key: 'name', label: '원재료명', width: 26 },
  { key: 'code', label: '원재료코드', width: 12 },
  { key: 'oldStockQty', label: '이전재고', width: 12 },
  { key: 'newStockQty', label: '이후재고', width: 12 },
  { key: 'diff', label: '차이', width: 10 },
  { key: 'note', label: '사유', width: 24 },
];

export const PRODUCT_HISTORY_EXCEL_COLUMNS: ExcelColumn<ProductMovement>[] = [
  { key: 'movedOn', label: '날짜', width: 12 },
  { key: 'productName', label: '품목명', width: 28 },
  { key: 'productCode', label: '제품코드', width: 12 },
  { key: 'kind', label: '종류', width: 10 },
  { key: 'qty', label: '수량', width: 10 },
  { key: 'balanceAfter', label: '이후재고', width: 12 },
  { key: 'clientName', label: '거래처', width: 18 },
  { key: 'note', label: '비고', width: 24 },
  { key: 'createdByName', label: '처리자', width: 10 },
];
