// 구매관리 > 발주관리 값(서버 PurchaseOrderVO). 발주등록 · 발주현황 · 입고관리 등록 창이 같이 쓴다.
// 발주에는 단가를 받지 않는다 — 표에 금액이 적혀 있으면 사람은 그것을 확정 금액으로 읽는다.
export type PurchaseOrder = {
  id: number;
  materialCode?: string | null;
  materialName?: string | null;
  qty?: number | null;
  orderDate?: string | null;
  clientName?: string | null;
  received?: boolean; // 입고가 연결됐는가(입고된 발주는 취소할 수 없다)
};

// 발주내역 표 한 줄(거래처 묶음 또는 품목)
export type HistoryRow = {
  id: string;
  parentId: string | null;
  kind: 'group' | 'item';
  label: string; // 묶음: 거래처 / 품목: 원재료명 (코드)
  info: string; // 묶음: 'N종' / 품목: 입고 상태
  pending: number; // 묶음: 미입고 건수
  received: boolean;
  qty: number;
  poId: number | null;
  rowAction?: never; // 표의 [취소] 단추 칸 자리(값 없음)
};

// 발주 등록 창: 품목을 '목록에 추가' 하는 순간의 거래처를 그 품목에 저장한다
export type StagingItem = {
  key: number;
  materialCode: string;
  materialName: string;
  qty: number;
  clientName: string;
  checked: boolean;
  removeAction?: never; // 표의 빼기 단추 칸 자리(값 없음)
};
export type MaterialOptionLite = { code: string; name: string };
