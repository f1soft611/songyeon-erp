import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  postFormData: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  download: vi.fn(),
  getBlob: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: api.get,
  apiPost: api.post,
  apiPostFormData: api.postFormData,
  apiPut: api.put,
  apiDelete: api.delete,
  apiDownload: api.download,
  apiGetBlob: api.getBlob,
  ApiResponseError: class ApiResponseError extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
    }
  },
}));

import {
  getDocumentApprovalDetail,
  createDocumentShareToken,
  getSharedDocumentPreview,
  listApprovalComments,
  createApprovalComment,
  updateApprovalComment,
  deleteApprovalComment,
  listApprovalCommentAttachments,
  uploadApprovalCommentAttachment,
  downloadApprovalCommentAttachment,
  fetchApprovalCommentAttachmentBlob,
  fetchApprovalEmbeddedImageBlob,
  deleteApprovalCommentAttachment,
  downloadDocumentApprovalAttachment,
  getDocumentApprovalSummary,
  listDocumentApprovals,
  listPinnedDocumentApprovals,
  pinDocumentApproval,
  unpinDocumentApproval,
  processDocumentApprovalAction,
  cancelDocumentSubmission,
  cancelDocumentApproval,
  deleteDocumentDraftEmbeddedImage,
  isDefiniteAttachmentUploadFailure,
  saveDocumentDraft,
  submitDocumentApproval,
  deleteDocumentApproval,
  uploadDocumentDraftAttachment,
  uploadDocumentDraftEmbeddedImage,
} from '../src/pages/groupware/documents/write/services/documentApproval.service';
import { ApiResponseError } from '../src/shared/services/apiClient';

