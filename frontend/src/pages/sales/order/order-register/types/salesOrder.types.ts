// 영업관리 > 수주등록 화면 한 줄. key 는 화면에서만 쓰는 줄 구분값(저장 전 줄은 id 가 없다).
export type OrderRow = {
  key: number;
  id?: number;
  clientCode: string; // 2026-10-29 거래처코드(저장 값). 이름은 보기용
  clientName: string;
  productCode: string; // 2026-10-29 제품코드(저장 값). 이름(규격)은 보기용
  productName: string;
  orderQty: string | number; // 2026-10-23 숫자 칸: 표에서 고치면 숫자가 들어온다(불러온 값은 글자)
  note: string;
  productionDate: string;
  isStockProduction: boolean;
  logisticsDate: string;
  importedProduction?: boolean; // 생산확정에서 가져간 줄
  importedShipment?: boolean; // 출하등록에서 가져간 줄
};

// 서버 SalesOrderVO 한 줄
export type SavedOrder = {
  id: number;
  orderDate?: string | null;
  clientCode?: string | null;
  clientName?: string | null;
  productCode?: string | null;
  productName?: string | null;
  orderQty?: string | null;
  note?: string | null;
  productionDate?: string | null;
  isStockProduction?: number | null;
  logisticsDate?: string | null;
  importedProduction?: number | null;
  importedShipment?: number | null;
};

// 저장 본문(서버 SalesOrderVO)
export type OrderSaveBody = {
  orderDate: string;
  clientCode: string;
  clientName: string;
  productCode: string;
  productName: string;
  orderQty: string;
  note: string;
  productionDate: string | null;
  isStockProduction: number;
  logisticsDate: string | null;
};

// 품목 후보(사용 중인 제품)
export type OrderProduct = {
  code: string;
  name: string;
  spec: string;
  clientName: string;
  display: string; // 규격이 있으면 '이름(규격)'
};

// 거래처 고르기 팝업 후보(분류에 '매출', 서버 ClientOptionVO)
export type OrderClientOption = {
  clientCode: string;
  name: string;
};

// 상세 조회(⌄) 조건: 거래처(이름 일부) · 품목코드/명(코드나 이름 일부)
export type OrderDetailFilter = { clientName: string; product: string };

// 알림 창 + 닫은 뒤 보낼 칸
export type OrderAlertState = { message: string; focus?: { key: number; field: keyof OrderRow } };
