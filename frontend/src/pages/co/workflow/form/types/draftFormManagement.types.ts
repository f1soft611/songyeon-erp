export type DraftFormRow = {
  draftingWorkCategoryId: number | string;
  cataTypeCode: string;
  codeName: string;
  categoryItemId: number | null;
  categoryName: string;
  regTermId: number | null;
  regTerm: string;
  reviewerId: number | null;
  reviewerName: string;
  approverId: number | null;
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
  loginId: number;
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
  reviewerId: number | null;
  approverId: number | null;
  assigneeIds: string[];
  useAt: 'Y' | 'N';
};

export type DraftFormFilters = {
  keyword?: string;
  categoryItemId?: number;
  regTermId?: number;
  useAt?: 'Y' | 'N';
};
