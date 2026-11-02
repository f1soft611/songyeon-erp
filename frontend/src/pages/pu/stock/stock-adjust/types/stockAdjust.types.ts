import type { LotRecord, StockRow } from '../../../../lg/stock/product-stock/types/productStock.types';

// 구매관리 > 재고조정 값 (송연 18-stock.js 1-598 · 30-warehouse-move.js)
// 엑셀로 센 재고는 대기 목록에 쌓였다가, 반영일을 정해 확정할 때 실제 재고에 들어간다.
export type StockAdjustTabKey = 'material' | 'product' | 'whmove';
export type Target = 'materials' | 'products';

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
  rowAction?: never; // 표의 [수정] · [취소] 단추 칸 자리(값 없음)
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

// 제품 입출고 내역 표 한 줄
export type ProductHistoryRow = ProductMovement & { key: number };

// 전체 제품재고 표 한 줄
export type ProductAllRow = StockRow & {
  rowAction?: never; // 표의 [로트보기] 단추 칸 자리(값 없음)
};

// 제품 로트 표 한 줄
export type LotGridRow = LotRecord & { key: string };

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
  rowAction?: never; // 표의 [취소] 단추 칸 자리(값 없음)
};

export type UploadResult = { staged: number; skipped: number };
export type ConfirmResult = { confirmed: number; effectiveDate: string };

// 창고별 합계 한 줄
export type WarehouseTotal = { label: string; count: number; current: number; target: number; diff: number; all?: boolean };

// 적용된 재고조정 내역 트리 한 줄(반영일 묶음 또는 품목)
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

// 확정 · 전체 취소 전에 한 번 묻는 창
export type Ask = { text: string; action: () => void } | null;

// 제품 재고 업로드 안내
export type UploadMessage = { text: string; ok: boolean | null } | null;

// 창고이동 안내
export type MoveMessage = { text: string; ok: boolean } | null;

// 제품 입출고 내역 조회 조건
export type ProductHistoryQuery = { start: string; end: string; kind: string; product: string };