describe('document approval service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests encrypted sharing tokens and permission-checked metadata', async () => {
    const token = `v1.${'A'.repeat(59)}`;
    api.post.mockResolvedValueOnce({ item: { token } });
    await expect(createDocumentShareToken(41)).resolves.toBe(token);
    expect(api.post).toHaveBeenCalledWith('/api/v1/groupware/approvals/documents/41/share-link', {});
    const record = {
      electronicApprovalId: 41, documentNo: 'EA-20261028-0041', eabusNo: '001',
      documentType: 'DRAFTING', documentStatus: 'COMPLETED', title: '문서', drafterName: '기안자', summary: '',
    };
    api.get.mockResolvedValueOnce({ item: record });
    await expect(getSharedDocumentPreview(token)).resolves.toEqual(record);
    expect(api.get).toHaveBeenCalledWith(`/api/v1/groupware/approvals/shared-document?token=${token}`);
    api.post.mockResolvedValueOnce({ item: { token: '41' } });
    await expect(createDocumentShareToken(41)).rejects.toThrow('문서 공유 링크를 확인할 수 없습니다.');
  });

  it('requests and validates an offset page of ordinary documents', async () => {
    const listItem = {
      electronicApprovalId: 41,
      documentNo: 'EA-20261010-0001',
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      title: '페이지 문서',
      drafterName: '작성자',
      summary: '요약',
    };
    const page = { resultList: [listItem], totalRowCount: 41 };
    api.get.mockResolvedValueOnce(page);

    await expect(
      listDocumentApprovals(
        'ALL',
        'DRAFTING',
        undefined,
        false,
        { offset: 20, limit: 20 },
      ),
    ).resolves.toEqual(page);
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/documents?scope=ALL&documentType=DRAFTING&offset=20&limit=20',
    );
  });

  it('uses create and update draft routes while preserving the document ID', async () => {
    const request = {
      documentType: 'DRAFTING' as const,
      draftingWorkCategoryId: null,
      title: '초안',
      contentsJson: { type: 'doc' },
      contentsHtml: '<p>내용</p>',
      contentsText: '내용',
      approvalLines: [],
      embeddedImages: [],
      temporaryImages: [],
    };
    api.post.mockResolvedValue({
      item: {
        electronicApprovalId: 41,
        documentNo: 'EA-20261010-0001',
        documentStatus: 'DRAFT',
      },
    });
    api.put.mockResolvedValue({
      item: {
        electronicApprovalId: 41,
        documentNo: 'EA-20261010-0001',
        documentStatus: 'DRAFT',
      },
    });

    await expect(saveDocumentDraft(request, null)).resolves.toEqual({
      electronicApprovalId: 41,
      documentNo: 'EA-20261010-0001',
      documentStatus: 'DRAFT',
    });
    await expect(saveDocumentDraft(request, 41)).resolves.toEqual({
      electronicApprovalId: 41,
      documentNo: 'EA-20261010-0001',
      documentStatus: 'DRAFT',
    });

    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/drafts',
      request,
    );
    expect(api.put).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/drafts/41',
      request,
    );

    api.post.mockResolvedValueOnce({
      item: { electronicApprovalId: 41, documentNo: '41', documentStatus: 'DRAFT' },
    });
    await expect(saveDocumentDraft(request, null)).rejects.toThrow(
      '임시저장 응답을 확인할 수 없습니다.',
    );
  });

  it('submits the latest draft body and validates the server workflow response', async () => {
    const request = {
      documentType: 'DRAFTING' as const,
      draftingWorkCategoryId: null,
      title: '초안',
      contentsJson: { type: 'doc' },
      contentsHtml: '<p>내용</p>',
      contentsText: '내용',
      approvalLines: [],
      embeddedImages: [],
      temporaryImages: [],
    };
    const submitted = {
      electronicApprovalId: 41,
      documentNo: 'EA-20261010-0001',
      eabusNo: '001',
      documentStatus: 'PENDING',
      submittedAt: '2026-10-12T09:00:00Z',
    };
    api.post.mockResolvedValue({ item: submitted });

    await expect(submitDocumentApproval(41, request)).resolves.toEqual(submitted);
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/41/submit',
      request,
    );

    api.post.mockResolvedValueOnce({ item: { ...submitted, documentStatus: 'DRAFT' } });
    await expect(submitDocumentApproval(41, request)).rejects.toThrow(
      '결재신청 응답을 확인할 수 없습니다.',
    );
    api.post.mockResolvedValueOnce({ item: { ...submitted, documentNo: '41' } });
    await expect(submitDocumentApproval(41, request)).rejects.toThrow(
      '결재신청 응답을 확인할 수 없습니다.',
    );
  });

  it('accepts only a completed response when sending a business contact', async () => {
    const request = {
      documentType: 'BUSINESS_CONTACT' as const,
      draftingWorkCategoryId: null,
      title: '업무연락',
      contentsJson: { type: 'doc' },
      contentsHtml: '<p>내용</p>',
      contentsText: '내용',
      approvalLines: [],
      embeddedImages: [],
      temporaryImages: [],
    };
    const sent = {
      electronicApprovalId: 41,
      documentNo: 'EA-20261010-0001',
      eabusNo: '008',
      documentStatus: 'COMPLETED',
      submittedAt: '2026-10-20T09:00:00Z',
    };
    api.post.mockResolvedValueOnce({ item: sent });
    await expect(submitDocumentApproval(41, request)).resolves.toEqual(sent);
    api.post.mockResolvedValueOnce({ item: { ...sent, documentStatus: 'PENDING' } });
    await expect(submitDocumentApproval(41, request)).rejects.toThrow('업무연락 발송 응답을 확인할 수 없습니다.');
  });

  it('uses the scoped list, summary, detail, and action ResultVO contracts', async () => {
    const document = {
      electronicApprovalId: 41,
      documentNo: 'EA-20261010-0001',
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      title: '초안',
      drafterName: '홍길동',
      summary: '본문',
    };
    const summary = {
      actionRequiredCount: 1,
      inProgressCount: 2,
      draftCount: 3,
      completedCount: 4,
      revisionRequestedCount: 5,
      rejectedCount: 6,
      notices: [document],
    };
    const detail = {
      ...document,
      isDrafter: true,
      viewCount: 7,
      draftingWorkCategoryId: null,
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문</p>',
      approvalLines: [],
      attachments: [],
      systemEvents: [],
    };
    api.get
      .mockResolvedValueOnce({ resultList: [document] })
      .mockResolvedValueOnce({ item: summary })
      .mockResolvedValueOnce({ item: detail });
    api.post.mockResolvedValueOnce({
      item: {
        electronicApprovalId: 41,
        documentStatus: 'IN_PROGRESS',
      },
    });

    await expect(listDocumentApprovals('MY_PENDING', 'DRAFTING')).resolves.toEqual([document]);
    await expect(getDocumentApprovalSummary()).resolves.toEqual(summary);
    await expect(getDocumentApprovalDetail(41)).resolves.toEqual(detail);
    await expect(
      processDocumentApprovalAction(41, { action: 'APPROVED' }),
    ).resolves.toEqual({
      electronicApprovalId: 41,
      documentStatus: 'IN_PROGRESS',
    });

    expect(api.get).toHaveBeenNthCalledWith(
      1,
      '/api/v1/groupware/approvals/documents?scope=MY_PENDING&documentType=DRAFTING',
    );
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/v1/groupware/approvals/summary');
    expect(api.get).toHaveBeenNthCalledWith(3, '/api/v1/groupware/approvals/documents/41');
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/41/actions',
      { action: 'APPROVED' },
    );
  });

  it('validates drafter and approver cancellation responses', async () => {
    api.post
      .mockResolvedValueOnce({
        item: { electronicApprovalId: 41, documentStatus: 'DRAFT' },
      })
      .mockResolvedValueOnce({
        item: { electronicApprovalId: 41, documentStatus: 'IN_PROGRESS' },
      });

    await expect(cancelDocumentSubmission(41)).resolves.toMatchObject({
      electronicApprovalId: 41,
      documentStatus: 'DRAFT',
    });
    await expect(cancelDocumentApproval(41)).resolves.toMatchObject({
      electronicApprovalId: 41,
      documentStatus: 'IN_PROGRESS',
    });
    expect(api.post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/groupware/approvals/41/submission-cancellation',
      undefined,
    );
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/groupware/approvals/41/approval-cancellation',
      undefined,
    );

    await expect(cancelDocumentSubmission(0)).rejects.toThrow('문서 ID가 올바르지 않습니다.');
    api.post.mockResolvedValueOnce({
      item: { electronicApprovalId: 41, documentStatus: 'PENDING' },
    });
    await expect(cancelDocumentSubmission(41)).rejects.toThrow(
      '상신 취소 응답을 확인할 수 없습니다.',
    );
  });

  it('requires an explicit drafter flag when reading document details', async () => {
    api.get.mockResolvedValue({
      item: {
        electronicApprovalId: 41,
        documentNo: 'EA-20261010-0001',
        title: '초안',
        contentsHtml: '<p>내용</p>',
        approvalLines: [],
        attachments: [],
        systemEvents: [],
        isDrafter: true,
        viewCount: 0,
      },
    });
    await expect(getDocumentApprovalDetail(41)).resolves.toMatchObject({
      isDrafter: true,
    });

    api.get.mockResolvedValueOnce({
      item: {
        electronicApprovalId: 41,
        documentNo: 'EA-20261010-0001',
        title: '초안',
        contentsHtml: '<p>내용</p>',
        approvalLines: [],
        attachments: [],
        systemEvents: [],
        viewCount: 0,
      },
    });
    await expect(getDocumentApprovalDetail(41)).rejects.toThrow(
      '전자결재 상세 응답을 확인할 수 없습니다.',
    );
  });

  it('requests and validates the detailed document feed payload only when requested', async () => {
    const feedItem = {
      electronicApprovalId: 41,
      documentNo: 'EA-20261010-0001',
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      title: '피드 문서',
      drafterName: '홍길동',
      summary: '요약',
      viewCount: 2,
      isDrafter: false,
      draftingWorkCategoryId: null,
      contentsJson: '{"type":"doc"}',
      contentsHtml: '<p>본문</p>',
      contentsText: '본문',
      approvalLines: [],
      attachments: [],
      systemEvents: [],
      comments: [],
      commentCount: 0,
      hasPreviousComments: false,
      nextBeforeCommentId: null,
    };
    api.get.mockResolvedValue({ resultList: [feedItem] });

    await expect(
      listDocumentApprovals('ALL', undefined, undefined, true),
    ).resolves.toEqual([feedItem]);
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/documents?scope=ALL&includeDetails=true',
    );

    api.get.mockResolvedValueOnce({
      resultList: [{ ...feedItem, comments: undefined }],
    });
    await expect(
      listDocumentApprovals('ALL', undefined, undefined, true),
    ).rejects.toThrow('전자결재 문서 피드 응답을 확인할 수 없습니다.');
  });

  it('uses dedicated pinned routes and validates pin state responses', async () => {
    const listItem = {
      electronicApprovalId: 41,
      documentNo: 'EA-20261010-0001',
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      title: '고정 문서',
      drafterName: '홍길동',
      summary: '요약',
    };
    api.get.mockResolvedValueOnce({ resultList: [listItem], totalRowCount: 1 });
    await expect(
      listPinnedDocumentApprovals('MY_PENDING', 'DRAFTING', 41),
    ).resolves.toEqual([listItem]);
    expect(api.get).toHaveBeenLastCalledWith(
      '/api/v1/groupware/approvals/documents/pinned?scope=MY_PENDING&documentType=DRAFTING&electronicApprovalId=41',
    );

    api.put.mockResolvedValueOnce({ item: { electronicApprovalId: 41, pinned: true } });
    await expect(pinDocumentApproval(41)).resolves.toEqual({
      electronicApprovalId: 41,
      pinned: true,
    });
    expect(api.put).toHaveBeenCalledWith('/api/v1/groupware/approvals/documents/41/pin', undefined);

    api.delete.mockResolvedValueOnce({ item: { electronicApprovalId: 41, pinned: false } });
    await expect(unpinDocumentApproval(41)).resolves.toEqual({
      electronicApprovalId: 41,
      pinned: false,
    });
    expect(api.delete).toHaveBeenCalledWith('/api/v1/groupware/approvals/documents/41/pin');

    api.get.mockResolvedValueOnce({ resultList: [listItem], totalRowCount: 2 });
    await expect(listPinnedDocumentApprovals('ALL')).rejects.toThrow(
      '고정 문서 목록 응답을 확인할 수 없습니다.',
    );
  });

  it('requires a non-negative safe integer view count in document details', async () => {
    const validDetail = {
      electronicApprovalId: 41,
      documentNo: 'EA-20261010-0001',
      title: '초안',
      contentsHtml: '<p>내용</p>',
      approvalLines: [],
      attachments: [],
      systemEvents: [],
      isDrafter: true,
      viewCount: 7,
    };
    api.get.mockResolvedValueOnce({ item: validDetail });
    await expect(getDocumentApprovalDetail(41)).resolves.toMatchObject({
      viewCount: 7,
    });

    const missingViewCount = { ...validDetail };
    Reflect.deleteProperty(missingViewCount, 'viewCount');
    api.get.mockResolvedValueOnce({ item: missingViewCount });
    await expect(getDocumentApprovalDetail(41)).rejects.toThrow(
      '전자결재 상세 응답을 확인할 수 없습니다.',
    );

    api.get.mockResolvedValueOnce({ item: { ...validDetail, viewCount: -1 } });
    await expect(getDocumentApprovalDetail(41)).rejects.toThrow(
      '전자결재 상세 응답을 확인할 수 없습니다.',
    );

    api.get.mockResolvedValueOnce({ item: { ...validDetail, viewCount: 1.5 } });
    await expect(getDocumentApprovalDetail(41)).rejects.toThrow(
      '전자결재 상세 응답을 확인할 수 없습니다.',
    );
    api.get.mockResolvedValueOnce({ item: { ...validDetail, documentNo: '41' } });
    await expect(getDocumentApprovalDetail(41)).rejects.toThrow(
      '전자결재 상세 응답을 확인할 수 없습니다.',
    );
  });

  it('deletes a document using the approval root route and validates the ID', async () => {
    api.delete.mockResolvedValue({});

    await deleteDocumentApproval(41);

    expect(api.delete).toHaveBeenCalledWith(`${'/api/v1/groupware/approvals'}/41`);
    await expect(deleteDocumentApproval(0)).rejects.toThrow('문서 ID가 올바르지 않습니다.');
  });

  it('uses the dedicated attachment route and reports ambiguous missing IDs', async () => {
    const file = new File(['data'], 'evidence.txt', { type: 'text/plain' });
    api.postFormData.mockResolvedValue({
      item: { fileId: 51, fileName: 'evidence.txt', fileSize: 4 },
    });

    await expect(uploadDocumentDraftAttachment(41, file)).resolves.toEqual({
      fileId: 51,
      fileName: 'evidence.txt',
      fileSize: 4,
    });
    expect(api.postFormData).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/41/attachments',
      expect.any(FormData),
    );
    expect(api.postFormData.mock.calls[0][1].get('file')).toBe(file);

    api.postFormData.mockResolvedValueOnce({ item: { fileName: 'evidence.txt' } });
    await expect(uploadDocumentDraftAttachment(41, file)).rejects.toThrow(
      '첨부 업로드 결과를 확인할 수 없습니다.',
    );
  });

  it('distinguishes definite client rejections from ambiguous server failures', () => {
    expect(isDefiniteAttachmentUploadFailure(new ApiResponseError('invalid', 400))).toBe(true);
    expect(isDefiniteAttachmentUploadFailure(new ApiResponseError('failed', 500))).toBe(false);
    expect(isDefiniteAttachmentUploadFailure(new TypeError('network'))).toBe(false);
  });

  it('uploads temporary embedded images and validates the preview response', async () => {
    const file = new File(['png'], 'pasted image.png', { type: 'image/png' });
    api.postFormData.mockResolvedValue({
      item: {
        uploadToken: 'token-1',
        fileName: 'pasted image.png',
        fileSize: 3,
        mimeType: 'image/png',
        previewUrl: 'https://minio.example/preview',
        objectKey: 'tenant/1/embedded-image-temp/token-1/pasted image.png',
      },
    });

    await expect(uploadDocumentDraftEmbeddedImage(file)).resolves.toEqual({
      src: 'https://minio.example/preview',
      alt: 'pasted image.png',
      fileName: 'pasted image.png',
      uploadToken: 'token-1',
      fileSize: 3,
      mimeType: 'image/png',
      objectKey: 'tenant/1/embedded-image-temp/token-1/pasted image.png',
    });
    expect(api.postFormData).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/embedded-images/temp',
      expect.any(FormData),
    );
    expect(api.postFormData.mock.calls[0][1].get('file')).toBe(file);

    api.postFormData.mockResolvedValueOnce({
      item: { uploadToken: 'token-2', fileName: 'missing-preview.png' },
    });
    await expect(uploadDocumentDraftEmbeddedImage(file)).rejects.toThrow(
      '본문 이미지 업로드 결과를 확인할 수 없습니다.',
    );
  });

  it('deletes temporary embedded images with encoded token and filename', async () => {
    await deleteDocumentDraftEmbeddedImage('token/1', 'pasted image.png');

    expect(api.delete).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/embedded-images/temp/token%2F1?fileName=pasted+image.png',
    );
  });

  it('uses approval-scoped comment and attachment routes with validated IDs', async () => {
    const comment = {
      commentId: 31,
      ownerId: 41,
      commentType: 'USER',
      content: '의견',
      writerId: 'writer-1',
      writerName: '홍길동',
    };
    const systemEvent = {
      commentId: 32,
      ownerId: 41,
      commentType: 'SYSTEM',
      eventType: 'SUBMITTED',
      content: '문서가 결재신청되었습니다.',
      writerName: '시스템',
      createdAt: '2026-10-12T09:00:00Z',
    };
    api.get
      .mockResolvedValueOnce({
        comments: [comment],
        systemEvents: [systemEvent],
        hasPrevious: false,
        nextBeforeCommentId: null,
        resultCnt: 2,
      })
      .mockResolvedValueOnce({
        resultList: [{ fileId: 51, fileName: 'evidence.png', fileSize: 10 }],
      });
    api.post.mockResolvedValueOnce({ item: comment });
    api.put.mockResolvedValueOnce({ item: comment });
    api.delete.mockResolvedValue({});
    api.postFormData.mockResolvedValueOnce({
      item: { fileId: 51, fileName: 'evidence.png', fileSize: 10 },
    });
    const file = new File(['data'], 'evidence.png', { type: 'image/png' });

    await expect(listApprovalComments(41, { limit: 10 })).resolves.toMatchObject({
      comments: [comment],
      systemEvents: [systemEvent],
      hasPrevious: false,
      resultCnt: 2,
    });
    await expect(createApprovalComment(41, '의견', 30)).resolves.toEqual(comment);
    await expect(updateApprovalComment(41, 31, '수정 의견')).resolves.toEqual(comment);
    await deleteApprovalComment(41, 31);
    await expect(listApprovalCommentAttachments(41, 31)).resolves.toEqual([
      { fileId: 51, fileName: 'evidence.png', fileSize: 10 },
    ]);
    api.get.mockResolvedValueOnce({
      comments: [comment],
      systemEvents: [{ ...systemEvent, commentId: undefined }],
      hasPrevious: false,
      nextBeforeCommentId: null,
      resultCnt: 2,
    });
    await expect(listApprovalComments(41)).rejects.toThrow(
      '전자결재 댓글 응답을 확인할 수 없습니다.',
    );
    await expect(uploadApprovalCommentAttachment(41, 31, file)).resolves.toEqual({
      fileId: 51,
      fileName: 'evidence.png',
      fileSize: 10,
    });
    await downloadApprovalCommentAttachment(41, 31, 51, 'evidence.png');
    const imageBlob = new Blob(['png'], { type: 'image/png' });
    api.getBlob.mockResolvedValue(imageBlob);
    await expect(fetchApprovalCommentAttachmentBlob(41, 31, 51)).resolves.toBe(imageBlob);
    await expect(fetchApprovalEmbeddedImageBlob(41, 52)).resolves.toBe(imageBlob);
    await deleteApprovalCommentAttachment(41, 31, 51);
    await downloadDocumentApprovalAttachment(41, 51, 'document.pdf');

    expect(api.get).toHaveBeenNthCalledWith(
      1,
      '/api/v1/groupware/approvals/41/comments?limit=10',
    );
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/41/comments',
      { content: '의견', parentCommentId: 30 },
    );
    expect(api.put).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/41/comments/31',
      { content: '수정 의견' },
    );
    expect(api.postFormData).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/41/comments/31/attachments',
      expect.any(FormData),
    );
    expect(api.download).toHaveBeenNthCalledWith(
      1,
      '/api/v1/groupware/approvals/41/comments/31/attachments/51/download',
      'evidence.png',
    );
    expect(api.getBlob).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/41/comments/31/attachments/51/download',
    );
    expect(api.getBlob).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/41/embedded-images/52',
    );
    expect(api.download).toHaveBeenNthCalledWith(
      2,
      '/api/v1/groupware/approvals/41/attachments/51/download',
      'document.pdf',
    );
  });

  it('accepts redacted deleted comments with a null writer ID', async () => {
    const deletedComment = {
      commentId: 52,
      ownerId: 41,
      parentCommentId: 31,
      content: '[삭제된 댓글입니다.]',
      commentType: 'USER',
      writerId: null,
      writerName: '삭제된 댓글',
      deletedYn: 'Y',
    };
    api.get.mockResolvedValueOnce({
      resultList: [deletedComment],
      comments: [deletedComment],
      systemEvents: [],
      hasPrevious: true,
      nextBeforeCommentId: 52,
      resultCnt: 22,
    });

    await expect(listApprovalComments(41, { limit: 20 })).resolves.toMatchObject({
      comments: [deletedComment],
      hasPrevious: true,
      nextBeforeCommentId: 52,
      resultCnt: 22,
    });
  });
});
