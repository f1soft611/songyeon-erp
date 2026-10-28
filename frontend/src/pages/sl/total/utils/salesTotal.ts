import type { ExcelColumn } from '../../../../shared/utils/excelFile';

// 판매관리 > 토탈집계 (송연 sales.py GET /api/sales/total · 36-sales.js renderSalesTotal)
// 들어온 것(생산입고)과 나간 것(판매)을 한 표에 다 펴놓고 맨 밑 합계를 본다. 묶지 않는다
// — 관리부가 '일자·품목·수량·금액·합계 등등 모든 게 다 나와야 한다' 고 했다.
export type TotalRecord = {
  id?: number | null;
  direction: 'in' | 'out';
  directionLabel: string; // 입고 · 출고
  saleDate?: string | null; // 일자
  clientName?: string | null;
  productName?: string | null;
  qty?: number | null;
  unitPrice?: number | null;
  amount?: number | null;
  sourceLabel?: string | null; // 생산입고 · 출하확정 · 직접등록
  note?: string | null;
};
export type TotalRow = TotalRecord & { key: string };
export type SalesTotal = { rows: TotalRecord[]; count: number; inQty: number; outQty: number; totalAmount: number; noPriceCount: number };
export type DirectionFilter = '' | 'in' | 'out';

// 입고 줄은 id 가 없다. 줄 순서로 열쇠를 만든다
export const toTotalRows = (records: TotalRecord[]): TotalRow[] => records.map((record, index) => ({ ...record, key: `${record.direction}:${index}` }));

// 입고·출고 거르기는 화면에서 한다. 조건을 바꿀 때마다 다시 부르지 않아도 된다
export const filterDirection = (rows: TotalRow[], only: DirectionFilter) => (only ? rows.filter((row) => row.direction === only) : rows);

// 보이는 줄로 합계를 다시 센다. 입고·출고 수량은 따로 더한다 — 둘을 한 숫자로 더하면 뜻이 없다
export function shownTotals(rows: TotalRecord[]) {
  return {
    count: rows.length,
    inQty: rows.reduce((sum, row) => sum + (row.direction === 'in' ? row.qty || 0 : 0), 0),
    outQty: rows.reduce((sum, row) => sum + (row.direction === 'out' ? row.qty || 0 : 0), 0),
    amount: rows.reduce((sum, row) => sum + (row.amount || 0), 0),
    noPrice: rows.filter((row) => row.direction === 'out' && row.amount == null).length,
  };
}

// 금액이 빈 줄이 있으면 합계 위에 적는다. 합계만 보고 '이만큼 팔렸구나' 하고 넘어가면 안 된다
export const noPriceWarning = (noPrice: number) =>
  (noPrice > 0 ? `단가가 없어 금액이 비어 있는 출고 줄이 ${noPrice}건 있어요. 아래 금액 합계에는 그만큼 빠져 있습니다.` : '');

// 송연 엑셀 칸(화면에 보이는 것만 내려받는다)
export const SALES_TOTAL_EXCEL_COLUMNS: ExcelColumn<TotalRecord>[] = [
  { key: 'saleDate', label: '일자', width: 12 },
  { key: 'directionLabel', label: '구분', width: 8 },
  { key: 'clientName', label: '거래처', width: 20 },
  { key: 'productName', label: '품목명', width: 28 },
  { key: 'qty', label: '수량', width: 10 },
  { key: 'unitPrice', label: '단가', width: 12 },
  { key: 'amount', label: '금액', width: 14 },
  { key: 'sourceLabel', label: '들어온곳', width: 10 },
  { key: 'note', label: '메모', width: 20 },
];
