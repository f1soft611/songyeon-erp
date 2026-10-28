import { apiDelete, apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type {
  ApprovalLineTemplate,
  ApprovalLineTemplateEabusNo,
  ApprovalLineTemplateParticipant,
  ApprovalLineTemplateSaveRequest,
  ApprovalLineTemplateSummary,
} from '../types/documentWrite.types';

const TEMPLATE_API = '/api/v1/groupware/approvals/line-templates';
const EABUS_NOS = new Set<string>([
  '001',
  '008',
  '004',
  '031',
]);
const PARTICIPANT_TYPES = new Set([
  'APPROVAL',
  'AGREEMENT',
  'REFERENCE',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEabusNo(value: unknown): value is ApprovalLineTemplateEabusNo {
  return typeof value === 'string' && EABUS_NOS.has(value);
}

function requireTemplateId(templateId: number): void {
  if (!Number.isSafeInteger(templateId) || templateId <= 0) {
    throw new Error('결재선 템플릿 ID가 올바르지 않습니다.');
  }
}

function normalizeName(name: string): string {
  const normalized = name.trim();
  if (!normalized || normalized.length > 100) {
    throw new Error('결재선 템플릿 이름은 1~100자여야 합니다.');
  }
  return normalized;
}

function validateSaveRequest(request: ApprovalLineTemplateSaveRequest): void {
  if (!isEabusNo(request.eabusNo)) {
    throw new Error('문서 코드가 올바르지 않습니다.');
  }
  normalizeName(request.name);
  if (
    !Array.isArray(request.approvalLines) ||
    !request.approvalLines.every(isApprovalLine)
  ) {
    throw new Error('결재선 템플릿 참여자 정보가 올바르지 않습니다.');
  }
}

function isApprovalLine(value: unknown): value is ApprovalLineTemplateParticipant {
  return (
    isObject(value) &&
    Number.isSafeInteger(value.stageOrder) &&
    Number(value.stageOrder) >= 2 &&
    Number.isSafeInteger(value.participantOrder) &&
    Number(value.participantOrder) > 0 &&
    typeof value.participantType === 'string' &&
    PARTICIPANT_TYPES.has(value.participantType) &&
    typeof value.participantUserId === 'string' &&
    Boolean(value.participantUserId.trim())
  );
}

function isTemplateSummary(value: unknown): value is ApprovalLineTemplateSummary {
  return (
    isObject(value) &&
    Number.isSafeInteger(value.templateId) &&
    Number(value.templateId) > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    Array.from(value.name).length <= 100 &&
    isEabusNo(value.eabusNo) &&
    (value.updatedAt === undefined ||
      value.updatedAt === null ||
      typeof value.updatedAt === 'string' ||
      (typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)))
  );
}

function isTemplateDetail(value: unknown): value is ApprovalLineTemplate {
  if (
    !isTemplateSummary(value) ||
    !('approvalLines' in value) ||
    !Array.isArray(value.approvalLines)
  ) {
    return false;
  }
  return value.approvalLines.every(isApprovalLine);
}

export async function listApprovalLineTemplates(
  eabusNo: ApprovalLineTemplateEabusNo,
): Promise<ApprovalLineTemplateSummary[]> {
  if (!isEabusNo(eabusNo)) {
    throw new Error('문서 코드가 올바르지 않습니다.');
  }
  const query = new URLSearchParams({ eabusNo });
  const response = await apiGet<{ resultList?: unknown }>(
    `${TEMPLATE_API}?${query.toString()}`,
  );
  if (
    !Array.isArray(response.resultList) ||
    !response.resultList.every(
      (template) =>
        isTemplateSummary(template) && template.eabusNo === eabusNo,
    )
  ) {
    throw new Error('자주 쓰는 결재선 목록 응답을 확인할 수 없습니다.');
  }
  return response.resultList;
}

export async function getApprovalLineTemplate(
  templateId: number,
): Promise<ApprovalLineTemplate> {
  requireTemplateId(templateId);
  const response = await apiGet<{ item?: unknown }>(
    `${TEMPLATE_API}/${templateId}`,
  );
  if (!isTemplateDetail(response.item) || response.item.templateId !== templateId) {
    throw new Error('자주 쓰는 결재선 상세 응답을 확인할 수 없습니다.');
  }
  return response.item;
}

export async function createApprovalLineTemplate(
  request: ApprovalLineTemplateSaveRequest,
): Promise<ApprovalLineTemplateSummary> {
  validateSaveRequest(request);
  const payload = { ...request, name: normalizeName(request.name) };
  const response = await apiPost<{ item?: unknown }>(TEMPLATE_API, payload);
  if (!isTemplateSummary(response.item)) {
    throw new Error('자주 쓰는 결재선 저장 응답을 확인할 수 없습니다.');
  }
  return response.item;
}

export async function renameApprovalLineTemplate(
  templateId: number,
  name: string,
): Promise<ApprovalLineTemplateSummary> {
  requireTemplateId(templateId);
  const response = await apiPut<{ item?: unknown }>(
    `${TEMPLATE_API}/${templateId}`,
    { name: normalizeName(name) },
  );
  if (!isTemplateSummary(response.item) || response.item.templateId !== templateId) {
    throw new Error('자주 쓰는 결재선 이름 변경 응답을 확인할 수 없습니다.');
  }
  return response.item;
}

export async function deleteApprovalLineTemplate(templateId: number): Promise<void> {
  requireTemplateId(templateId);
  await apiDelete(`${TEMPLATE_API}/${templateId}`);
}
