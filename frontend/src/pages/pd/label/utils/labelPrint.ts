// 생산관리 > 라벨출력 (송연 PD0004). 제품코드가 없으면 제품BOM 에 없는 품목이라 라벨을 찍을 수 없다.
export type LabelPrintRecord = {
  scheduleId: number;
  productName?: string | null;
  orderQty?: string | null;
  clientName?: string | null;
  productCode?: string | null;
  spec?: string | null;
};

export const NO_PRODUCT_CODE_MESSAGE = '제품BOM에 등록되지 않은 품목이라 라벨정보를 불러올 수 없어요';

// 송연과 같이 숫자 앞부분만 읽는다('1,000kg' → 1,000). 쉼표는 떼고 읽는다(기존은 1 로 보였다).
export function printQtyText(orderQty?: string | null) {
  const value = parseFloat(String(orderQty ?? '').replace(/,/g, '')) || 0;
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}
