import type { QuoteCosts } from '../../../order/quote/utils/quote';

// 영업관리 > 제품등록 입력값(제품코드는 저장할 때 서버가 발번한다)
export type ProductRegisterForm = {
  name: string;
  spec: string;
  productType: string; // 포장유형(기초정보 포장유형 이름)
  storage: string; // 보관방법 코드(공통코드 STORAGE_METHOD, 2026-10-23)
  clientCode: string; // 거래처코드(2026-10-23, 목록에서 고른다)
};

export type ProductRegisterBody = {
  productName: string;
  spec: string | null;
  productType: string | null;
  storage: string | null;
  clientCode: string | null;
  bom: { materialName: string; ratioPercent: number; unitPrice: number | null; materialCode?: string }[];
  // 견적에서 '확정' 으로 넘어왔으면 그 견적 번호와 원가 항목(등록하면 견적이 확정되고 원가 항목이 단가관리에 반영된다)
  quoteId?: number;
  quoteCosts?: QuoteCosts;
};
