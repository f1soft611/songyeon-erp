export type DraftFormRow = {
  draftingWorkCategoryId: number | string;
  cataTypeCode: string;
  codeName: string;
  categoryItemId: number | null;
  categoryName: string;
  regTermId: number | null;
  regTerm: string;
  reviewerId: string | null; // 사번(2026-11-03)
  reviewerName: string;
  approverId: string | null;
  approverName: string;
  assigneeIds: string[];
  assigneeSummary: string;
  createdByName: string;
  createdAt: string;
  hasDocument: boolean;
  useAt: 'Y' | 'N';
};

export type DraftFormUserOption = {
  userId: string;
  loginId: string; // 사번(2026-11-03)
  userNm: string;
  departmentNm: string;
  profileImage: string | null;
  levelNm: string | null;
};

export type DraftFormPayload = {
  cataTypeCode: string;
  codeName: string;
  categoryItemId: number;
  regTermId: number;
  reviewerId: string | null; // 사번(2026-11-03)
  approverId: string | null;
  assigneeIds: string[];
  useAt: 'Y' | 'N';
};

export type DraftFormFilters = {
  keyword?: string;
  categoryItemId?: number;
  regTermId?: number;
  useAt?: 'Y' | 'N';
};
