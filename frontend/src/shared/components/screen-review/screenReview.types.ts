// 화면검수 값 (서버 /api/v1/system/screen-reviews, 테이블 tb_screen_review · tb_screen_review_history · tb_screen_review_draft)
// 화면당 상태 하나. 흐름: 업체가 수정요청 → 개발사가 확인하고 검수진행중 → 업체가 확인하고 검수완료
export type ReviewStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'CHANGE_REQUESTED' | 'COMPLETED';

// PageHeader 에 넘기는 검수 대상 화면
export type ScreenReviewTarget = {
  screenCode: string; // 화면ID (tb_menu.menu_code)
  screenName: string;
  menuPath: string[]; // 모듈 > 중분류
};

// 첨부: 올린 파일은 fileId 가 있고, 아직 안 올린 파일은 file 이 있다
export type ReviewFile = { fileId?: number; name: string; size: number; file?: File };

// tb_screen_review 한 줄
export type ScreenReview = {
  status: ReviewStatus;
  reviewerName: string;
  reviewDate: string;
  requestDate: string; // 요청일: 마지막으로 수정요청을 저장한 날
  developerName: string; // 개발담당: 개발사가 따로 넣는다(패널에서는 보기만)
  devCompletedDate: string; // 개발완료일: 개발사가 따로 넣는다(패널에서는 보기만)
};

// tb_screen_review_history 한 줄
export type ReviewHistory = {
  id: number;
  fromStatus: ReviewStatus;
  toStatus: ReviewStatus;
  comment: string;
  reviewerName: string;
  reviewDate: string;
  createdAt: string;
  // 요청 번호: 수정요청 줄에만, 화면마다 1부터
  requestNo: number | null;
  files: ReviewFile[];
};

// tb_screen_review_draft 한 줄. 상태가 없다: 임시저장으로는 상태를 바꿀 수 없다
export type ReviewDraft = {
  draftId: number;
  comment: string;
  files: ReviewFile[];
  savedAt: string;
};

// 검수자(로그인 사용자) · 검수일(오늘)은 서버가 넣는다
export type ReviewForm = {
  status: ReviewStatus;
  comment: string;
  files: ReviewFile[];
};

export type ScreenReviewData = {
  review: ScreenReview | null; // 없으면 미검수
  history: ReviewHistory[];
  draft: ReviewDraft | null; // 지금 사용자의 임시저장
};
