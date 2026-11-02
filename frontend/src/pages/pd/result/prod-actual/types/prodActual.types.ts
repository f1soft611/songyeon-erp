// 생산관리 > 생산실적 > 생산입고 값(서버 ProductionActualVO). 실생산량은 '980kg' 처럼 단위가 붙은 글자다.
export type ProdActualRecord = {
  id: number;
  scheduleDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  productCode?: string | null;
  orderQty?: string | null;
  actualQty?: string | null;
  lotNo?: string | null;
};

// 상세 조회(⌄) 조건: 거래처는 이름 일부, 품목은 제품코드나 이름(규격) 일부
export type ProdActualDetailFilter = { clientName: string; product: string };

// 화면 한 줄: input 은 칸에 치고 있는 값, saved 는 서버에 들어간 값(다르면 [저장]할 줄)
export type ProdActualRow = ProdActualRecord & {
  input: string;
  saved: string;
};
