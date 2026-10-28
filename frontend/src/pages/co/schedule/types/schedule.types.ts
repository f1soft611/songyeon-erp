// 공통관리 > 스케줄관리 > 생산스케줄(송연 CM0002) · 물류스케줄(CM0003). 날짜 하루치를 보기만 하는 화면의 줄

// 생산스케줄 한 줄. 생산지시량·실생산량은 '1,000kg' 처럼 단위가 붙은 글자로 저장돼 있다.
export type ProductionScheduleRow = {
  id: number;
  scheduleDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  orderQty?: string | null;
  actualQty?: string | null;
  note?: string | null;
  logisticsDate?: string | null;
};

// 물류스케줄 한 줄. source = manual(출하등록 줄) | production(생산확정에서 넘어온 줄)
export type LogisticsScheduleRow = {
  id: number;
  source: 'manual' | 'production';
  clientName?: string | null;
  productName?: string | null;
  orderQty?: string | null;
  note?: string | null;
  shipped?: boolean | null; // 실출하량이 적혔으면 출하완료
  key?: string; // 화면 줄 구분(출하등록 줄과 생산확정 줄의 번호가 겹칠 수 있다)
};
