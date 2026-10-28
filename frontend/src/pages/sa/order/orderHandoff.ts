import { useSyncExternalStore } from 'react';

// 수주 찾아가기(송연 gotoSalesOrder): 생산확정 가져오기 창의 '→' 로 그 수주를 등록한 날짜의 수주등록 화면으로 가서
// 그 줄을 잠깐 밝혀준다. 화면이 서로를 모르게 여기 담아 두고 주고받는다.
export type OrderHandoff = { date: string; orderId: number };

let pending: OrderHandoff | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function startOrderHandoff(handoff: OrderHandoff) {
  pending = handoff;
  emit();
}
// 수주등록이 받아서 그 날짜를 조회했으면 비운다
export function finishOrderHandoff() {
  pending = null;
  emit();
}

export const useOrderHandoff = () => useSyncExternalStore(subscribe, () => pending, () => pending);
