import type { AttachmentFile } from '../../../../../shared/services/attachment.service';

// 구매관리 > 입고관리 (송연 app.py /api/materials/receiving · 19-purchase.js · 37-recv-status.js)
// 반품은 '마이너스 입고' 다 — 수량·금액이 음수인 줄로 같은 표에 들어가 합계·재고가 저절로 맞는다.
export type Receiving = {
  id: number;
  materialCode?: string | null;
  materialName?: string | null;
  qty?: number | null;
  receiveDate?: string | null;
  clientName?: string | null;
  unitPrice?: number | null;
  supplyAmount?: number | null;
  vatAmount?: number | null;
  totalAmount?: number | null;
  taxType?: string | null;
  barcode?: string | null;
  isReturn?: number | null;
  returnReason?: string | null;
  returnOfId?: number | null;
  returnedQty?: number | null;
  returnableQty?: number | null;
  stockQty?: number | null; // 이 원재료의 지금 재고(지우면 마이너스가 되는 입고를 막는다, 2026-11-05)
  files?: AttachmentFile[];
};

export type ReceivingSummary = { materialCode: string; materialName?: string | null; totalQty?: number | null; entryCount?: number | null };
export type ReceivingDetail = {
  rows: { date?: string | null; materialName?: string | null; qty?: number | null; clientName?: string | null }[];
  totalReceived: number;
  totalUsed: number;
};

export type TaxType = '과세' | '면세' | '영세';

// ===== 입고·반품 등록 창의 한 줄 =====
export type StagingItem = {
  key: number;
  materialCode: string;
  materialName: string;
  qty: number | string; // 반품은 칸에서 고친다
  unitPrice: number | string | null;
  taxType: TaxType;
  clientName: string;
  checked: boolean;
  poId?: number | null; // 발주에서 가져온 품목
  returnOfId?: number | null; // 반품할 입고
  maxQty?: number | null; // 반품가능 수량
  returnReason?: string;
  rowAction?: never; // 줄 끝 [빼기] 단추 칸 전용
};

// ===== 입고현황 화면: 같은 날 같은 거래처는 한 덩어리, 덩어리마다 소계 =====
export type InStatusRow = Receiving & { groupKey: string; groupCount: number; subtotal: number | null };

export type Kind = '' | 'receiving' | 'return';
export type ReceivingQuery = { date?: string; start?: string; end?: string; clientQ?: string; materialQ?: string; kind?: Kind };
export type InQuery = { start: string; end: string; clientQ: string; materialQ: string; kind: Kind };
export type DocQuery = { start: string; end: string; clientQ: string; materialQ: string };
export type StatusRow = InStatusRow & { materialKey: string };
export type DocRow = ReceivingSummary & { key: string; fileCount: number; rowAction?: never };
// 서류 창이 열린 품목
export type DocTarget = { code: string; name: string };
// 2026-10-26 입고내역 · 반품내역은 줄을 골라 [삭제](오른쪽 클릭 [행 삭제])로 표에서 빼고 [저장] 때 지운다(예전 줄 끝 [취소])
export type DeleteKind = 'receiving' | 'return';
