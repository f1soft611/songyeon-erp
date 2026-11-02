// 물류관리 > 출고관리 > 출하확정 값(서버 ShipConfirmVO · CharterSummaryVO, 송연 LG0002)
// 출하 목록은 두 곳에서 온다: manual — 출하등록에서 넣은 줄, production — 물류출고일이 적힌 생산확정 줄(그 줄 자신이 로트)
export type ShipSource = 'manual' | 'production';

export type LotAllocation = { qty: number | null; lotNo: string; lotDate: string };

export type ShipRecord = {
  id: number;
  source: ShipSource;
  scheduleDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  productCode?: string | null; // 상세 조회(⌄) 품목코드로 찾을 때 쓴다(2026-10-30)
  orderQty?: string | null; // 실출하량이 있으면 그것, 없으면 예정량
  plannedQty?: string | null; // 출하예정량
  actualQty?: string | null; // 실출하량
  shipNote?: string | null; // 특이사항
  lotId?: number | null;
  vehicle?: string | null; // 배차
  packingMethod?: string | null;
  visitOrder?: number | null; // 순서
  driverName?: string | null; // 운행자
  driverId?: string | null; // 운행자 사번(2026-10-30 사원 팝업으로 고른다)
  charterInfo?: string | null;
  charterAmount?: number | null;
  shipConfirmed?: number | null;
  boxQty?: number | null;
  lotDate?: string | null; // 제조일자(생산일)
  lotNo?: string | null;
  lotActualQty?: string | null; // 그 로트의 실생산량(없으면 아직 생산입고 전)
  lotPlannedQty?: string | null;
  lotAllocations?: LotAllocation[];
  storage?: string | null;
  stockQty?: number | null; // 지금 재고
};

// 줄에서 고치는 칸(확정할 때 보낸다)
export type ShipInputs = {
  inputActual: string;
  inputBox: string;
  inputPacking: string;
  inputDriver: string; // 운행자 이름(보이는 값)
  inputDriverId: string; // 운행자 사번(보내는 값)
  inputVehicle: string;
  inputOrder: string;
  inputCharterInfo: string;
  inputCharterAmount: string;
  inputNote: string;
};

// 표의 한 줄 = 서버 값 + 고치는 칸 + 화면 값
export type ShipRow = ShipRecord & ShipInputs & {
  key: string;
  lotText: string;
  vehicleGroup: string;
  rowAction?: never; // 표의 [확정] · [확정취소] 단추 칸 자리(값 없음)
};

// 상세 조회(⌄) 조건: 거래처는 이름 일부, 품목은 제품코드나 이름(규격) 일부
export type ShipDetailFilter = { clientName: string; product: string };

// 운행자 사원 팝업 후보(서버 DriverOptionVO)
export type DriverOption = { employeeId: string; name: string; department?: string | null };

export type CharterRow = { scheduleDate?: string | null; charterInfo?: string | null; charterAmount?: number | null };
export type CharterSummary = { rows: CharterRow[]; totalAmount: number };
