import { apiGet, apiPut } from '../../../../../shared/services/apiClient';
import type { NoticeBoardPostApi } from '../types/community.types';

const basePath = '/api/v1/groupware/boards/notice/login-popups';

export async function fetchLoginPopups(): Promise<Array<{ postId: number }>> {
  const response = await apiGet<{ resultList: Array<{ postId: number }> }>(basePath);
  if (!Array.isArray(response.resultList) ||
      response.resultList.some((item) => !Number.isSafeInteger(item.postId) || item.postId <= 0)) {
    throw new Error('로그인 공지 목록 응답이 올바르지 않습니다.');
  }
  return response.resultList;
}

export async function fetchLoginPopupDetail(postId: number): Promise<NoticeBoardPostApi> {
  const response = await apiGet<{ item: NoticeBoardPostApi }>(`${basePath}/${postId}`);
  if (Number(response.item?.postId) !== postId) {
    throw new Error('로그인 공지 상세 응답이 올바르지 않습니다.');
  }
  return response.item;
}

export async function dismissLoginPopupToday(postId: number): Promise<void> {
  await apiPut(`${basePath}/${postId}/dismiss-today`, {});
}
