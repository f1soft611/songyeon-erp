import type { ExcelColumn } from '../../../../shared/utils/excelFile';

// 구매관리 > 수불대장 (송연 app.py /api/purchase-stock-range · 18-stock.js loadPurchaseStock~submitLedgerOrders)
// 전일재고 · 날짜별 생산 사용량 · 발주량 · 입고 · 남은재고. 남은재고 = 전일재고 − 사용량 + 입고량(+재고조사).
export type WarehouseQty = { name: string; qty?: number | null };

export type LedgerRow = {
  code: string;
  name?: string | null;
  spec?: string | null;
  stockQty?: number | null;
  usageByDate?: Record<string, number>;
  receivingByDate?: Record<string, number>;
  orderByDate?: Record<string, number>;
  totalUsage?: number | null;
  totalReceiving?: number | null;
  totalAdjust?: number | null;
  adjustNote?: string | null;
  baseStock?: number | null;
  remainingStock?: number | null;
  warehouseStock?: WarehouseQty[];
  safetyStock?: number | null;
  baseOrderQty?: number | null;
  suggestedOrderQty?: number | null;
  belowSafety?: boolean;
  warehouse?: string | null;
  subCategory?: string | null;
  unit?: string | null; // 단위 코드(공통코드 UNIT, 2026-10-23)
  unitNm?: string | null; // 단위 이름(예: KG)
  suppliers?: string[];
};

export type StockAsOfRow = { code: string; name?: string | null; spec?: string | null; subCategory?: string | null; subCategoryNm?: string | null; stockQty?: number | null; unitPrice?: number | null; amount?: number | null };
export type StockAsOf = { date: string; materials: StockAsOfRow[]; totalAmount: number; warehouses?: string[] };

export type LedgerKind = 'material' | 'submaterial';
export type LedgerFilter = 'used' | 'nonzero' | 'all';

// 송연 fmt / fmtPrice
export const formatQty = (value: number | null | undefined) =>
  value == null || !Number.isFinite(Number(value)) ? '' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
export const formatMoney = (value: number | null | undefined) =>
  value == null || !Number.isFinite(Number(value)) ? '' : (Math.round(Number(value) * 10000) / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 4 });

// 수불대장 숫자: 0 을 빈칸으로(빈 칸이 수백 개라 덜 시끄럽게). 둘째 자리에서 0 으로 보이는 작은 값은 자리를 늘려 적는다(송연 fmtDash)
export function ledgerNum(value: number | null | undefined) {
  if (value == null) return '';
  const v = Number(value);
  if (Number.isNaN(v) || v === 0) return '';
  const shown = v.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  if (Number(shown.replace(/,/g, '')) === 0) return String(Math.round(v * 10000) / 10000);
  return shown;
}

// 창고를 갈라 보는 칸에서는 '-' 가 '모름' 으로 읽혀서 0 을 0 이라고 적는다
export const whQtyText = (value: number | null | undefined) => (Number(value || 0) ? ledgerNum(Number(value)) : '0');

