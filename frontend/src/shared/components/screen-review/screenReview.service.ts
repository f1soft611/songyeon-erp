import { apiGet, apiPost, apiPut } from '../../services/apiClient';
import { deleteCommonFile, downloadCommonFile, uploadCommonFile } from '../../services/commonContentApi';
import type { ReviewFile, ReviewStatus, ScreenReviewData } from './screenReview.types';

// 화면검수 API (서버 ScreenReviewApiController). 화면은 화면ID(menu_code)로 찾는다.
// 첨부는 공통 파일 API: 저장 뒤 SCREEN_REVIEW + historyId, 임시저장 뒤 SCREEN_REVIEW_DRAFT + draftId 로 올린다
const PATH = '/api/v1/system/screen-reviews';

type ApiFile = { fileId: number; fileName?: string | null; fileSize?: number | null };
type ApiDetail = {
  review?: {
    reviewStatus?: ReviewStatus | null;
    reviewerName?: string | null;
    reviewDate?: string | null;
    requestDate?: string | null;
    developerName?: string | null;
    devCompletedDate?: string | null;
  } | null;
  history?: {
    historyId: number;
    fromStatus: ReviewStatus;
    toStatus: ReviewStatus;
    reviewComment?: string | null;
    reviewerName?: string | null;
    reviewDate?: string | null;
    createdAt?: string | null;
    requestNo?: number | null;
    files?: ApiFile[] | null;
  }[] | null;
  draft?: { draftId: number; reviewComment?: string | null; updatedAt?: string | null; files?: ApiFile[] | null } | null;
};

const toFiles = (files: ApiFile[] | null | undefined): ReviewFile[] =>
  (files ?? []).map((file) => ({ fileId: file.fileId, name: file.fileName ?? '', size: Number(file.fileSize ?? 0) }));

// 서버 값 → 화면 값
export function toScreenReviewData(detail: ApiDetail | null | undefined): ScreenReviewData {
  const review = detail?.review;
  return {
    review: review
      ? {
          status: review.reviewStatus ?? 'NOT_STARTED',
          reviewerName: review.reviewerName ?? '',
          reviewDate: review.reviewDate ?? '',
          requestDate: review.requestDate ?? '',
          developerName: review.developerName ?? '',
          devCompletedDate: review.devCompletedDate ?? '',
        }
      : null,
    history: (detail?.history ?? []).map((item) => ({
      id: item.historyId,
      fromStatus: item.fromStatus,
      toStatus: item.toStatus,
      comment: item.reviewComment ?? '',
      reviewerName: item.reviewerName ?? '',
      reviewDate: item.reviewDate ?? '',
      createdAt: item.createdAt ?? '',
      requestNo: item.requestNo ?? null,
      files: toFiles(item.files),
    })),
    draft: detail?.draft
      ? { draftId: detail.draft.draftId, comment: detail.draft.reviewComment ?? '', files: toFiles(detail.draft.files), savedAt: detail.draft.updatedAt ?? '' }
      : null,
  };
}

const screenPath = (screenCode: string) => `${PATH}/${encodeURIComponent(screenCode)}`;

export async function fetchScreenReview(screenCode: string): Promise<ScreenReviewData> {
  const result = await apiGet<{ item?: ApiDetail }>(screenPath(screenCode));
  return toScreenReviewData(result.item);
}

// 임시저장: 의견만 보낸다(상태 없음). 첨부를 올릴 임시저장 번호를 받는다
export async function saveScreenReviewDraft(screenCode: string, comment: string): Promise<number> {
  const result = await apiPut<{ draftId: number }>(`${screenPath(screenCode)}/draft`, { reviewComment: comment });
  return result.draftId;
}

// 저장: 화면을 연 때의 상태를 함께 보내 그사이 바뀌었으면 서버가 막는다. 첨부를 올릴 이력 번호를 받는다
export async function saveScreenReview(
  screenCode: string,
  body: { status: ReviewStatus; expectedStatus: ReviewStatus; comment: string },
): Promise<number> {
  const result = await apiPost<{ historyId: number }>(screenPath(screenCode), {
    status: body.status,
    expectedStatus: body.expectedStatus,
    reviewComment: body.comment,
  });
  return result.historyId;
}

// 아직 안 올린 첨부만 올린다. 못 올린 파일 이름을 돌려준다
export async function uploadReviewFiles(ownerType: string, ownerId: number, files: ReviewFile[]): Promise<string[]> {
  const failed: string[] = [];
  for (const item of files) {
    if (!item.file) continue;
    try {
      await uploadCommonFile(ownerType, ownerId, item.file);
    } catch {
      failed.push(item.name);
    }
  }
  return failed;
}

export const deleteReviewFile = (ownerType: string, ownerId: number, fileId: number) => deleteCommonFile(ownerType, ownerId, fileId);

export const downloadReviewFile = (ownerType: string, ownerId: number, file: ReviewFile) =>
  file.fileId ? downloadCommonFile(ownerType, ownerId, file.fileId, file.name) : Promise.resolve();
