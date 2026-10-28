import { useSyncExternalStore } from 'react';
import type { QuoteBomLine, QuoteCosts } from './utils/quote';

// 견적 확정(송연 confirmQuote): 견적 화면에서 '확정' 을 누른 가견적을 제품등록 화면으로 넘긴다.
// 제품등록에서 [등록] 을 눌러야 실제로 확정된다(그때 견적 번호·원가 항목을 함께 보낸다).
export type QuoteHandoff = {
  quoteId: number;
  productName: string;
  spec: string;
  productType: string;
  storage: string; // 보관방법 코드(2026-10-23)
  clientCode: string; // 거래처코드(2026-10-23)
  clientName: string; // 거래처 이름(보기용)
  bom: QuoteBomLine[];
  costs: QuoteCosts; // 등록할 때 함께 보내면 서버가 단가관리에 반영한다
};

let pending: QuoteHandoff | null = null;
let confirmed = 0; // 확정 등록이 끝난 횟수(견적 화면이 목록을 다시 받는 신호)
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function startQuoteHandoff(handoff: QuoteHandoff) {
  pending = handoff;
  emit();
}
// 제품등록을 마쳤을 때(확정 완료)
export function finishQuoteHandoff() {
  pending = null;
  confirmed += 1;
  emit();
}
// 제품등록에서 [초기화] 하면 견적에서 넘어온 것도 버린다
export function cancelQuoteHandoff() {
  pending = null;
  emit();
}

export const useQuoteHandoff = () => useSyncExternalStore(subscribe, () => pending, () => pending);
export const useQuoteConfirmed = () => useSyncExternalStore(subscribe, () => confirmed, () => confirmed);
