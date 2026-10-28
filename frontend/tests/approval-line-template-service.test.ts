import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: api.get,
  apiPost: api.post,
  apiPut: api.put,
  apiDelete: api.delete,
}));

import {
  createApprovalLineTemplate,
  deleteApprovalLineTemplate,
  getApprovalLineTemplate,
  listApprovalLineTemplates,
  renameApprovalLineTemplate,
} from '../src/pages/groupware/documents/write/services/approvalLineTemplate.service';
import type {
  ApprovalLineTemplate,
  ApprovalLineTemplateSaveRequest,
} from '../src/pages/groupware/documents/write/types/documentWrite.types';

describe('approval line template service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists templates for the selected document code', async () => {
    const templates = [{ templateId: 2, name: '기본', eabusNo: '008' }];
    api.get.mockResolvedValue({ resultList: templates });

    await expect(listApprovalLineTemplates('008')).resolves.toEqual(templates);

    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/line-templates?eabusNo=008',
    );
  });

  it('loads a template by its ID and preserves the ordered participants', async () => {
    const template: ApprovalLineTemplate = {
      templateId: 2,
      name: '기본',
      eabusNo: '001',
      approvalLines: [
        {
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approver',
        },
      ],
    };
    api.get.mockResolvedValue({ item: template });

    await expect(getApprovalLineTemplate(2)).resolves.toEqual(template);

    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/line-templates/2',
    );
  });

  it('creates a template without sending owner identity', async () => {
    const request: ApprovalLineTemplateSaveRequest = {
      eabusNo: '001',
      name: '기본',
      approvalLines: [
        {
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approver',
        },
      ],
    };
    const saved = { templateId: 3, name: '기본', eabusNo: '001' };
    api.post.mockResolvedValue({ item: saved });

    await expect(createApprovalLineTemplate(request)).resolves.toEqual(saved);

    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/line-templates',
      request,
    );
    expect(api.post.mock.calls[0][1]).not.toHaveProperty('ownerUserId');
    expect(api.post.mock.calls[0][1]).not.toHaveProperty('tenantId');
  });

  it('renames a template with only the new name in the body', async () => {
    const renamed = { templateId: 2, name: '새 이름', eabusNo: '001' };
    api.put.mockResolvedValue({ item: renamed });

    await expect(renameApprovalLineTemplate(2, '새 이름')).resolves.toEqual(
      renamed,
    );

    expect(api.put).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/line-templates/2',
      { name: '새 이름' },
    );
  });

  it('deletes by template ID', async () => {
    api.delete.mockResolvedValue({});

    await expect(deleteApprovalLineTemplate(2)).resolves.toBeUndefined();

    expect(api.delete).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/line-templates/2',
    );
  });

  it.each([undefined, null, '2026-10-20T00:00:00Z', 1792454400000])(
    'accepts updatedAt %s across template responses',
    async (updatedAt) => {
      const template = {
        templateId: 3,
        name: '기본',
        eabusNo: '001',
        updatedAt,
        approvalLines: [],
      };
      api.post.mockResolvedValue({ item: template });
      await expect(
        createApprovalLineTemplate({
          eabusNo: '001',
          name: '기본',
          approvalLines: [],
        }),
      ).resolves.toEqual(template);

      api.get.mockResolvedValue({ resultList: [template] });
      await expect(listApprovalLineTemplates('001')).resolves.toEqual([template]);

      api.get.mockResolvedValue({ item: template });
      await expect(getApprovalLineTemplate(3)).resolves.toEqual(template);

      api.put.mockResolvedValue({ item: template });
      await expect(renameApprovalLineTemplate(3, '기본')).resolves.toEqual(template);
    },
  );

  it.each([true, {}, [], NaN, Infinity, -Infinity].map((updatedAt) => ({ updatedAt })))(
    'rejects invalid updatedAt $updatedAt across template responses',
    async ({ updatedAt }) => {
      const template = {
        templateId: 3,
        name: '기본',
        eabusNo: '001',
        updatedAt,
        approvalLines: [],
      };
      api.post.mockResolvedValue({ item: template });
      await expect(
        createApprovalLineTemplate({
          eabusNo: '001',
          name: '기본',
          approvalLines: [],
        }),
      ).rejects.toThrow('자주 쓰는 결재선 저장 응답을 확인할 수 없습니다.');

      api.get.mockResolvedValue({ resultList: [template] });
      await expect(listApprovalLineTemplates('001')).rejects.toThrow(
        '자주 쓰는 결재선 목록 응답을 확인할 수 없습니다.',
      );

      api.get.mockResolvedValue({ item: template });
      await expect(getApprovalLineTemplate(3)).rejects.toThrow(
        '자주 쓰는 결재선 상세 응답을 확인할 수 없습니다.',
      );

      api.put.mockResolvedValue({ item: template });
      await expect(renameApprovalLineTemplate(3, '기본')).rejects.toThrow(
        '자주 쓰는 결재선 이름 변경 응답을 확인할 수 없습니다.',
      );
    },
  );

  it('rejects malformed API payloads and invalid input', async () => {
    api.get.mockResolvedValue({ resultList: null });
    await expect(listApprovalLineTemplates('001')).rejects.toThrow(
      '자주 쓰는 결재선 목록 응답을 확인할 수 없습니다.',
    );
    api.get.mockResolvedValue({
      resultList: [{ templateId: 2, name: '다른 문서', eabusNo: '008' }],
    });
    await expect(listApprovalLineTemplates('001')).rejects.toThrow(
      '자주 쓰는 결재선 목록 응답을 확인할 수 없습니다.',
    );
    await expect(getApprovalLineTemplate(0)).rejects.toThrow(
      '결재선 템플릿 ID가 올바르지 않습니다.',
    );
    await expect(
      createApprovalLineTemplate({
        eabusNo: '001',
        name: '   ',
        approvalLines: [],
      }),
    ).rejects.toThrow('결재선 템플릿 이름은 1~100자여야 합니다.');

    api.post.mockResolvedValue({ item: null });
    await expect(
      createApprovalLineTemplate({
        eabusNo: '001',
        name: '기본',
        approvalLines: [],
      }),
    ).rejects.toThrow('자주 쓰는 결재선 저장 응답을 확인할 수 없습니다.');
  });
});