// 시작~끝 날짜 목록(안전장치: 최대 62일)
export function dateRangeList(start: string, end: string): string[] {
  const list: string[] = [];
  const cur = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cur <= last && list.length < 62) {
    list.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`);
    cur.setDate(cur.getDate() + 1);
  }
  return list;
}

export const dayLabel = (date: string) => date.slice(5).replace('-', '/');

// 탭·검색·보기로 거른다(원재료 = 분류 없음, 부자재 = 분류 있음). 고른 정렬이 없을 때는 이름순(가나다)
export function filterRows(rows: LedgerRow[], kind: LedgerKind, query: string, mode: LedgerFilter): LedgerRow[] {
  const q = query.trim().toLowerCase();
  let out = rows.filter((m) => (kind === 'submaterial' ? Boolean(m.subCategory) : !m.subCategory));
  if (q) out = out.filter((m) => (m.name || '').toLowerCase().includes(q) || (m.code || '').includes(q));
  if (mode === 'used') out = out.filter((m) => (m.totalUsage || 0) > 0);
  else if (mode === 'nonzero') out = out.filter((m) => Number(m.remainingStock || 0) !== 0);
  return [...out].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
}

export function emptyText(kind: LedgerKind, mode: LedgerFilter) {
  const what = kind === 'submaterial' ? '부자재' : '원재료';
  if (mode === 'used') return `생산스케줄에서 사용된 ${what}가 없습니다`;
  if (mode === 'nonzero') return `남은재고가 있는 ${what}가 없습니다`;
  return `${what}가 없습니다`;
}

// ===== 발주량 칸 → 발주 등록 =====
export const draftKey = (code: string, date: string) => `${code}|${date}`;

// 칸에 보일 값: 적어둔 값 → 없으면 첫 날짜 칸에만 기초발주량(안전재고 부족). 미리 채운 값은 적어둔 것이 아니다(송연과 같이 손대야 발주로 잡힌다)
export function orderCellValue(row: LedgerRow, date: string, dateIndex: number, drafts: Record<string, string>) {
  const draft = drafts[draftKey(row.code, date)];
  if (draft !== undefined) return draft;
  return dateIndex === 0 && row.suggestedOrderQty ? String(row.suggestedOrderQty) : '';
}

export type DraftItem = { materialCode: string; materialName: string; orderDate: string; qty: number; suppliers: string[]; clientName?: string };

export function draftItems(drafts: Record<string, string>, rows: LedgerRow[]): DraftItem[] {
  return Object.entries(drafts).map(([key, raw]) => {
    const [code, date] = key.split('|');
    const m = rows.find((x) => x.code === code);
    return { materialCode: code, materialName: m?.name || code, orderDate: date, qty: parseFloat(raw), suppliers: m?.suppliers || [] };
  }).filter((it) => it.qty > 0);
}

// 납품업체가 한 곳뿐이면 그대로 쓰고, 여러 곳이거나 없으면 물어본다
export function splitBySupplier(items: DraftItem[]) {
  const decided = items.filter((it) => it.suppliers.length === 1).map((it) => ({ ...it, clientName: it.suppliers[0] }));
  const needAsk = items.filter((it) => it.suppliers.length !== 1);
  return { decided, needAsk };
}

// 업체별로 묶고(가나다), 업체 안에서는 발주일 → 원재료 이름 순
export type VendorGroup = { name: string; dates: { date: string; items: DraftItem[] }[]; count: number };
export function groupByVendor(items: DraftItem[]): VendorGroup[] {
  const byVendor = new Map<string, DraftItem[]>();
  items.forEach((it) => byVendor.set(it.clientName || '', [...(byVendor.get(it.clientName || '') ?? []), it]));
  return [...byVendor.keys()].sort((a, b) => a.localeCompare(b, 'ko')).map((name) => {
    const sorted = [...(byVendor.get(name) ?? [])].sort((a, b) => (a.orderDate === b.orderDate
      ? (a.materialName || '').localeCompare(b.materialName || '', 'ko')
      : a.orderDate < b.orderDate ? -1 : 1));
    const dates = [...new Set(sorted.map((it) => it.orderDate))].map((date) => ({ date, items: sorted.filter((it) => it.orderDate === date) }));
    return { name, dates, count: sorted.length };
  });
}

export const toLedgerBulkBody = (items: DraftItem[]) => ({
  source: 'ledger',
  items: items.map((it) => ({ materialCode: it.materialCode, clientName: it.clientName, qty: String(it.qty), orderDate: it.orderDate })),
});

export const registeredMessage = (count: number) => `${count}건 발주 등록됐어요.\n지우려면 발주등록 화면에서 지워주세요.`;

// 남은재고 '조사' 꼬리표의 설명
export function adjustTitle(row: LedgerRow) {
  if (!row.totalAdjust) return '';
  const sign = row.totalAdjust > 0 ? '+' : '';
  return `재고조사로 ${sign}${ledgerNum(row.totalAdjust)} 만큼 맞춘 값이에요${row.adjustNote ? `\n사유: ${row.adjustNote}` : ''}`;
}

// 기준일 재고 엑셀(송연 구매재고_{날짜})
export const STOCK_AS_OF_EXCEL_COLUMNS: ExcelColumn<StockAsOfRow>[] = [
  { key: 'code', label: '원재료코드', width: 12 },
  { key: 'name', label: '원재료명', width: 26 },
  { key: 'spec', label: '규격', width: 14 },
  { key: 'stockQty', label: '재고수량', width: 12 },
  { key: 'unitPrice', label: '단가', width: 11 },
  { key: 'amount', label: '재고금액', width: 14 },
];
