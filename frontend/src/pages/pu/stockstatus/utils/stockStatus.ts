import type { ExcelColumn } from '../../../../shared/utils/excelFile';
import type { StockAsOfRow, WarehouseQty } from '../../ledger/utils/stockLedger';

// 구매관리 > 재고현황 (송연 29-stock-status.js)
// 지금 창고에 몇이 있는지. 기준일이 오늘이면 지금 재고, 지난 날짜면 서버가 그 뒤 움직임을 되감는다(수불대장과 같은 계산).
export type StockStatusKind = 'material' | 'submaterial';
export type StockStatusRow = StockAsOfRow & { warehouseStock?: WarehouseQty[] };
export type StockStatusData = { date: string; materials: StockStatusRow[]; totalAmount: number; warehouses?: string[] };

// 원재료 입고 로트(송연 /api/materials/{code}/lots). 입고 한 건이 곧 로트다
export type MaterialLot = {
  id: number;
  barcode?: string | null;
  receiveDate?: string | null;
  clientName?: string | null;
  qty?: number | null;
  unitPrice?: number | null;
  taxType?: string | null;
  returnedQty?: number | null;
  netQty?: number | null;
};

// 송연 fmt: 소수 둘째 자리까지, 비면 빈칸(S_ERP 표준)
export const ssQty = (value: number | null | undefined) =>
  value == null || !Number.isFinite(Number(value)) ? '' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
// 송연 fmtPrice
export const ssPrice = (value: number | null | undefined) =>
  value == null || !Number.isFinite(Number(value)) ? '' : (Math.round(Number(value) * 10000) / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 4 });

// 창고가 한 곳뿐이면 갈래가 없다. 늘 같은 숫자가 두 번 나오면 읽는 데 방해만 된다
export const splitWarehouses = (warehouses: string[] | undefined) => ((warehouses ?? []).length > 1 ? (warehouses as string[]) : []);

// 그 창고에 있는 양(없으면 0)
export const warehouseQty = (row: StockStatusRow, name: string) => Number((row.warehouseStock ?? []).find((w) => w.name === name)?.qty || 0);

// 탭(원재료 = 분류 없음, 부자재 = 분류 있음) · 검색(이름 대소문자 무시, 코드) · 재고 0 제외. 순서는 서버가 준 대로
export function visibleRows(rows: StockStatusRow[], kind: StockStatusKind, query: string, nonzero: boolean): StockStatusRow[] {
  const q = query.trim().toLowerCase();
  let out = rows.filter((m) => (kind === 'submaterial' ? Boolean(m.subCategory) : !m.subCategory));
  if (q) out = out.filter((m) => (m.name || '').toLowerCase().includes(q) || (m.code || '').includes(q));
  if (nonzero) out = out.filter((m) => Number(m.stockQty || 0) !== 0);
  return out;
}

// 합계는 화면에 보이는 것만 더한다. 걸러놓고 전체 합계를 보여주면 안 맞는다고 여긴다
export const visibleTotal = (rows: StockStatusRow[]) => rows.reduce((sum, m) => sum + (m.amount || 0), 0);

export const emptyText = (kind: StockStatusKind) => (kind === 'submaterial' ? '해당하는 부자재가 없습니다' : '해당하는 원재료가 없습니다');

// 화면에 보이는 칸은 내려받은 파일에도 있어야 한다(송연 재고현황_{날짜})
export function excelColumns(warehouses: string[]): ExcelColumn<StockStatusRow>[] {
  return [
    { key: 'code', label: '코드', width: 12 },
    { key: 'name', label: '품목명', width: 26 },
    { key: 'spec', label: '규격', width: 14 },
    { key: (m) => m.subCategoryNm || m.subCategory || '원재료', label: '분류', width: 10 },
    ...warehouses.map((n): ExcelColumn<StockStatusRow> => ({ key: (m) => warehouseQty(m, n), label: n, width: 11 })),
    { key: 'stockQty', label: '재고', width: 12 },
    { key: 'unitPrice', label: '단가(원)', width: 11 },
    { key: 'amount', label: '재고금액', width: 14 },
  ];
}
