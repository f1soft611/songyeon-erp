import { apiGet } from '../../../../shared/services/apiClient';
import type { RecipeHandoff } from '../utils/recipeLog';

// 상품개발 > 레시피 공유 로그: 넘긴 기록(송연 /api/recipe-handoffs). 넘기기와 같은 API 묶음(/api/v1/rd/recipe-share)을 쓴다
export async function fetchHandoffs(filter: { kind: string; start: string; end: string }): Promise<RecipeHandoff[]> {
  const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => v)).toString();
  return (await apiGet<{ resultList: RecipeHandoff[] }>(`/api/v1/rd/recipe-share/handoffs${qs ? `?${qs}` : ''}`)).resultList ?? [];
}
