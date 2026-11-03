import type { ReviewForm, ReviewHistory, ReviewStatus } from './screenReview.types';

// 화면검수 규칙. 서버 ScreenReviewServiceImpl 과 같다

export const REVIEW_STATUSES: ReviewStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'CHANGE_REQUESTED', 'COMPLETED'];

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  NOT_STARTED: '미검수',
  IN_PROGRESS: '검수진행중',
  CHANGE_REQUESTED: '수정요청',
  COMPLETED: '검수완료',
};

export const STATUS_COLORS: Record<ReviewStatus, 'default' | 'info' | 'warning' | 'success'> = {
  NOT_STARTED: 'default',
  IN_PROGRESS: 'info',
  CHANGE_REQUESTED: 'warning',
  COMPLETED: 'success',
};

// 검수 흐름: 업체가 수정요청 → 개발사가 확인하고 검수진행중 → 업체가 확인하고 검수완료.
// 지금 상태에서 고를 수 있는 다음 상태(지금 상태를 그대로 두고 의견만 남기는 것도 된다)
export const NEXT_STATUSES: Record<ReviewStatus, ReviewStatus[]> = {
  NOT_STARTED: ['CHANGE_REQUESTED', 'COMPLETED'],
  CHANGE_REQUESTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['CHANGE_REQUESTED', 'COMPLETED'],
  COMPLETED: ['CHANGE_REQUESTED'],
};

export const canChooseStatus = (current: ReviewStatus, next: ReviewStatus) =>
  next === current || NEXT_STATUSES[current].includes(next);

export const COMMENT_MAX = 500;
export const FILE_MAX_BYTES = 10 * 1024 * 1024;

// 첨부 소유자 종류(tb_common_file.owner_type)
export const OWNER_HISTORY = 'SCREEN_REVIEW';
export const OWNER_DRAFT = 'SCREEN_REVIEW_DRAFT';

// 정식 저장할 수 없으면 안내 문구, 되면 null
export function reviewFormError(form: ReviewForm, reviewer: string, current: ReviewStatus) {
  if (!reviewer.trim()) return '로그인 사용자를 확인할 수 없어요. 다시 로그인해주세요';
  if (!canChooseStatus(current, form.status)) return `${STATUS_LABELS[current]}에서 ${STATUS_LABELS[form.status]}(으)로 바꿀 수 없어요`;
  if (form.comment.length > COMMENT_MAX) return `검수 의견은 ${COMMENT_MAX}자까지 쓸 수 있어요`;
  return null;
}

export const formatFileSize = (size: number) =>
  size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(size / 1024))}KB`;

// 검수 이력 머리줄: 등록 일시는 분까지, 수정요청에서 또 수정요청을 올린 줄은 '수정요청 추가'
export const historyTime = (createdAt: string) => createdAt.slice(0, 16);

export const historyStatusText = (item: Pick<ReviewHistory, 'fromStatus' | 'toStatus'>) =>
  item.fromStatus === 'CHANGE_REQUESTED' && item.toStatus === 'CHANGE_REQUESTED'
    ? '수정요청 추가'
    : `${STATUS_LABELS[item.fromStatus]} → ${STATUS_LABELS[item.toStatus]}`;
