// 생산관리 > 생산실적 > 생산현황 값(서버 ProductionStatusVO). 수량은 '980kg' 처럼 단위가 붙은 글자다.
export type ProdStatusRow = {
  id: number;
  scheduleDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  orderQty?: string | null;
  actualQty?: string | null;
  note?: string | null;
};

// productName 은 품목코드나 품목명(규격) 일부, clientName 은 거래처 이름 일부(서버가 거른다)
export type ProdStatusQuery = { start: string; end: string; productName: string; clientName: string };
