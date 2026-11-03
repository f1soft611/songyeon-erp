import { describe, expect, it } from 'vitest';
import { canChooseStatus, historyStatusText, historyTime, reviewFormError } from '../src/shared/components/screen-review/screenReview';
import { toScreenReviewData } from '../src/shared/components/screen-review/screenReview.service';
import type { ReviewForm } from '../src/shared/components/screen-review/screenReview.types';

const form = (patch: Partial<ReviewForm> = {}): ReviewForm => ({ status: 'COMPLETED', comment: '', files: [], ...patch });

describe('화면검수 흐름: 업체가 수정요청 → 검수진행중 → 검수완료', () => {
  it('고를 수 있는 다음 상태(서버 ScreenReviewServiceImpl 과 같다)', () => {
    expect(canChooseStatus('NOT_STARTED', 'CHANGE_REQUESTED')).toBe(true);
    expect(canChooseStatus('NOT_STARTED', 'IN_PROGRESS')).toBe(false);
    expect(canChooseStatus('CHANGE_REQUESTED', 'IN_PROGRESS')).toBe(true);
    expect(canChooseStatus('CHANGE_REQUESTED', 'COMPLETED')).toBe(false);
    expect(canChooseStatus('IN_PROGRESS', 'COMPLETED')).toBe(true);
    expect(canChooseStatus('IN_PROGRESS', 'CHANGE_REQUESTED')).toBe(true);
    expect(canChooseStatus('COMPLETED', 'CHANGE_REQUESTED')).toBe(true);
    expect(canChooseStatus('COMPLETED', 'IN_PROGRESS')).toBe(false);
    expect(canChooseStatus('IN_PROGRESS', 'IN_PROGRESS')).toBe(true);
  });

  it('저장 막힘: 로그인 사용자 없음 · 건너뛰는 상태 · 의견 500자 초과', () => {
    expect(reviewFormError(form(), ' ', 'IN_PROGRESS')).toContain('로그인');
    expect(reviewFormError(form(), '업체', 'CHANGE_REQUESTED')).toBe('수정요청에서 검수완료(으)로 바꿀 수 없어요');
    expect(reviewFormError(form({ comment: 'a'.repeat(501) }), '업체', 'IN_PROGRESS')).toContain('500자');
    expect(reviewFormError(form(), '업체', 'IN_PROGRESS')).toBeNull();
  });

  it('서버 값 → 화면 값: 없으면 미검수 · 빈 값은 빈 글자', () => {
    expect(toScreenReviewData(undefined)).toEqual({ review: null, history: [], draft: null });
    const data = toScreenReviewData({
      review: { reviewStatus: 'CHANGE_REQUESTED', reviewerName: '시험업체', reviewDate: '2026-11-02', requestDate: '2026-11-02', developerName: null, devCompletedDate: null },
      history: [
        { historyId: 3, fromStatus: 'NOT_STARTED', toStatus: 'CHANGE_REQUESTED', reviewComment: '단가 칸 확인', reviewerName: '시험업체', reviewDate: '2026-11-02', createdAt: '2026-11-02 10:00:00', requestNo: 1, files: [{ fileId: 8, fileName: '캡처.png', fileSize: 2048 }] },
        { historyId: 4, fromStatus: 'CHANGE_REQUESTED', toStatus: 'IN_PROGRESS', reviewComment: null, reviewerName: '시험업체', reviewDate: '2026-11-02', createdAt: '2026-11-02 11:00:00' },
      ],
      draft: { draftId: 5, reviewComment: null, updatedAt: '2026-11-02 11:00:00', files: null },
    });
    expect(data.review).toMatchObject({ status: 'CHANGE_REQUESTED', developerName: '', devCompletedDate: '', requestDate: '2026-11-02' });
    expect(data.history[0]).toMatchObject({ id: 3, comment: '단가 칸 확인', requestNo: 1, files: [{ fileId: 8, name: '캡처.png', size: 2048 }] });
    expect(data.history[1].requestNo).toBeNull();
    expect(data.draft).toEqual({ draftId: 5, comment: '', files: [], savedAt: '2026-11-02 11:00:00' });
  });

  it('검수 이력 머리줄: 일시는 분까지 · 수정요청 → 수정요청은 수정요청 추가', () => {
    expect(historyTime('2026-11-03 14:25:07')).toBe('2026-11-03 14:25');
    expect(historyTime('')).toBe('');
    expect(historyStatusText({ fromStatus: 'CHANGE_REQUESTED', toStatus: 'CHANGE_REQUESTED' })).toBe('수정요청 추가');
    expect(historyStatusText({ fromStatus: 'NOT_STARTED', toStatus: 'CHANGE_REQUESTED' })).toBe('미검수 → 수정요청');
  });
});
