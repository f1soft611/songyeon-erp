import type { ReviewStatus } from '../../../../../shared/components/screen-review/screenReview.types';

// 화면검수 관리 목록 한 줄(서버 ScreenReviewSummaryVO). 화면 한 개 = 한 줄
export type ScreenReviewSummary = {
  moduleCode: string;
  moduleName: string;
  menuId: number;
  menuCode: string;
  menuName: string;
  groupName: string | null;
  developerName: string | null;
  reviewDate: string | null;
  // 표시 상태: 서버가 정한다(검수완료로 끝나 미검수로 돌아간 화면은 검수완료, 이력이 없으면 미진행)
  displayStatus: ReviewStatus;
  lastComment: string | null;
};

export type ScreenReviewCounts = Record<ReviewStatus, number> & { total: number };

export type ScreenReviewFilter = {
  keyword: string;
  moduleCode: string;
  status: ReviewStatus | '';
  developer: string;
};

// F1-Tree 줄: 모듈 묶음 줄(parentId null) + 화면 줄
export type ScreenReviewTreeRow = {
  id: string;
  parentId: string | null;
  isModule: boolean;
  // 트리 칸(메뉴구분): 묶음 줄은 `모듈 (N)`, 화면 줄은 중분류 이름
  category: string;
  menuName: string | null;
  menuCode: string | null;
  developerName: string | null;
  reviewDate: string | null;
  displayStatus: ReviewStatus | null;
  lastComment: string | null;
  // 받은 순서(F1-Tree 정렬 기준)
  order: number;
};
