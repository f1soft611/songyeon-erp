import type { ExcelColumn } from '../../../../shared/utils/excelFile';

// 물류관리 > 제품재고관리 (송연 LG0001)
export type StockSort = 'name-asc' | 'name-desc';

export type StockRow = {
  code: string;
  name?: string | null;
  spec?: string | null;
  clientName?: string | null;
  stockQty: number;
  plannedQty: number; // 생산예정: 생산확정됐지만 실생산량이 아직 없는 지시량 합계
  plannedCount: number;
};

// 날짜 기준 재고·재고금액(원재료비 기준)
export type StockAsOfRow = {
  code: string;
  name?: string | null;
  spec?: string | null;
  clientName?: string | null;
  stockQty: number;
  materialCost?: number | null;
  amount?: number | null;
};
export type StockAsOf = { date: string; products: StockAsOfRow[]; totalAmount: number };

// 로트 = 생산확정 한 줄. planned 는 실생산량이 아직 없는 것
export type LotRecord = {
  lotId: number;
  lotDate?: string | null;
  lotNo?: string | null;
  status: 'produced' | 'planned';
  producedQty: number;
  shippedQty: number;
  remainingQty: number;
};
// 아래 로트 표의 한 줄(어느 제품의 로트인지 함께)
export type LotRow = LotRecord & { key: string; productCode: string; productLabel: string };

// 송연 formatQty: 소수 둘째 자리까지
export const formatQty = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? '' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });

// 송연 formatPrice: 금액·단가는 소수 넷째 자리까지(반올림하지 않으면 소수 단가가 틀어진다)
export const formatPrice = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? '' : (Math.round(value * 10000) / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 4 });

// 송연 생산예정 칸: 있으면 "1,200 (2건)", 없으면 빈칸(S_ERP 표준)
export const plannedText = (row: StockRow) => (row.plannedQty > 0 ? `${formatQty(row.plannedQty)} (${row.plannedCount}건)` : '');

// 송연 lotText: 로트번호가 없으면 생산일로 보여준다
export const lotText = (lot: LotRecord) => lot.lotNo || lot.lotDate || '';

export const productLabel = (row: { name?: string | null; spec?: string | null }) =>
  row.spec ? `${row.name ?? ''}(${row.spec})` : row.name ?? '';

export const totalStock = (rows: StockRow[]) => rows.reduce((sum, row) => sum + (row.stockQty || 0), 0);

// 펼친 제품(목록 순서대로)의 로트를 한 표로 모은다
export function flattenLots(rows: StockRow[], lots: Record<string, LotRecord[] | 'loading'>): LotRow[] {
  return rows.flatMap((row) => {
    const list = lots[row.code];
    if (!Array.isArray(list)) return [];
    return list.map((lot) => ({ ...lot, key: `${row.code}-${lot.lotId}`, productCode: row.code, productLabel: productLabel(row) }));
  });
}

// 재고금액 조회: 그 날짜에 재고가 있는 품목만
export const stockedOnly = (products: StockAsOfRow[]) => products.filter((product) => product.stockQty);

// 송연 엑셀 칸(그 날짜 기준 재고)
export const STOCK_EXCEL_COLUMNS: ExcelColumn<StockAsOfRow>[] = [
  { key: 'code', label: '제품코드', width: 12 },
  { key: 'name', label: '품목명', width: 28 },
  { key: 'spec', label: '규격', width: 14 },
  { key: 'clientName', label: '거래처', width: 22 },
  { key: 'stockQty', label: '재고수량', width: 12 },
  { key: 'materialCost', label: '원재료비(단위당)', width: 16 },
  { key: 'amount', label: '재고금액', width: 16 },
];
