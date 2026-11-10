import { isPageSearchValues, type PageSearchFieldValue } from '../components/page-search/searchFields';
import { readPageSessionState, writePageSessionState } from '../hooks/usePageSessionState';

// 2026-11-04 화면 조회조건 유지(S_ERP usePageSessionState 와 같은 방식).
// 마지막으로 조회한 조건을 브라우저 탭 세션에 두었다가, 다른 화면에 갔다 돌아오면 그 조건으로 다시 조회한다.
// 탭을 닫으면 지워진다. 처음 조건과 모양이 다른 값(예전 저장분 · 깨진 값)은 버리고 처음 조건으로 연다
const SEARCH_SESSION_VERSION = 1;
const keyOf = (page: string) => `songyeon-erp:page:${page}`;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

// 처음 조건의 칸마다 같은 종류인지 본다. 빈 객체 자리(상세 조회 값)는 검색 값 모양이면 받고, 목록 자리는 목록이면 받는다
const sameShape = (value: unknown, sample: unknown): boolean => {
  if (Array.isArray(sample)) return Array.isArray(value);
  if (!isPlainObject(sample)) return typeof value === typeof sample;
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(sample);
  if (keys.length === 0) return isPageSearchValues(value);
  return keys.every((key) => sameShape(value[key], sample[key]));
};

// sample: 모양을 볼 견본(없으면 fallback). 상세 조회 값처럼 칸이 바뀌는 자리는 빈 객체로 둔다
export function readSearchSession<T>(page: string, fallback: T, sample: unknown = fallback): T {
  return readPageSessionState<T>(keyOf(page), fallback, {
    version: SEARCH_SESSION_VERSION,
    validate: (value): value is T => sameShape(value, sample),
  });
}

export function saveSearchSession<T>(page: string, value: T): void {
  writePageSessionState<T>(keyOf(page), value, { version: SEARCH_SESSION_VERSION });
}

// 상세 조회(⌄) 거래처 · 품목코드/명 조건을 조건 칩 값으로(빈 조건은 뺀다). 돌아온 화면에 칩을 다시 보일 때 쓴다
export function clientProductDetailValues(filter: { clientName: string; product: string }): Record<string, PageSearchFieldValue> {
  return {
    ...(filter.clientName ? { clientName: filter.clientName } : {}),
    ...(filter.product ? { productName: filter.product } : {}),
  };
}
