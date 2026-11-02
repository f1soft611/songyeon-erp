// 생산관리 > 라벨관리 > 라벨출력 값(서버 LabelPrintVO). 제품코드가 없으면 제품BOM 에 없는 품목이라 라벨을 찍을 수 없다.
export type LabelPrintRow = {
  scheduleId: number;
  productName?: string | null;
  orderQty?: string | null;
  clientName?: string | null;
  productCode?: string | null;
  spec?: string | null;
  printAction?: never; // 표의 [인쇄] 단추 칸 자리(값 없음)
};
