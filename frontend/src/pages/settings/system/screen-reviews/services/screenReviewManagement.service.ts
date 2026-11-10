import { apiGet } from '../../../../../shared/services/apiClient';
import type { ScreenReviewSummary } from '../types/screenReviewManagement.types';

// 화면검수 관리 목록(서버 ScreenReviewApiController GET). 사용 중인 화면 전체를 한 번에 받는다
export async function fetchScreenReviewSummaries(): Promise<ScreenReviewSummary[]> {
  const result = await apiGet<{ items?: ScreenReviewSummary[] | null }>('/api/v1/system/screen-reviews');
  return result.items ?? [];
}
