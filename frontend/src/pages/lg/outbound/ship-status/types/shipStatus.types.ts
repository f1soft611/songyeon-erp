// 물류관리 > 출고관리 > 출하현황 값(서버 ShipStatusVO). 출하확정된 기록(출하등록 줄 · 물류출고일이 적힌 생산확정 줄)
export type ShipStatusRecord = {
  id: number;
  scheduleType: 'logistics' | 'production';
  scheduleDate?: string | null; // 출고일
  clientName?: string | null;
  productName?: string | null;
  orderQty?: string | null; // 실제로 나간 양
  vehicle?: string | null;
  packingMethod?: string | null;
  shipNote?: string | null;
  visitOrder?: number | null;
  driverName?: string | null;
  storage?: string | null;
  carriedOver?: boolean; // 금액만 다른 때로 넘긴(이월) 건
  carryoverQty?: number;
  carryoverLabel?: string; // '이월(2026-10-05, 2026-11)' — 서버가 만든 글자
};

// 두 곳(출하등록·생산확정)의 id 가 겹칠 수 있어 출처를 붙여 줄 열쇠로 쓴다
// 2026-10-26 출하량은 숫자 칸(서버는 글자로 준다. 예전 '1,500kg' 모양도 숫자만 골라 읽는다)
export type ShipStatusRow = Omit<ShipStatusRecord, 'orderQty'> & { key: string; orderQty: number | null };

// productName 은 품목코드나 품목명(규격) 일부, clientName 은 거래처 이름 일부(서버가 거른다)
export type ShipStatusQuery = { start: string; end: string; productName: string; clientName: string };
