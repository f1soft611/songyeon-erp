// 영업관리 > 출하등록 (송연 SA0005) 값 모양. 2026-10-29 utils/shipment.ts 에서 옮겼다

// 서버 출하 한 줄. source = manual(출하등록에서 넣은 줄) | production(물류출고일이 있는 생산확정 줄)
export type ShipmentRecord = {
  id: number;
  source: 'manual' | 'production';
  scheduleDate?: string | null;
  clientCode?: string | null;
  clientName?: string | null;
  productCode?: string | null;
  productName?: string | null;
  orderQty?: string | null; // 실출하량이 있으면 실출하량, 없으면 예정량
  note?: string | null;
  lotId?: number | null;
  lotNo?: string | null;
  lotDate?: string | null;
  shipConfirmed?: number | null;
  lotAllocations?: LotAllocation[];
};

// 로트 칸 글자와 모양. tone: teal = 고른 로트, muted = 미선택·예정
export type LotLabel = { text: string; tone: 'teal' | 'muted'; bold: boolean };

// 화면 한 줄. key 는 화면에서만 쓰는 줄 구분값, record 가 없으면 아직 저장 전인 새 줄
export type ShipmentRow = {
  key: number;
  record: ShipmentRecord | null;
  clientCode: string; // 2026-10-29 거래처코드(새 줄 저장 값). 이름은 보기용
  clientName: string;
  productCode: string; // 2026-10-29 제품코드(새 줄 저장 값)
  productName: string;
  scheduleDate: string;
  orderQty: string | number; // 출하량(숫자 칸: 표에서 고치면 숫자가 들어온다)
  note: string;
  lotId: number | null;
  sourceOrderId: number | null;
  lotLabel: LotLabel;
};

export type LotAllocation = { lotId: number; qty: number | string; lotNo?: string | null; lotDate?: string | null };

// 로트 선택의 로트 한 건. status = produced(생산입고 끝) | planned(생산확정만 됨)
export type ProductLot = {
  lotId: number;
  lotDate: string;
  lotNo: string;
  status: 'produced' | 'planned';
  producedQty: number;
  shippedQty: number;
  remainingQty: number;
  clientCode: string;
  clientName: string;
  orderQty: string;
};

// 수주 한 줄(로트 선택의 생산예정 수주, 수주등록 가져오기 목록)
export type PendingOrder = {
  id: number;
  orderDate?: string | null;
  productionDate?: string | null;
  logisticsDate?: string | null;
  clientCode?: string | null;
  clientName?: string | null;
  productCode?: string | null;
  productName?: string | null;
  orderQty?: string | null;
  note?: string | null;
};

// 로트 선택에서 고른 것
export type LotPick = {
  lotId: number | null;
  lotDate: string | null;
  lotNo?: string;
  remainingQty: number;
  clientCode?: string | null;
  clientName: string | null;
  orderQty: string | null;
  beforeStockIn?: boolean;
  fromSalesOrder?: boolean;
  sourceOrderId?: number;
};

// 저장된 줄을 로트 여러 개로 나눠 적을 때
export type AllocationMode = { shipmentId: number; targetQty: number; existing: LotAllocation[] };

export type ShipmentSaveBody = {
  scheduleDate: string;
  clientCode: string;
  clientName: string;
  productCode: string;
  productName: string;
  orderQty: string;
  note: string;
  lotId: number | null;
  sourceOrderId: number | null;
};

export type PlannedItem = {
  id: string;
  kind: '생산확정' | '수주등록';
  date: string | null;
  label: string;
  planned: number;
  shipped: number;
  remaining: number;
  pick: LotPick;
};

// 로트 선택 창 표 한 줄(생산입고 완료). 보낼 수량(want)은 로트 여러 개로 나눠 적을 때만 고친다
export type ProducedLotRow = {
  id: string;
  label: string;
  planned: number; // 생산량
  shipped: number;
  remaining: number;
  lotId: number | null;
  want: number | null;
  pick: LotPick;
  pickAction?: never; // [선택] 단추 칸 자리(값 없음)
};

// 로트 선택 창 표 한 줄(생산예정): 구분(생산확정 · 수주등록)이 더 있다. planned 는 계획수량
export type PlannedLotRow = ProducedLotRow & { kind: PlannedItem['kind'] };

// 상세 조회(⌄) 조건: 거래처(이름 일부) · 품목코드/명(코드나 이름 일부)
export type ShipmentDetailFilter = { clientName: string; product: string };

// 알림 창
export type ShipmentAlertState = { message: string };

// 로트 선택 창에 띄울 것. lots 가 null 이면 품목명이 등록된 제품과 일치하지 않은 것이다.
export type LotPickState = { rowKey: number; productName: string; alloc: AllocationMode | null; lots: ProductLot[] | null; orders: PendingOrder[] };
