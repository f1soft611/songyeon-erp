import type { PurchaseOrder } from '../../order-register/types/purchaseOrder.types';

// 구매관리 > 발주관리 > 발주현황 조회 조건 · 표 한 줄
export type StatusFilter = '' | '0' | '1'; // 전부 · 미입고만 · 입고완료만
export type StatusQuery = { start: string; end: string; clientQ: string; materialQ: string; received: StatusFilter };
export type StatusRow = PurchaseOrder & { clientCount: number };
