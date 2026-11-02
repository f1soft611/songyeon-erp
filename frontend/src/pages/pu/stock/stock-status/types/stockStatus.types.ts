import type { StockAsOfRow, WarehouseQty } from '../../stock-ledger/types/stockLedger.types';

// 구매관리 > 재고현황 값 (송연 29-stock-status.js)
// 지금 창고에 몇이 있는지. 기준일이 오늘이면 지금 재고, 지난 날짜면 서버가 그 뒤 움직임을 되감는다(수불대장과 같은 계산).
export type StockStatusKind = 'material' | 'submaterial';
export type StockStatusRow = StockAsOfRow & { warehouseStock?: WarehouseQty[] };
export type StockStatusData = { date: string; materials: StockStatusRow[]; totalAmount: number; warehouses?: string[] };

// 창고 칸은 'w{n}'(창고 목록 몇 번째) 으로 펼친다 — 창고 이름을 칸 이름에 넣으면 창고가 바뀔 때 저장된 칸 순서와 어긋난다
export type StockStatusGridRow = StockStatusRow & Record<string, unknown>;

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
