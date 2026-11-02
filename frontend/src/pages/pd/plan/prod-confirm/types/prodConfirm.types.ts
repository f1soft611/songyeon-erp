// 생산관리 > 생산계획 > 생산확정 값(서버 ProductionScheduleVO · ProductionOrderVO · BatchSheetVO).
// 생산지시량은 '1,000kg' 처럼 단위가 붙은 글자다.

// 서버 생산확정 한 줄
export type SavedSchedule = {
  id: number;
  scheduleDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  productCode?: string | null;
  orderQty?: string | null;
  actualQty?: string | null;
  note?: string | null;
  logisticsDate?: string | null;
  sourceOrderId?: number | null;
  isStockProduction?: number | null;
  lotNo?: string | null;
  substitutionCount?: number | null; // 원재료 치환 쪽지 수
};

// 화면 한 줄. 확정 전이면 id 가 없다(2026-10-26 부터 확정된 줄도 잠그지 않고 바로 고친다)
export type ScheduleRow = {
  key: number;
  id?: number;
  clientName: string;
  productName: string;
  productCode: string; // 상세 조회(⌄) 품목코드로 찾을 때 쓴다(가져온 수주 줄은 비어 있다)
  orderQty: string;
  note: string;
  scheduleDate: string; // 생산예정일(확정된 줄은 서버 값, 가져온 줄은 수주의 생산예정일)
  logisticsDate: string | null;
  sourceOrderId?: number;
  isStockProduction: boolean;
  substitutionCount: number;
  actualQty?: string; // 실생산량(적혔으면 지우지 못한다, 2026-10-26)
  rowAction?: never; // 표의 [확정] · 📄 레시피 · 🏷️ 라벨 단추 칸 자리(값 없음)
};

// 가져오기 창의 수주 한 줄
export type PendingOrder = {
  id: number;
  orderDate?: string | null;
  productionDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  orderQty?: string | null;
  note?: string | null;
  logisticsDate?: string | null;
  isStockProduction?: number | null;
  pullAction?: never; // 가져오기 창의 [가져오기] 단추 칸 자리(값 없음)
};

// 투입지시서(머리 + 원재료 줄)
export type BatchSheet = {
  header: {
    id: number;
    clientName?: string | null;
    productName?: string | null;
    productCode?: string | null;
    orderQty?: string | null;
    note?: string | null;
    scheduleDate?: string | null;
    lotNo?: string | null;
    substitutionCount?: number | null;
  };
  rows: { materialName?: string | null; originName?: string | null; qty?: number | null; substituted?: boolean; reason?: string | null }[];
};

// 상세 조회(⌄) 조건: 거래처는 이름 일부, 품목은 제품코드나 이름(규격) 일부
export type ScheduleDetailFilter = { clientName: string; product: string };

export type ScheduleSaveBody = {
  scheduleDate: string;
  clientName: string;
  productName: string;
  orderQty: string;
  note: string;
  logisticsDate: string | null;
  sourceOrderId: number | null;
  isStockProduction: number;
};
