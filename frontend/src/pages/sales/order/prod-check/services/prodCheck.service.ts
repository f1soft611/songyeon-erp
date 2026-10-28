import { apiGet, apiPost } from '../../../../shared/services/apiClient';
import type { FeasibilityLine, FeasibilityResult } from '../utils/feasibility';

// 영업관리 > 생산가능확인 (조회만)
const PATH = '/api/v1/sa/feasibility';

// 고를 수 있는 제품(배합비가 있는 사용 중 제품)의 이름(규격)
export async function fetchFeasibilityProducts(): Promise<string[]> {
  const result = await apiGet<{ resultList: string[] }>(`${PATH}/products`);
  return result.resultList ?? [];
}

// 그 날짜 원재료 재고로 다 만들 수 있는지(아무것도 바꾸지 않는다)
export async function checkFeasibility(date: string, lines: FeasibilityLine[]): Promise<FeasibilityResult> {
  const result = await apiPost<{ item: FeasibilityResult }>(`${PATH}/check`, {
    date,
    lines: lines.map((line) => ({ product: line.product, qty: line.qty == null ? '' : String(line.qty) })),
  });
  return result.item;
}
