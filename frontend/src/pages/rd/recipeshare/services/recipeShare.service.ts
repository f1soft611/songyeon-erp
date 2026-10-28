import { apiDelete, apiGet, apiPost } from '../../../../shared/services/apiClient';
import type { RecipeShare } from '../utils/recipeShare';

// 상품개발 > 레시피 검색·공유 (송연 /api/recipe-handoffs · /api/recipe-shares). 검색 · 보기는 레시피 작성 API 를 같이 쓴다
const PATH = '/api/v1/rd/recipe-share';

export async function handoffVersion(versionId: number, kind: string): Promise<{ handoffId: number; quoteId: number | null; message: string }> {
  return (await apiPost<{ item: { handoffId: number; quoteId: number | null; message: string } }>(`${PATH}/handoffs`, { versionId, kind })).item;
}

export async function fetchShares(): Promise<RecipeShare[]> {
  return (await apiGet<{ resultList: RecipeShare[] }>(`${PATH}/shares`)).resultList ?? [];
}
export const createShare = (body: { draftId: number; versionId: number; employeeId: string; expiresAt: string }) => apiPost(`${PATH}/shares`, body);
export const revokeShare = (id: number) => apiDelete(`${PATH}/shares/${id}`);
