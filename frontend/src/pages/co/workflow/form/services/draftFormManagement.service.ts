import {
  apiGet,
  apiPost,
  apiPut,
} from '../../../../../shared/services/apiClient';
import {
  createCommonCodeItem,
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
  updateCommonCodeItem,
  type CommonCodeItemSavePayload,
} from '../../../master/common-code/services/commonCodeManagement.service';
import type {
  CommonCodeGroupRow,
  CommonCodeItemRow,
} from '../../../master/common-code/types/commonCodeManagement.types';
import type {
  DraftFormFilters,
  DraftFormPayload,
  DraftFormRow,
  DraftFormUserOption,
} from '../types/draftFormManagement.types';

type ApiRow = Record<string, unknown>;

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeDraftFormRow(source: ApiRow): DraftFormRow {
  return {
    draftingWorkCategoryId: toNumber(source.draftingWorkCategoryId),
    cataTypeCode: String(source.cataTypeCode ?? ''),
    codeName: String(source.codeName ?? ''),
    categoryItemId: toNumber(source.categoryItemId),
    categoryName: String(source.categoryName ?? ''),
    regTermId: toNumber(source.regTermId),
    regTerm: String(source.regTerm ?? ''),
    reviewerId: source.reviewerId == null ? null : toNumber(source.reviewerId),
    reviewerName: String(source.reviewerName ?? ''),
    approverId: source.approverId == null ? null : toNumber(source.approverId),
    approverName: String(source.approverName ?? ''),
    assigneeIds: Array.isArray(source.assigneeIds)
      ? source.assigneeIds.map((id) => String(id))
      : [],
    assigneeSummary: String(source.assigneeSummary ?? '-'),
    createdByName: String(source.createdByName ?? source.createdBy ?? '-'),
    createdAt: String(source.createdAt ?? ''),
    hasDocument: Boolean(source.hasDocument),
    useAt: String(source.useAt ?? 'Y') === 'N' ? 'N' : 'Y',
  };
}

export async function fetchDraftForms(
  filters: DraftFormFilters = {},
): Promise<DraftFormRow[]> {
  const query = new URLSearchParams();
  if (filters.keyword?.trim()) query.set('keyword', filters.keyword.trim());
  if (filters.categoryItemId)
    query.set('categoryItemId', String(filters.categoryItemId));
  if (filters.regTermId) query.set('regTermId', String(filters.regTermId));
  if (filters.useAt) query.set('useAt', filters.useAt);
  const queryString = query.toString();
  const result = await apiGet<{ resultList?: ApiRow[] }>(
    `/api/v1/co/workflow/forms${queryString ? `?${queryString}` : ''}`,
  );
  return (result.resultList ?? []).map(normalizeDraftFormRow);
}

export async function fetchDraftFormUsers(): Promise<DraftFormUserOption[]> {
  const result = await apiGet<{ resultList?: ApiRow[] }>(
    '/api/v1/co/workflow/forms/users',
  );
  return (result.resultList ?? []).map((user) => ({
    userId: String(user.userId ?? ''),
    loginId: toNumber(user.loginId),
    userNm: String(user.userNm ?? ''),
    departmentNm: String(user.departmentNm ?? ''),
    profileImage: user.profileImage == null ? null : String(user.profileImage),
    levelNm: user.levelNm == null ? null : String(user.levelNm),
  }));
}

export async function fetchDraftFormOptions(): Promise<{
  categoryGroup: CommonCodeGroupRow | null;
  categoryItems: CommonCodeItemRow[];
  cycleItems: CommonCodeItemRow[];
  users: DraftFormUserOption[];
}> {
  const [groups, users] = await Promise.all([
    fetchCommonCodeGroups(),
    fetchDraftFormUsers(),
  ]);
  const categoryGroup =
    groups.find((group) => group.groupCode === 'WF_FORM_CATEGORY') ?? null;
  const cycleGroup = groups.find(
    (group) => group.groupCode === 'WF_FORM_CYCLE',
  );
  const [categoryItems, cycleItems] = await Promise.all([
    categoryGroup
      ? fetchCommonCodeItems(categoryGroup.id)
      : Promise.resolve([]),
    cycleGroup ? fetchCommonCodeItems(cycleGroup.id) : Promise.resolve([]),
  ]);
  return {
    categoryGroup,
    categoryItems: categoryItems.filter((item) => item.useAt === 'Y'),
    cycleItems: cycleItems.filter((item) => item.useAt === 'Y'),
    users,
  };
}

export async function createDraftForm(
  payload: DraftFormPayload,
): Promise<DraftFormRow> {
  const result = await apiPost<{ item?: ApiRow }>(
    '/api/v1/co/workflow/forms',
    payload,
  );
  return normalizeDraftFormRow(result.item ?? {});
}

export async function updateDraftForm(
  id: number,
  payload: DraftFormPayload,
): Promise<DraftFormRow> {
  const result = await apiPut<{ item?: ApiRow }>(
    `/api/v1/co/workflow/forms/${id}`,
    payload,
  );
  return normalizeDraftFormRow(result.item ?? {});
}

export function createDraftFormCategoryItem(
  groupId: string,
  payload: CommonCodeItemSavePayload,
) {
  return createCommonCodeItem(groupId, payload);
}

export function updateDraftFormCategoryItem(
  groupId: string,
  itemId: string,
  payload: CommonCodeItemSavePayload,
) {
  return updateCommonCodeItem(groupId, itemId, payload);
}
