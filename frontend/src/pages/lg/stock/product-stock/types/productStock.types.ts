// 물류관리 > 재고관리 > 제품재고관리 값(서버 ProductStockVO · StockAsOfVO, 송연 LG0001)
export type StockSort = 'name-asc' | 'name-desc';

export type StockRow = {
  code: string;
  name?: string | null;
  spec?: string | null;
  clientName?: string | null;
  stockQty: number;
  plannedQty: number; // 생산예정: 생산확정됐지만 실생산량이 아직 없는 지시량 합계
  plannedCount: number;
  lotAction?: never; // 표의 [로트보기] 단추 칸 자리(값 없음)
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

// 펼친 줄(제품코드)과 그 로트(받는 중이면 'loading')
export type LotState = Record<string, LotRecord[] | 'loading'>;
