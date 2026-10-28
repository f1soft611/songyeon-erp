// 영업관리 > 단가관리 값(서버 PricingVO)
export type PricingRow = {
  id: string; // 제품코드
  productCode: string;
  productName: string;
  spec: string;
  materialCost: number | null;
  laborCost: number | null;
  packagingCost: number | null;
  logisticsCost: number | null;
  margin: number | null;
  totalPrice: number | null; // 제품단가(최종계산단가)
  currentPrice: number | null; // 현재 판매단가
  clientCode: string; // 거래처코드(2026-10-28, 예전 거래처명)
  clientName: string; // 거래처마스터 이름(서버가 붙인다)
  diff: number | null; // 차액금 = 현재단가 − 제품단가(둘 중 하나라도 없으면 null)
  detailAction?: never; // 표의 [상세] 단추 칸 자리(값 없음, 2026-10-27)
};

export type PricingDetail = PricingRow & {
  productType: string;
  markupRate: number | null; // %(입력한 값 그대로)
  lossRate: number | null; // %
  otherCost1: number | null;
  otherCost1Note: string;
  otherCost2: number | null;
  otherCost2Note: string;
  otherCost3: number | null;
  otherCost3Note: string;
  otherCost4: number | null;
  otherCost4Note: string;
};

export type PricingBomLine = {
  id: string;
  materialName: string;
  ratio: number | null; // 0~1
  amountPerKg: number | null;
};
