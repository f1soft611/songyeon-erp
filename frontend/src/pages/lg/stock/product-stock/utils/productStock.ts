import type { ExcelColumn } from '../../../../../shared/utils/excelFile';
import type { LotRecord, LotRow, LotState, StockAsOfRow, StockRow } from '../types/productStock.types';

// 물류관리 > 재고관리 > 제품재고관리 화면 규칙(송연 LG0001)

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
export function flattenLots(rows: StockRow[], lots: LotState): LotRow[] {
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
