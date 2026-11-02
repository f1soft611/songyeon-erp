// 구매관리 > 수불대장 값 (송연 app.py /api/purchase-stock-range · 18-stock.js loadPurchaseStock~submitLedgerOrders)
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

// 표에 넣는 줄: 날짜별 칸을 'u{n}'(사용량) · 'o{n}'(발주량, 정렬용 숫자) · 'ot{n}'(발주량 칸 글자)로 펼친다.
// n 은 기간 안 몇 번째 날인지다 — 날짜를 칸 이름에 넣으면 기간을 바꿀 때 저장된 칸 순서와 어긋나 새 날짜 칸이 맨 뒤로 밀린다
export type LedgerGridRow = LedgerRow & Record<string, unknown>;

export type StockAsOfRow = {
  code: string;
  name?: string | null;
  spec?: string | null;
  subCategory?: string | null;
  subCategoryNm?: string | null;
  stockQty?: number | null;
  unitPrice?: number | null;
  amount?: number | null;
};
export type StockAsOf = { date: string; materials: StockAsOfRow[]; totalAmount: number; warehouses?: string[] };

export type LedgerKind = 'material' | 'submaterial';
export type LedgerFilter = 'used' | 'nonzero' | 'all';

export type DraftItem = { materialCode: string; materialName: string; orderDate: string; qty: number; suppliers: string[]; clientName?: string };

export type VendorGroup = { name: string; dates: { date: string; items: DraftItem[] }[]; count: number };
