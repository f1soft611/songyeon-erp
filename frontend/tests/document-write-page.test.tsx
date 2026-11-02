import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitForElementToBeRemoved,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../src/theme/theme';

const composerApi = vi.hoisted(() => ({
  fetchDraftFormOptions: vi.fn(),
  fetchDraftForms: vi.fn(),
  fetchDraftFormTemplate: vi.fn(),
  fetchMyProfile: vi.fn(),
  saveDocumentDraft: vi.fn(),
  submitDocumentApproval: vi.fn(),
  cancelDocumentSubmission: vi.fn(),
  cancelDocumentApproval: vi.fn(),
  listDocumentApprovals: vi.fn(),
  listPinnedDocumentApprovals: vi.fn(),
  pinDocumentApproval: vi.fn(),
  unpinDocumentApproval: vi.fn(),
  getDocumentApprovalSummary: vi.fn(),
  getDocumentApprovalDetail: vi.fn(),
  listApprovalComments: vi.fn(),
  fetchApprovalEmbeddedImageBlob: vi.fn(),
  fetchApprovalCommentAttachmentBlob: vi.fn(),
  createApprovalComment: vi.fn(),
  updateApprovalComment: vi.fn(),
  deleteApprovalComment: vi.fn(),
  uploadApprovalCommentAttachment: vi.fn(),
  downloadApprovalCommentAttachment: vi.fn(),
  deleteApprovalCommentAttachment: vi.fn(),
  downloadDocumentApprovalAttachment: vi.fn(),
  processDocumentApprovalAction: vi.fn(),
  uploadDocumentDraftAttachment: vi.fn(),
  uploadDocumentDraftEmbeddedImage: vi.fn(),
  deleteDocumentDraftEmbeddedImage: vi.fn(),
  listDocumentDraftAttachments: vi.fn(),
  deleteDocumentDraftAttachment: vi.fn(),
  deleteDocumentApproval: vi.fn(),
}));

const composerNotifications = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
  showError: vi.fn(),
}));

const approvalLineTemplateApi = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  rename: vi.fn(),
  delete: vi.fn(),
}));

let restoreImagePreloader: (() => void) | undefined;

function getButtonGeometry(button: HTMLElement) {
  const style = getComputedStyle(button);
  return [
    style.height,
    style.minHeight,
    style.paddingTop,
    style.paddingBottom,
    style.paddingLeft,
    style.paddingRight,
  ];
}

afterEach(() => {
  restoreImagePreloader?.();
  restoreImagePreloader = undefined;
});

vi.mock('../src/shared/context/NotificationContext', () => ({
  useNotification: () => composerNotifications,
}));

vi.mock(
  '../src/pages/groupware/documents/write/services/approvalLineTemplate.service',
  () => ({
    listApprovalLineTemplates: approvalLineTemplateApi.list,
    getApprovalLineTemplate: approvalLineTemplateApi.get,
    createApprovalLineTemplate: approvalLineTemplateApi.create,
    renameApprovalLineTemplate: approvalLineTemplateApi.rename,
    deleteApprovalLineTemplate: approvalLineTemplateApi.delete,
  }),
);

vi.mock(
  '../src/pages/co/workflow/form/services/draftFormManagement.service',
  () => ({
    fetchDraftFormOptions: composerApi.fetchDraftFormOptions,
    fetchDraftForms: composerApi.fetchDraftForms,
  }),
);

vi.mock(
  '../src/pages/co/workflow/form/services/draftFormTemplate.service',
  () => ({
    fetchDraftFormTemplate: composerApi.fetchDraftFormTemplate,
  }),
);

vi.mock('../src/pages/dashboard/services/profileSettings.service', () => ({
  fetchMyProfile: composerApi.fetchMyProfile,
}));

vi.mock(
  '../src/pages/groupware/documents/write/services/documentApproval.service',
  () => ({
    saveDocumentDraft: composerApi.saveDocumentDraft,
    submitDocumentApproval: composerApi.submitDocumentApproval,
    cancelDocumentSubmission: composerApi.cancelDocumentSubmission,
    cancelDocumentApproval: composerApi.cancelDocumentApproval,
    listDocumentApprovals: composerApi.listDocumentApprovals,
    listPinnedDocumentApprovals: composerApi.listPinnedDocumentApprovals,
    pinDocumentApproval: composerApi.pinDocumentApproval,
    unpinDocumentApproval: composerApi.unpinDocumentApproval,
    getDocumentApprovalSummary: composerApi.getDocumentApprovalSummary,
    getDocumentApprovalDetail: composerApi.getDocumentApprovalDetail,
    listApprovalComments: composerApi.listApprovalComments,
    fetchApprovalEmbeddedImageBlob: composerApi.fetchApprovalEmbeddedImageBlob,
    fetchApprovalCommentAttachmentBlob:
      composerApi.fetchApprovalCommentAttachmentBlob,
    createApprovalComment: composerApi.createApprovalComment,
    updateApprovalComment: composerApi.updateApprovalComment,
    deleteApprovalComment: composerApi.deleteApprovalComment,
    uploadApprovalCommentAttachment: composerApi.uploadApprovalCommentAttachment,
    downloadApprovalCommentAttachment: composerApi.downloadApprovalCommentAttachment,
    deleteApprovalCommentAttachment: composerApi.deleteApprovalCommentAttachment,
    downloadDocumentApprovalAttachment: composerApi.downloadDocumentApprovalAttachment,
    processDocumentApprovalAction: composerApi.processDocumentApprovalAction,
    uploadDocumentDraftAttachment: composerApi.uploadDocumentDraftAttachment,
    uploadDocumentDraftEmbeddedImage: composerApi.uploadDocumentDraftEmbeddedImage,
    deleteDocumentDraftEmbeddedImage: composerApi.deleteDocumentDraftEmbeddedImage,
    listDocumentDraftAttachments: composerApi.listDocumentDraftAttachments,
    deleteDocumentDraftAttachment: composerApi.deleteDocumentDraftAttachment,
    deleteDocumentApproval: composerApi.deleteDocumentApproval,
    isDefiniteAttachmentUploadFailure: (error: unknown) =>
      error instanceof Error && error.message === 'definite failure',
    UnknownAttachmentUploadOutcomeError: class extends Error {},
  }),
);

import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { DocumentApprovalDetailFeed } from '../src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed';
import { DocumentComposerDialog } from '../src/pages/groupware/documents/write/components/DocumentComposerDialog';
import { calculateApprovalSlotCapacity } from '../src/pages/groupware/documents/write/components/DocumentApprovalFields';
import type {
  DocumentApprovalDetail,
  DocumentApprovalFeedRecord,
  DocumentApprovalRecord,
  DocumentApprovalSummary,
} from '../src/pages/groupware/documents/write/types/documentWrite.types';

const muiTheme = createTheme();

const defaultDocumentRecords: DocumentApprovalRecord[] = [
  {
    electronicApprovalId: 1,
    documentNo: 'EA-20261012-0001',
    eabusNo: '001',
    documentType: 'DRAFTING',
    documentStatus: 'PENDING',
    title: '문서 A',
    drafterName: '김민수',
    summary: '문서 A 요약',
    createdAt: '2026-10-12T09:00:00Z',
  },
  {
    electronicApprovalId: 2,
    documentNo: 'EA-20261012-0002',
    eabusNo: '008',
    documentType: 'BUSINESS_CONTACT',
    documentStatus: 'IN_PROGRESS',
    title: '문서 B',
    drafterName: '김민수',
    summary: '문서 B 요약',
  },
  {
    electronicApprovalId: 3,
    documentNo: 'EA-20261012-0003',
    eabusNo: '001',
    documentType: 'DRAFTING',
    documentStatus: 'DRAFT',
    title: '문서 C',
    drafterName: '김민수',
    summary: '문서 C 요약',
  },
  {
    electronicApprovalId: 4,
    documentNo: 'EA-20261012-0004',
    eabusNo: '001',
    documentType: 'DRAFTING',
    documentStatus: 'REVISION_REQUESTED',
    title: '문서 D',
    drafterName: '김민수',
    summary: '문서 D 요약',
  },
  {
    electronicApprovalId: 5,
    documentNo: 'EA-20261012-0005',
    eabusNo: '031',
    documentType: 'ATTENDANCE_APPLICATION',
    documentStatus: 'COMPLETED',
    title: '문서 E',
    drafterName: '김민수',
    summary: '문서 E 요약',
  },
  {
    electronicApprovalId: 6,
    documentNo: 'EA-20261012-0006',
    eabusNo: '032',
    documentType: 'EXPENSE_RESOLUTION',
    documentStatus: 'PENDING',
    title: '문서 F',
    drafterName: '김민수',
    summary: '문서 F 요약',
  },
];

function toFeedRecord(
  record: DocumentApprovalRecord,
  overrides: Partial<DocumentApprovalFeedRecord> = {},
): DocumentApprovalFeedRecord {
  return {
    ...record,
    viewCount: 0,
    isDrafter: false,
    draftingWorkCategoryId: null,
    contentsJson: '{"type":"doc","content":[]}',
    contentsHtml: `<p>선조회 본문 ${record.electronicApprovalId}</p>`,
    contentsText: `선조회 본문 ${record.electronicApprovalId}`,
    approvalLines: [],
    attachments: [],
    systemEvents: [],
    comments: [
      {
        commentId: record.electronicApprovalId + 1000,
        ownerId: record.electronicApprovalId,
        content: `<p>초기 댓글 ${record.electronicApprovalId}</p>`,
        commentType: 'USER',
        writerId: 'commenter',
        writerName: '댓글 작성자',
        attachments: [],
      },
    ],
    commentCount: 1,
    hasPreviousComments: false,
    nextBeforeCommentId: null,
    ...overrides,
  };
}

function mockPaginatedDocumentLists() {
  composerApi.listDocumentApprovals.mockImplementation(
    (
      _scope: unknown,
      _documentType: unknown,
      _electronicApprovalId: unknown,
      includeDetails: boolean,
      page?: { offset: number; limit: number },
    ) => {
      const records = includeDetails
        ? defaultDocumentRecords.map((record) => toFeedRecord(record))
        : defaultDocumentRecords;
      if (!page) return Promise.resolve(records);
      return Promise.resolve({
        resultList: records.slice(page.offset, page.offset + page.limit),
        totalRowCount: records.length,
      });
    },
  );
}

function mockPendingFeedForCurrentApprover() {
  const record = defaultDocumentRecords[0];
  if (!record) throw new Error('Missing pending document fixture.');
  const pendingRecord = { ...record, documentStatus: 'PENDING' as const };
  const pendingFeedRecord = toFeedRecord(pendingRecord, {
    isDrafter: false,
    summary: '진행 문서',
    contentsHtml: '<p>진행 문서</p>',
    contentsText: '진행 문서',
    approvalLines: [
      {
        electronicApprovalLineId: 90,
        stageOrder: 2,
        participantOrder: 1,
        participantType: 'APPROVAL',
        participantUserId: 'emp-1',
        participantName: '홍길동',
        actionStatus: 'PENDING',
      },
    ],
  });
  composerApi.listDocumentApprovals.mockImplementation(
    (
      _scope: unknown,
      _documentType: unknown,
      _documentId: unknown,
      includeDetails: boolean,
      page?: { offset: number; limit: number },
    ) => {
      const records = includeDetails ? [pendingFeedRecord] : [pendingRecord];
      if (!page) return Promise.resolve(records);
      return Promise.resolve({
        resultList: records.slice(page.offset, page.offset + page.limit),
        totalRowCount: records.length,
      });
    },
  );
}

const category = {
  id: '101',
  groupId: '10',
  itemCode: 'WORK',
  itemNm: '업무',
  parentItemId: null,
  parentItemNm: '',
  sortOrder: 10,
  useAt: 'Y' as const,
  itemDc: '',
};

const anotherCategory = {
  ...category,
  id: '102',
  itemCode: 'PROJECT',
  itemNm: '프로젝트',
  sortOrder: 20,
};

const composerUser = {
  userId: 'emp-1',
  loginId: 1,
  userNm: '홍길동',
  departmentNm: '기획팀',
  profileImage: '/users/emp-1.png',
  levelNm: '대리',
};

const anotherComposerUser = {
  userId: 'emp-2',
  loginId: 2,
  userNm: '김민수',
  departmentNm: '개발팀',
  profileImage: '/users/emp-2.png',
  levelNm: '과장',
};

const thirdComposerUser = {
  userId: 'emp-3',
  loginId: 3,
  userNm: '박서준',
  departmentNm: '재무팀',
  profileImage: '/users/emp-3.png',
  levelNm: '사원',
};

const fourthComposerUser = {
  userId: 'emp-4',
  loginId: 4,
  userNm: '이수진',
  departmentNm: '인사팀',
  profileImage: '/users/emp-4.png',
  levelNm: '부장',
};

const fifthComposerUser = {
  userId: 'emp-5',
  loginId: 5,
  userNm: '최민호',
  departmentNm: '영업팀',
  profileImage: '/users/emp-5.png',
  levelNm: '차장',
};

const draftForm = {
  draftingWorkCategoryId: 77,
  cataTypeCode: '007',
  codeName: '정기점검',
  categoryItemId: 101,
  categoryName: '업무',
  regTermId: 201,
  regTerm: '월',
  reviewerId: null,
  reviewerName: '',
  approverId: null,
  approverName: '',
  assigneeIds: [],
  assigneeSummary: '',
  createdByName: '관리자',
  createdAt: '2026-10-02 09:00',
  hasDocument: true,
  useAt: 'Y' as const,
};

const draftFormTemplate = {
  draftingWorkCategoryId: 77,
  cataTypeCode: '007',
  codeName: '정기점검',
  hasDocument: true,
  templateJson: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: '양식 본문' }] },
    ],
  },
  templateHtml: '<p>양식 본문</p>',
};

beforeEach(() => {
  vi.clearAllMocks();
  approvalLineTemplateApi.list.mockResolvedValue([]);
  composerApi.fetchDraftFormOptions.mockResolvedValue({
    categoryGroup: null,
    categoryItems: [category],
    cycleItems: [],
    users: [
      composerUser,
      anotherComposerUser,
      thirdComposerUser,
      fourthComposerUser,
      fifthComposerUser,
    ],
  });
  composerApi.fetchDraftForms.mockResolvedValue([draftForm]);
  composerApi.fetchDraftFormTemplate.mockResolvedValue(draftFormTemplate);
  composerApi.fetchMyProfile.mockResolvedValue({
    userId: composerUser.userId,
    employeeId: composerUser.userId,
    name: '기안자',
  });
  composerApi.saveDocumentDraft.mockResolvedValue({
    electronicApprovalId: 77,
    documentNo: 'EA-20261012-0077',
    documentStatus: 'DRAFT',
  });
  composerApi.submitDocumentApproval.mockResolvedValue({
    electronicApprovalId: 77,
    documentNo: 'EA-20261012-0077',
    eabusNo: '001',
    documentStatus: 'PENDING',
    submittedAt: '2026-10-12T09:00:00Z',
  });
  composerApi.cancelDocumentSubmission.mockResolvedValue({
    electronicApprovalId: 1,
    documentStatus: 'DRAFT',
  });
  composerApi.cancelDocumentApproval.mockResolvedValue({
    electronicApprovalId: 1,
    documentStatus: 'PENDING',
  });
  composerApi.listDocumentApprovals.mockImplementation(
    (_scope, _documentType, _documentId, includeDetails) =>
      Promise.resolve(
        includeDetails
          ? defaultDocumentRecords.map((record) => toFeedRecord(record))
          : defaultDocumentRecords,
      ),
  );
  composerApi.listPinnedDocumentApprovals.mockResolvedValue([]);
  composerApi.pinDocumentApproval.mockReset().mockImplementation((electronicApprovalId: number) =>
    Promise.resolve({ electronicApprovalId, pinned: true }),
  );
  composerApi.unpinDocumentApproval.mockReset().mockImplementation((electronicApprovalId: number) =>
    Promise.resolve({ electronicApprovalId, pinned: false }),
  );
  composerApi.getDocumentApprovalSummary.mockResolvedValue({
    actionRequiredCount: 1,
    inProgressCount: 2,
    draftCount: 1,
    completedCount: 1,
    revisionRequestedCount: 1,
    rejectedCount: 0,
    notices: [
      {
        electronicApprovalId: 1,
        documentNo: 'EA-20261012-0001',
        eabusNo: '001',
        documentType: 'DRAFTING',
        documentStatus: 'PENDING',
        title: '문서 A',
        drafterName: '김민수',
        summary: '문서 A 요약',
        noticeType: 'ACTION_REQUIRED',
      },
      {
        electronicApprovalId: 4,
        documentNo: 'EA-20261012-0004',
        eabusNo: '001',
        documentType: 'DRAFTING',
        documentStatus: 'REVISION_REQUESTED',
        title: '문서 D',
        drafterName: '김민수',
        summary: '문서 D 요약',
        noticeType: 'REVISION_REQUESTED',
      },
    ],
  });
  composerApi.getDocumentApprovalDetail.mockResolvedValue({
    electronicApprovalId: 1,
    documentNo: 'EA-20261012-0001',
    eabusNo: '001',
    documentType: 'DRAFTING',
    documentStatus: 'PENDING',
    title: '문서 A',
    drafterName: '김민수',
    summary: '문서 A 요약',
    viewCount: 0,
    draftingWorkCategoryId: null,
    contentsJson: '{"type":"doc","content":[]}',
    contentsHtml: '<p>본문 내용</p>',
    approvalLines: [],
    attachments: [],
    systemEvents: [],
  });
  composerApi.processDocumentApprovalAction.mockResolvedValue({
    electronicApprovalId: 1,
    documentStatus: 'IN_PROGRESS',
  });
  composerApi.listApprovalComments.mockResolvedValue({
    comments: [],
    systemEvents: [],
    hasPrevious: false,
    nextBeforeCommentId: null,
    resultCnt: 0,
  });
  composerApi.fetchApprovalEmbeddedImageBlob.mockResolvedValue(
    new Blob(['image'], { type: 'image/png' }),
  );
  composerApi.fetchApprovalCommentAttachmentBlob.mockResolvedValue(
    new Blob(['image'], { type: 'image/png' }),
  );
  composerApi.createApprovalComment.mockResolvedValue({});
  composerApi.updateApprovalComment.mockResolvedValue({});
  composerApi.deleteApprovalComment.mockResolvedValue(undefined);
  composerApi.deleteDocumentApproval.mockResolvedValue(undefined);
  composerApi.uploadApprovalCommentAttachment.mockResolvedValue({});
  composerApi.downloadApprovalCommentAttachment.mockResolvedValue(undefined);
  composerApi.deleteApprovalCommentAttachment.mockResolvedValue(undefined);
  composerApi.downloadDocumentApprovalAttachment.mockResolvedValue(undefined);
  composerApi.uploadDocumentDraftAttachment.mockResolvedValue({
    fileId: 501,
    fileName: 'evidence.txt',
    fileSize: 8,
  });
  composerApi.uploadDocumentDraftEmbeddedImage.mockResolvedValue({
    src: 'https://minio.example/approval-preview',
    alt: 'pasted.png',
    fileName: 'pasted.png',
    uploadToken: 'approval-image-token',
    fileId: 'approval-image-token',
    objectKey: 'tenant/1/embedded-image-temp/approval-image-token/pasted.png',
    fileSize: 8,
    mimeType: 'image/png',
  });
  composerApi.deleteDocumentDraftEmbeddedImage.mockResolvedValue(undefined);
  composerApi.listDocumentDraftAttachments.mockResolvedValue([]);
  composerApi.deleteDocumentDraftAttachment.mockResolvedValue(undefined);
});

const pageProps = {
  selectedModule: {
    id: 'groupware',
    name: '그룹웨어',
    icon: <span aria-hidden="true">G</span>,
    tree: [],
    menus: [],
    path: '/groupware',
  },
  currentMenuName: '문서작성',
  currentPageKey: 'write',
  breadcrumbItems: ['그룹웨어', '문서관리', '문서작성'],
  content: {
    title: '문서작성',
    description: '결재 문서를 작성하고 진행 상태를 확인합니다.',
    cards: [],
    items: [],
  },
};

async function waitForComposerReady() {
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: '기안자' })).toHaveValue(
      '기안자',
    ),
  );
}

function getPickerListbox(picker: HTMLElement): HTMLElement {
  const listboxId = picker.getAttribute('aria-controls');
  const listbox = listboxId ? document.getElementById(listboxId) : null;
  if (!listbox) throw new Error('User picker listbox is not open.');
  return listbox;
}

function installApprovalResizeObserverMock() {
  const observers: (
    ResizeObserver & {
      resize: (width: number) => void;
      isObserving: (element: Element) => boolean;
    }
  )[] = [];

  class MockApprovalResizeObserver implements ResizeObserver {
    private target: Element | null = null;

    constructor(private callback: ResizeObserverCallback) {
      observers.push(
        this as ResizeObserver & {
          resize: (width: number) => void;
          isObserving: (element: Element) => boolean;
        },
      );
    }

    observe(target: Element): void {
      this.target = target;
      this.resize(262);
    }

    unobserve(_target: Element): void {}

    disconnect(): void {
      this.target = null;
    }

    isObserving(element: Element): boolean {
      return this.target === element;
    }

    resize(width: number): void {
      if (!this.target) return;
      const entry = {
        target: this.target,
        contentRect: {
          x: 0,
          y: 0,
          top: 0,
          right: width,
          bottom: 0,
          left: 0,
          width,
          height: 0,
          toJSON: () => ({}),
        },
      } as ResizeObserverEntry;
      this.callback([entry], this);
    }
  }

  vi.stubGlobal('ResizeObserver', MockApprovalResizeObserver);
  return observers;
}

describe('Document write page', () => {
  it('business contact always confirms unchanged tab switches in both directions', async () => {
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    const confirmation = await screen.findByRole('dialog', { name: '문서 유형 변경' });
    fireEvent.click(within(confirmation).getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(confirmation);
    expect(screen.getByRole('tab', { name: '기안서' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByTestId('document-approval-person')).toHaveLength(1);
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    expect(screen.getByRole('tab', { name: '업무연락' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    expect(await screen.findByRole('dialog', { name: '문서 유형 변경' })).toBeInTheDocument();
  }, 20000);

  it('business contact shares metadata and sends references without approvers', async () => {
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: '기안자' })).toHaveValue('기안자');
    expect(screen.getByRole('combobox', { name: '기안양식' })).toBeInTheDocument();
    expect(screen.queryByText('결재선')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '결재신청' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '공유할 업무' },
    });
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '발송' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(composerApi.saveDocumentDraft).toHaveBeenCalledWith(
      expect.objectContaining({ documentType: 'BUSINESS_CONTACT', approvalLines: [] }), null,
    ));
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    const picker = screen.getByRole('combobox', { name: '참조자 선택' });
    fireEvent.change(picker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    composerApi.submitDocumentApproval.mockResolvedValueOnce({
      electronicApprovalId: 77, documentStatus: 'COMPLETED', eabusNo: '008',
    });
    fireEvent.click(screen.getByRole('button', { name: '발송' }));
    await waitFor(() => expect(composerApi.submitDocumentApproval).toHaveBeenCalledWith(
      77, expect.objectContaining({
        documentType: 'BUSINESS_CONTACT',
        approvalLines: [{
          stageOrder: 1, participantOrder: 1, participantType: 'REFERENCE',
          participantUserId: anotherComposerUser.userId,
        }],
      }),
    ));
    expect(composerNotifications.showSuccess).toHaveBeenCalledWith('업무연락이 발송되었습니다.');
  }, 60000);

  it('loads reference favorites after cancelling drafting favorites and switching tabs', async () => {
    approvalLineTemplateApi.list.mockImplementation((code: string) =>
      Promise.resolve([
        {
          templateId: code === '001' ? 1 : 8,
          name: code === '001' ? '기안 즐겨찾기' : '업무 참조 즐겨찾기',
          eabusNo: code,
        },
      ]),
    );
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.click(screen.getByRole('button', { name: '결재선 설정' }));
    const approvalDialog = await screen.findByRole('dialog', {
      name: '결재선 설정',
    });
    const approvalSelect = within(approvalDialog).getByRole('combobox', {
      name: '자주 쓰는 결재선',
    });
    await waitFor(() => expect(approvalSelect).toBeEnabled());
    fireEvent.mouseDown(approvalSelect);
    expect(
      await screen.findByRole('option', { name: '기안 즐겨찾기' }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('option', { name: '자주 쓰는 결재선 선택' }),
    );
    fireEvent.click(within(approvalDialog).getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(approvalDialog);

    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    const confirmation = await screen.findByRole('dialog', {
      name: '문서 유형 변경',
    });
    fireEvent.click(within(confirmation).getByRole('button', { name: '이동' }));
    await waitForElementToBeRemoved(confirmation);
    fireEvent.click(screen.getByRole('button', { name: '자주 쓰는 참조자' }));
    const referenceDialog = await screen.findByRole('dialog', {
      name: '참조자 설정',
    });
    const referenceSelect = within(referenceDialog).getByRole('combobox', {
      name: '자주 쓰는 참조자',
    });
    await waitFor(() => expect(referenceSelect).toBeEnabled());
    expect(approvalLineTemplateApi.list).toHaveBeenLastCalledWith('008');
    fireEvent.mouseDown(referenceSelect);
    expect(
      await screen.findByRole('option', { name: '업무 참조 즐겨찾기' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '기안 즐겨찾기' }),
    ).not.toBeInTheDocument();
  }, 30000);

  it('business-contact reference settings button opens the reference-only dialog', async () => {
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();

    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    const confirmation = await screen.findByRole('dialog', {
      name: '문서 유형 변경',
    });
    fireEvent.click(
      within(confirmation).getByRole('button', { name: '이동' }),
    );
    await waitForElementToBeRemoved(confirmation);

    const referenceRow = screen.getByTestId('document-reference-row');
    const referenceInput = within(referenceRow).getByRole('combobox', {
      name: '참조자 선택',
    });
    const referenceControl = referenceInput.closest('.MuiInputBase-root');
    const referenceSettingsButton = within(referenceRow).getByRole('button', {
      name: '자주 쓰는 참조자',
    });
    expect(referenceControl).toHaveStyle({ height: '40px' });
    expect(referenceSettingsButton).toHaveStyle({
      height: '40px',
      minHeight: '40px',
    });
    fireEvent.click(
      referenceSettingsButton,
    );
    expect(
      await screen.findByTestId('document-approval-settings-dialog'),
    ).toBeInTheDocument();
  }, 30000);

  it('business contact tab confirmation preserves content and resets all participants only after moving', async () => {
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '기안양식' }));
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent('양식 본문'));
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '탭 이동 제목' },
    });
    const picker = screen.getByRole('combobox', { name: '참조자 선택' });
    fireEvent.change(picker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    const approvalPicker = screen.getByRole('combobox', { name: '결재선 2 사용자 선택' });
    fireEvent.change(approvalPicker, { target: { value: '박서준' } });
    fireEvent.click(within(getPickerListbox(approvalPicker)).getByRole('option', { name: /박서준/ }));
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));
    const nextApprovalPicker = screen.getByRole('combobox', { name: '결재선 3 사용자 선택' });
    fireEvent.change(nextApprovalPicker, {
      target: { value: '이수진' },
    });
    fireEvent.click(within(getPickerListbox(nextApprovalPicker)).getByRole('option', { name: /이수진/ }));
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    const confirm = await screen.findByRole('dialog', { name: '문서 유형 변경' });
    fireEvent.click(within(confirm).getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(confirm);
    expect(screen.getByRole('tab', { name: '기안서' })).toHaveAttribute('aria-selected', 'true');
    expect(picker.closest('.MuiAutocomplete-root')).toHaveTextContent('김민수');
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' }))
      .not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('탭 이동 제목');
    expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent('양식 본문');
    expect(screen.getByRole('combobox', { name: '기안양식' })).toHaveTextContent('정기점검');
    expect(screen.getByRole('combobox', { name: '참조자 선택' }).closest('.MuiAutocomplete-root'))
      .not.toHaveTextContent('김민수');
    expect(screen.queryByTestId('document-approval-fields')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    expect(screen.getAllByTestId('document-approval-person')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '결재 추가' })).toBeDisabled();
    expect(screen.queryByTestId('document-agreement-person')).not.toBeInTheDocument();
    expect(composerApi.fetchDraftFormTemplate).toHaveBeenCalledTimes(1);
  }, 60000);

  it('business contact restores a draft with no drafter approval line', async () => {
    render(<DocumentComposerDialog open onClose={vi.fn()} initialDocument={{
      electronicApprovalId: 77,
      documentType: 'BUSINESS_CONTACT',
      documentStatus: 'DRAFT',
      title: '저장한 업무연락',
      drafterName: '기안자',
      isDrafter: true,
      viewCount: 0,
      draftingWorkCategoryId: null,
      contentsJson: '{"type":"doc"}',
      contentsHtml: '<p>보존한 본문</p>',
      approvalLines: [{
        electronicApprovalLineId: 1, stageOrder: 1, participantOrder: 1,
        participantType: 'REFERENCE', participantUserId: anotherComposerUser.userId,
        participantName: anotherComposerUser.userNm, actionStatus: '',
      }],
      attachments: [],
      systemEvents: [],
    }} />);
    await waitForComposerReady();
    expect(screen.getByRole('tab', { name: '업무연락' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText('저장된 결재선에서 기안자를 확인할 수 없습니다.')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent('보존한 본문');
    expect(screen.getByRole('combobox', { name: '참조자 선택' }).closest('.MuiAutocomplete-root'))
      .toHaveTextContent(anotherComposerUser.userNm);
    expect(screen.getByRole('button', { name: '발송' })).toBeEnabled();
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    const confirmation = await screen.findByRole('dialog', { name: '문서 유형 변경' });
    fireEvent.click(within(confirmation).getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(confirmation);
    expect(screen.getByRole('tab', { name: '업무연락' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('combobox', { name: '참조자 선택' }).closest('.MuiAutocomplete-root'))
      .toHaveTextContent(anotherComposerUser.userNm);
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    expect(screen.getAllByTestId('document-approval-person')).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('저장한 업무연락');
    expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent('보존한 본문');
    expect(screen.getByRole('combobox', { name: '참조자 선택' }).closest('.MuiAutocomplete-root'))
      .not.toHaveTextContent(anotherComposerUser.userNm);
  });

  it('business contact detects body-only edits and keeps attachments through tab changes', async () => {
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    const body = screen.getByRole('textbox', { name: '본문' });
    fireEvent.paste(body, { clipboardData: {
      getData: (type: string) => type === 'text/plain' ? '직접 작성한 본문' : '',
      files: [],
      items: [],
    } });
    await waitFor(() => expect(body).toHaveTextContent('직접 작성한 본문'));
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('첨부 파일 선택'), {
      target: { files: [new File(['test'], 'contact.txt', { type: 'text/plain' })] },
    });
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent('직접 작성한 본문');
    expect(screen.getByText('contact.txt')).toBeInTheDocument();
  });

  it('business contact reports dispatch failures and always confirms tab changes after saving', async () => {
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '발송 실패 검증' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: '참조자 선택' }), {
      target: { value: '김민수' },
    });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    composerApi.submitDocumentApproval.mockRejectedValueOnce(new Error('발송 실패'));
    fireEvent.click(screen.getByRole('button', { name: '발송' }));
    expect(await screen.findByText('발송 실패')).toBeInTheDocument();
    expect(composerNotifications.showSuccess).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(composerNotifications.showSuccess).toHaveBeenCalledWith('문서가 임시저장되었습니다.'));
    await waitFor(() => expect(screen.getByRole('tab', { name: '기안서' })).toBeEnabled());
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    const confirmation = await screen.findByRole('dialog', { name: '문서 유형 변경' });
    fireEvent.click(within(confirmation).getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(confirmation);
    expect(screen.getByRole('tab', { name: '업무연락' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('combobox', { name: '참조자 선택' }).closest('.MuiAutocomplete-root'))
      .toHaveTextContent('김민수');
  }, 20000);

  it('does not emit an SSR-unsafe first-child selector warning', async () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    try {
      render(<DashboardContent {...pageProps} />);

      fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
      await waitForComposerReady();

      const consoleCalls = [...errorSpy.mock.calls, ...warnSpy.mock.calls];
      expect(
        consoleCalls.some((call) =>
          call.some((argument) =>
            String(argument).includes(
              'pseudo class ":first-child" is potentially unsafe',
            ),
          ),
        ),
      ).toBe(false);
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  }, 15000);

  it('adds the signed-in user as a non-removable first approver', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const firstApprover = screen.getByTestId('document-approval-person');
    expect(firstApprover).toHaveAttribute('aria-label', '결재 1 홍길동');
    const approverName = within(firstApprover).getByText('홍길동');
    const approvalSequenceBadge = within(firstApprover).getByLabelText(
      '참여 순번 1',
    );
    expect(approvalSequenceBadge).toHaveStyle({
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
    });
    expect(approverName).not.toHaveStyle({ maxWidth: '3em' });
    expect(approverName.parentElement).toHaveStyle({
      display: 'flex',
      justifyContent: 'center',
    });
    expect(
      within(firstApprover).queryByRole('button', { name: /삭제/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: '결재선 2 사용자 선택' }),
    ).toBeInTheDocument();
  });

  it('uses profile details as the fixed first approver when absent from selectable users', async () => {
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category],
      cycleItems: [],
      users: [anotherComposerUser, thirdComposerUser],
    });
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'emp-profile-only',
      employeeId: 'emp-profile-only',
      name: '기안자',
      departmentName: '기획팀',
      levelName: '팀장',
      profileImage: '/users/profile-only.png',
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));

    const firstApprover = await screen.findByRole('group', {
      name: '결재 1 기안자',
    });
    expect(firstApprover).toHaveTextContent('팀장');
    expect(firstApprover).toHaveTextContent('기안자');
    expect(
      within(firstApprover).queryByRole('button', { name: /삭제/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('로그인 사용자를 결재선 사용자 목록에서 찾을 수 없습니다.'),
    ).not.toBeInTheDocument();
  }, 15000);

  it('uses employee identity to exclude the drafter while retaining same-name users', async () => {
    const sameNameUser = {
      ...composerUser,
      userId: 'emp-same-name',
      departmentNm: '회계팀',
      userNm: '기안자',
    };
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category],
      cycleItems: [],
      users: [
        {
          ...composerUser,
          userId: ` ${composerUser.userId} `,
          userNm: '기안자',
        },
        sameNameUser,
        anotherComposerUser,
        thirdComposerUser,
      ],
    });
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'login-code-1',
      employeeId: composerUser.userId,
      name: '기안자',
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const firstApprover = screen.getByTestId('document-approval-person');
    expect(firstApprover).toHaveAttribute('aria-label', '결재 1 기안자');

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.click(approvalPicker);
    const approvalListbox = getPickerListbox(approvalPicker);
    expect(
      within(approvalListbox).queryByRole('option', { name: /기안자.*기획팀/ }),
    ).toBeNull();
    expect(
      within(approvalListbox).getByRole('option', { name: /기안자.*회계팀/ }),
    ).toBeInTheDocument();
    fireEvent.keyDown(approvalPicker, { key: 'Escape' });

    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.click(referencePicker);
    const referenceListbox = getPickerListbox(referencePicker);
    expect(
      within(referenceListbox).queryByRole('option', { name: /기안자.*기획팀/ }),
    ).toBeNull();
    expect(
      within(referenceListbox).getByRole('option', { name: /기안자.*회계팀/ }),
    ).toBeInTheDocument();
    fireEvent.keyDown(referencePicker, { key: 'Escape' });

    const agreementPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.click(agreementPicker);
    const agreementListbox = getPickerListbox(agreementPicker);
    expect(
      within(agreementListbox).queryByRole('option', {
        name: /기안자.*기획팀/,
      }),
    ).toBeNull();
    expect(
      within(agreementListbox).getByRole('option', { name: /기안자.*회계팀/ }),
    ).toBeInTheDocument();
  }, 15000);

  it('prevents the same user from being assigned to approval and reference', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.click(referencePicker);
    const referenceListbox = getPickerListbox(referencePicker);
    expect(
      within(referenceListbox).queryByRole('option', { name: /홍길동/ }),
    ).toBeNull();
    expect(
      within(referenceListbox).queryByRole('option', { name: /김민수/ }),
    ).toBeNull();
    fireEvent.keyDown(referencePicker, { key: 'Escape' });

    const nextApprovalPicker = screen.getByRole('combobox', {
      name: '결재선 3 사용자 선택',
    });
    fireEvent.click(nextApprovalPicker);
    const approvalListbox = getPickerListbox(nextApprovalPicker);
    expect(
      within(approvalListbox).queryByRole('option', { name: /홍길동/ }),
    ).toBeNull();
    expect(
      within(approvalListbox).queryByRole('option', { name: /김민수/ }),
    ).toBeNull();
  }, 15000);

  it('keeps an actively selected approval user out of reference candidates', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));

    fireEvent.click(screen.getByRole('combobox', { name: '참조자 선택' }));
    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    expect(
      within(getPickerListbox(referencePicker)).queryByRole('option', {
        name: /김민수/,
      }),
    ).toBeNull();
  });

  it('shows a complete dashed empty approval and hides the pending agreement seal', async () => {
    installApprovalResizeObserverMock();
    const rendered = render(<DashboardContent {...pageProps} />);

    try {
      fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
      await waitForComposerReady();

      const emptySlot = screen.getAllByTestId('document-empty-approval-slot')[0];
      expect(within(emptySlot).getByLabelText('직위/직함 자리')).toBeInTheDocument();
      expect(within(emptySlot).queryByText('직위/직함')).not.toBeInTheDocument();
      expect(within(emptySlot).getByLabelText('결재 도장 자리')).toBeInTheDocument();
      expect(within(emptySlot).queryByText('도장')).not.toBeInTheDocument();
      expect(within(emptySlot).getByLabelText('결재자 이름 자리')).toBeInTheDocument();
      expect(within(emptySlot).queryByText('이름')).not.toBeInTheDocument();
      expect(emptySlot).toHaveStyle({
        borderStyle: 'dashed',
        borderColor: muiTheme.palette.divider,
      });
      expect(emptySlot.querySelector('[aria-label*="순번"]')).toBeNull();
      expect(emptySlot.querySelector('button')).toBeNull();

      const approvalPicker = screen.getByRole('combobox', {
        name: '결재선 2 사용자 선택',
      });
      fireEvent.change(approvalPicker, { target: { value: '김민수' } });
      fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
      fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));

      const agreement = screen.getByTestId('document-agreement-chip');
      expect(within(agreement).queryByLabelText('합의 도장 자리')).toBeNull();
      const fields = screen.getByTestId('document-approval-fields');
      const children = Array.from(fields.children);
      const approvalRowIndex = children.indexOf(
        screen.getByTestId('document-approval-display-row'),
      );
      const agreementRowIndex = children.indexOf(
        screen.getByTestId('document-agreement-display-row'),
      );
      expect(
        children
          .slice(approvalRowIndex + 1, agreementRowIndex)
          .some((child) => child.classList.contains('MuiDivider-root')),
      ).toBe(false);
    } finally {
      rendered.unmount();
      vi.unstubAllGlobals();
    }
  });

  it('shares one sequence across an agreement stage without numbering participants individually', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const addUsers = async (
      selectorNumber: number,
      names: string[],
      actionLabel: '결재 추가' | '합의 추가',
    ) => {
      const picker = screen.getByRole('combobox', {
        name: `결재선 ${selectorNumber} 사용자 선택`,
      });
      for (const name of names) {
        fireEvent.change(picker, { target: { value: name } });
        fireEvent.click(
          await screen.findByRole('option', { name: new RegExp(name) }),
        );
      }
      fireEvent.click(screen.getByRole('button', { name: actionLabel }));
    };

    await addUsers(2, ['김민수', '박서준'], '합의 추가');
    await addUsers(3, ['이수진'], '결재 추가');
    await addUsers(4, ['최민호'], '결재 추가');

    const approvalPeople = screen.getAllByTestId('document-approval-person');
    const agreementChips = screen.getAllByTestId('document-agreement-chip');
    expect(approvalPeople.map((person) => person.getAttribute('aria-label'))).toEqual([
      '결재 1 홍길동',
      '결재 3 이수진',
      '결재 4 최민호',
    ]);
    expect(agreementChips.map((chip) => chip.getAttribute('aria-label'))).toEqual([
      '합의 2 김민수',
      '합의 2 박서준',
    ]);
  }, 15000);

  it('uses X removal actions for non-fixed approvals and agreement participants', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const agreementPicker = screen.getByRole('combobox', {
      name: '결재선 3 사용자 선택',
    });
    fireEvent.change(agreementPicker, { target: { value: '박서준' } });
    fireEvent.click(await screen.findByRole('option', { name: /박서준/ }));
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));

    const removableApproval = screen.getByRole('group', {
      name: '결재 2 김민수',
    });
    const approvalRemoveButton = within(removableApproval).getByRole('button', {
      name: '결재 참여자 2 김민수 삭제',
    });
    const positionRow = within(removableApproval).getByTestId(
      'document-approval-position-row',
    );
    expect(positionRow).toContainElement(approvalRemoveButton);
    expect(
      within(approvalRemoveButton).getByTestId('approval-remove-icon'),
    ).toBeInTheDocument();

    const agreement = screen.getByRole('group', {
      name: '합의 3 박서준',
    });
    const agreementRemoveButton = within(agreement).getByRole('button', {
      name: '합의 참여자 3 박서준 삭제',
    });
    expect(
      within(agreementRemoveButton).getByTestId('agreement-remove-icon'),
    ).toBeInTheDocument();

    const fixedDrafter = screen.getByRole('group', {
      name: '결재 1 홍길동',
    });
    expect(
      within(fixedDrafter).queryByRole('button', { name: /삭제/ }),
    ).toBeNull();
  }, 15000);

  it('renders at the groupware write route instead of the coming-soon page', async () => {
    render(<DashboardContent {...pageProps} />);
    await screen.findByRole('region', { name: '리스트형 문서 목록' });

    expect(screen.getByTestId('document-write-page')).toHaveStyle({
      minWidth: '0px',
    });
    expect(
      screen.queryByText('요청하신 페이지는 현재 준비 중입니다'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /문서 작성/ }),
    ).toBeInTheDocument();
  });

  it('defaults to list mode and displays approval status and all document kinds', async () => {
    mockPaginatedDocumentLists();
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    await waitFor(() =>
      expect(within(listRegion).getByRole('button', { name: /^문서 A/ })).toBeInTheDocument(),
    );

    expect(
      screen.getByRole('button', { name: '리스트형 보기' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('document-list')).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: '문서 제목 검색' }),
    ).not.toBeInTheDocument();
    expect(within(listRegion).getAllByTestId('list-item-row')).toHaveLength(6);
    expect(listRegion).toHaveTextContent('문서 A');
    const firstDocumentRow = within(listRegion).getByRole('button', {
      name: /^문서 A/,
    });
    const badgeLabels = Array.from(
      firstDocumentRow.closest('[data-testid="list-item-row"]')!.querySelectorAll('.MuiChip-root'),
      (chip) => chip.textContent,
    );
    expect(badgeLabels).toEqual(['결재진행중', '기안']);
    ['기안', '업무', '지출', '근태'].forEach((kind) => {
      expect(screen.getAllByText(kind).length).toBeGreaterThan(0);
    });
    expect(within(listRegion).getAllByText('결재진행중').length).toBeGreaterThan(0);
    expect(within(listRegion).getByText('승인')).toBeInTheDocument();
    expect(screen.getAllByText('보완요청').length).toBeGreaterThan(0);
  });

  it('shows only approval status and business category badges in list rows', async () => {
    composerApi.listDocumentApprovals.mockResolvedValue({
      resultList: defaultDocumentRecords.map((record) => ({ ...record, isDrafter: true })),
      totalRowCount: 6,
    });
    render(<DashboardContent {...pageProps} />);
    const list = await screen.findByRole('region', { name: '리스트형 문서 목록' });
    const rows = within(list).getAllByTestId('list-item-row');
    expect(rows).toHaveLength(6);
    for (const row of rows) {
      expect(row.querySelectorAll('.MuiChip-root')).toHaveLength(2);
      expect(within(row).queryByRole('separator')).not.toBeInTheDocument();
      expect(within(row).queryByRole('button', { name: /상단 고정|문서 더보기/ }))
        .not.toBeInTheDocument();
      expect(within(row).getAllByRole('button')).toHaveLength(1);
    }
    expect(Array.from(rows[2]!.querySelectorAll('.MuiChip-root'), (chip) => chip.textContent))
      .toEqual(['임시저장', '기안']);
    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();
    expect(composerApi.getDocumentApprovalDetail).not.toHaveBeenCalled();
  });

  it('hides list actions regardless of authorship and opens details on selection', async () => {
    composerApi.listDocumentApprovals.mockResolvedValue({
      resultList: [
        { ...defaultDocumentRecords[2], isDrafter: false },
        { ...defaultDocumentRecords[3], isDrafter: true },
        { ...defaultDocumentRecords[2], electronicApprovalId: 99 },
      ],
      totalRowCount: 3,
    });
    render(<DashboardContent {...pageProps} />);
    const list = await screen.findByRole('region', { name: '리스트형 문서 목록' });
    expect(within(list).queryByRole('button', { name: /문서 더보기|상단 고정/ })).toBeNull();
    fireEvent.click(within(list).getByRole('button', { name: /^문서 D/ }));
    await screen.findByTestId('approval-detail-card');
    expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledWith(4);
  });

  it('reports pin mutation failures after confirmation', async () => {
    mockPaginatedDocumentLists();
    composerApi.pinDocumentApproval.mockRejectedValueOnce(
      new Error('고정 실패'),
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    const pin = await screen.findByRole('button', {
      name: '상단 고정 문서 A',
    });

    fireEvent.click(pin);
    const dialog = await screen.findByRole('dialog', { name: '상단 고정' });
    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));

    await waitFor(() =>
      expect(composerNotifications.showError).toHaveBeenCalledWith('고정 실패'),
    );
    expect(composerApi.pinDocumentApproval).toHaveBeenCalledTimes(1);
  }, 20000);

  it('does not offer direct unpinning in the pinned panel', async () => {
    mockPaginatedDocumentLists();
    const documentA = defaultDocumentRecords[0];
    if (!documentA) throw new Error('Missing pinned document fixture.');
    composerApi.listPinnedDocumentApprovals.mockResolvedValue([documentA]);
    render(<DashboardContent {...pageProps} />);
    const panel = await screen.findByRole('region', { name: '상단 고정 문서' });
    expect(within(panel).getByRole('button', { name: '문서 A' })).toBeInTheDocument();
    expect(
      within(panel).queryByRole('button', { name: '상단 고정 해제 문서 A' }),
    ).not.toBeInTheDocument();
    expect(composerApi.unpinDocumentApproval).not.toHaveBeenCalled();
  });

  it('shows the pinned panel in feed mode and highlights the pinned card icon', async () => {
    mockPaginatedDocumentLists();
    const documentA = defaultDocumentRecords[0];
    if (!documentA) throw new Error('Missing pinned document fixture.');
    composerApi.listPinnedDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) =>
        Promise.resolve([includeDetails ? toFeedRecord(documentA) : documentA]),
    );
    render(<DashboardContent {...pageProps} />);
    await screen.findByRole('region', { name: '상단 고정 문서' });
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    const feed = await screen.findByTestId('document-feed');
    const panel = screen.getByRole('region', { name: '상단 고정 문서' });
    expect(within(panel).getByRole('button', { name: '문서 A' })).toBeInTheDocument();
    expect(
      within(panel).queryByRole('button', { name: '상단 고정 해제 문서 A' }),
    ).not.toBeInTheDocument();
    const pinnedButton = within(feed).getByRole('button', {
      name: '상단 고정 해제 문서 A',
    });
    expect(within(pinnedButton).getByTestId('PushPinOutlinedIcon'))
      .toHaveClass('MuiSvgIcon-colorPrimary');
    const ordinaryButton = within(feed).getByRole('button', {
      name: '상단 고정 문서 B',
    });
    expect(within(ordinaryButton).getByTestId('PushPinOutlinedIcon'))
      .not.toHaveClass('MuiSvgIcon-colorPrimary');
  });

  it('keeps pinned documents in ordinary list rows without pin actions', async () => {
    mockPaginatedDocumentLists();
    const documentA = defaultDocumentRecords[0];
    if (!documentA) throw new Error('Missing pinned document fixture.');
    composerApi.listPinnedDocumentApprovals.mockResolvedValue([documentA]);
    render(<DashboardContent {...pageProps} />);
    const list = await screen.findByRole('region', { name: '리스트형 문서 목록' });
    expect(within(list).getAllByTestId('list-item-row')).toHaveLength(6);
    expect(within(list).getByRole('button', { name: /^문서 A/ })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: '상단 고정 문서' }))
      .getByRole('button', { name: '문서 A' })).toBeInTheDocument();
    expect(within(list).queryByRole('button', { name: /상단 고정/ })).toBeNull();
    expect(composerApi.pinDocumentApproval).not.toHaveBeenCalled();
    expect(composerApi.unpinDocumentApproval).not.toHaveBeenCalled();
  }, 20000);

  it('requires confirmation before pinning a feed document', async () => {
    mockPaginatedDocumentLists();
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    const pin = await screen.findByRole('button', {
      name: '상단 고정 문서 A',
    });

    fireEvent.click(pin);
    let dialog = await screen.findByRole('dialog', { name: '상단 고정' });
    expect(
      within(dialog).getByText('이 문서를 상단에 고정하시겠습니까?'),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    expect(composerApi.pinDocumentApproval).not.toHaveBeenCalled();
    await waitForElementToBeRemoved(dialog);

    fireEvent.click(pin);
    dialog = await screen.findByRole('dialog', { name: '상단 고정' });
    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    await waitFor(() =>
      expect(composerApi.pinDocumentApproval).toHaveBeenCalledTimes(1),
    );
    expect(composerApi.pinDocumentApproval).toHaveBeenCalledWith(1);
  }, 20000);

  it('reflects pinned state and confirms unpinning from its detail overlay', async () => {
    mockPaginatedDocumentLists();
    const documentA = defaultDocumentRecords[0];
    if (!documentA) throw new Error('Missing pinned document fixture.');
    composerApi.listPinnedDocumentApprovals.mockResolvedValue([documentA]);
    render(<DashboardContent {...pageProps} />);
    const pinnedRegion = await screen.findByRole('region', {
      name: '상단 고정 문서',
    });
    fireEvent.click(within(pinnedRegion).getByText('문서 A'));
    const overlay = await screen.findByTestId('page-area-overlay');
    const pin = await within(overlay).findByRole('button', {
      name: '상단 고정 해제 문서 A',
    });
    expect(within(pin).getByTestId('PushPinOutlinedIcon'))
      .toHaveClass('MuiSvgIcon-colorPrimary');

    fireEvent.click(pin);
    let dialog = await screen.findByRole('dialog', { name: '상단 고정 해제' });
    expect(
      within(dialog).getByText('이 문서의 상단 고정을 해제하시겠습니까?'),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    expect(composerApi.unpinDocumentApproval).not.toHaveBeenCalled();
    await waitForElementToBeRemoved(dialog);

    fireEvent.click(pin);
    dialog = await screen.findByRole('dialog', { name: '상단 고정 해제' });
    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    await waitFor(() =>
      expect(composerApi.unpinDocumentApproval).toHaveBeenCalledTimes(1),
    );
    expect(composerApi.unpinDocumentApproval).toHaveBeenCalledWith(1);
  }, 20000);

  it('shows a removable scope filter chip without leaving list mode', async () => {
    render(<DashboardContent {...pageProps} />);
    await screen.findByTestId('document-list');
    expect(
      screen.queryByRole('button', { name: '전체 조회' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^#/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /결재 진행 중/ }));
    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'IN_PROGRESS',
        undefined,
        undefined,
      ),
    );

    expect(await screen.findByText('#결재 진행 중')).toBeInTheDocument();
    const scopeChip = screen.getByRole('button', {
      name: '결재 범위 필터 결재 진행 중 취소',
    });
    expect(
      screen.getAllByRole('button', {
        name: '결재 범위 필터 결재 진행 중 취소',
      }),
    ).toHaveLength(1);
    fireEvent.keyUp(scopeChip, { key: 'Delete' });
    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'ALL',
        undefined,
        undefined,
      ),
    );
    expect(screen.queryByText('#결재 진행 중')).not.toBeInTheDocument();
    expect(screen.getByTestId('document-list')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '리스트형 보기' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.queryByRole('button', { name: '전체 조회' }),
    ).not.toBeInTheDocument();
  }, 20000);

  it('business contact confirms tab changes after edits made during a pending save', async () => {
    let finishSave: ((value: { electronicApprovalId: number; documentStatus: string }) => void) | undefined;
    composerApi.saveDocumentDraft.mockImplementationOnce(() => new Promise((resolve) => {
      finishSave = resolve;
    }));
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '저장 요청 제목' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByRole('tab', { name: '기안서' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '아직 저장되지 않은 제목' },
    });
    await act(async () => finishSave?.({ electronicApprovalId: 77, documentStatus: 'DRAFT' }));
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    expect(await screen.findByRole('dialog', { name: '문서 유형 변경' })).toBeInTheDocument();
  }, 20000);

  it('removes a scope filter chip without leaving feed mode', async () => {
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    await screen.findByTestId('document-feed');

    fireEvent.click(screen.getByRole('button', { name: /결재 진행 중/ }));
    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'IN_PROGRESS',
        undefined,
        undefined,
        true,
      ),
    );

    expect(await screen.findByText('#결재 진행 중')).toBeInTheDocument();
    fireEvent.click(
      within(
        screen.getByRole('button', {
          name: '결재 범위 필터 결재 진행 중 취소',
        }),
      ).getByTestId('filter-delete-icon-scope'),
    );
    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'ALL',
        undefined,
        undefined,
        true,
      ),
    );
    expect(screen.getByTestId('document-feed')).toBeInTheDocument();
    expect(screen.queryByTestId('document-list')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '피드형 보기' }),
    ).toHaveAttribute('aria-pressed', 'true');
  }, 20000);

  it('shows and removes the selected document kind filter chip', async () => {
    render(<DashboardContent {...pageProps} />);
    await screen.findByTestId('document-list');

    fireEvent.click(
      screen.getByRole('button', { name: '문서 업무구분 필터' }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: '기안서' }));
    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'ALL',
        'DRAFTING',
        undefined,
      ),
    );

    expect(await screen.findByText('#기안서')).toBeInTheDocument();
    fireEvent.click(
      within(
        screen.getByRole('button', {
          name: '업무구분 필터 기안서 취소',
        }),
      ).getByTestId('filter-delete-icon-kind'),
    );
    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'ALL',
        undefined,
        undefined,
      ),
    );
    expect(screen.queryByText('#기안서')).not.toBeInTheDocument();
    expect(screen.getByTestId('document-list')).toBeInTheDocument();
  }, 20000);

  it('uses the view-specific skeleton while the document list is loading', () => {
    composerApi.listDocumentApprovals.mockReturnValue(
      new Promise(() => undefined),
    );
    render(<DashboardContent {...pageProps} />);

    expect(screen.getByTestId('list-view-skeleton')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    expect(screen.getByTestId('feed-view-skeleton')).toBeInTheDocument();
    expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
      'ALL',
      undefined,
      undefined,
      true,
    );
    fireEvent.click(screen.getByRole('button', { name: '리스트형 보기' }));
    expect(screen.getByTestId('list-view-skeleton')).toBeInTheDocument();
    expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
      'ALL',
      undefined,
      undefined,
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('ignores a late feed response after switching back to the lightweight list', async () => {
    let resolveFeed!: (records: DocumentApprovalFeedRecord[]) => void;
    composerApi.listDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) =>
        includeDetails
          ? new Promise<DocumentApprovalFeedRecord[]>((resolve) => {
              resolveFeed = resolve;
            })
          : Promise.resolve(defaultDocumentRecords),
    );
    render(<DashboardContent {...pageProps} />);

    await screen.findByRole('region', { name: '리스트형 문서 목록' });
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    expect(screen.getByTestId('feed-view-skeleton')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '리스트형 보기' }));

    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    expect(within(listRegion).getByRole('button', { name: /문서 A/ })).toBeInTheDocument();

    await act(async () => {
      resolveFeed(
        defaultDocumentRecords.map((record) =>
          toFeedRecord(record, {
            contentsHtml: '<p>늦게 도착한 피드</p>',
          }),
        ),
      );
    });

    expect(screen.queryByTestId('document-feed')).not.toBeInTheDocument();
    expect(screen.getByTestId('document-list')).toBeInTheDocument();
    expect(screen.queryByText('늦게 도착한 피드')).not.toBeInTheDocument();
    expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
      'ALL',
      undefined,
      undefined,
    );
  });

  it('centers shared loading while an approval detail is pending', async () => {
    let resolveDetail!: (detail: {
      electronicApprovalId: number;
      eabusNo: string;
      documentType: string;
      documentStatus: string;
      title: string;
      drafterName: string;
      draftingWorkCategoryId: null;
      contentsJson: string;
      contentsHtml: string;
      approvalLines: never[];
      attachments: never[];
      systemEvents: never[];
    }) => void;
    composerApi.getDocumentApprovalDetail.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDetail = resolve;
        }),
    );
    render(<DashboardContent {...pageProps} />);

    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /문서 A/ }),
    );

    expect(
      await screen.findByRole('status', { name: '문서 상세 불러오는 중' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('post-detail-panel-content')).toHaveStyle({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });

    await act(async () => {
      resolveDetail({
        electronicApprovalId: 1,
        eabusNo: '001',
        documentType: 'DRAFTING',
        documentStatus: 'PENDING',
        title: '문서 A',
        drafterName: '김민수',
        draftingWorkCategoryId: null,
        contentsJson: '{"type":"doc","content":[]}',
        contentsHtml: '<p>로딩 완료 본문</p>',
        viewCount: 0,
        approvalLines: [],
        attachments: [],
        systemEvents: [],
      });
    });

    expect(await screen.findByText('로딩 완료 본문')).toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: '문서 상세 불러오는 중' }),
    ).not.toBeInTheDocument();
  });

  it('loads related approval documents and opens their detail from the list', async () => {
    render(<DashboardContent {...pageProps} />);

    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    const documentButton = await within(listRegion).findByRole('button', {
      name: /문서 A/,
    });
    expect(composerApi.listDocumentApprovals).toHaveBeenCalledWith('ALL', undefined, undefined);
    fireEvent.click(documentButton);

    expect(await screen.findByTestId('page-area-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('post-detail-panel')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '문서 상세' })).not.toBeInTheDocument();
    expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledWith(1);
    await waitFor(() =>
      expect(screen.getByTestId('approval-document-body')).toHaveTextContent('본문 내용'),
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }));
    await waitFor(() =>
      expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('region', { name: '리스트형 문서 목록' })).toBeInTheDocument();
    fireEvent.click(documentButton);
    await screen.findByTestId('post-detail-panel');
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument(),
    );
  });

  it.each(['panel', 'feed'] as const)('renders profile images and existing fallbacks in the %s presentation', async (presentation) => {
    const detail = toFeedRecord(defaultDocumentRecords[0]!, {
      drafterProfileImage: 'data:image/png;base64,drafter',
      approvalLines: [
        {
          electronicApprovalLineId: 72,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'AGREEMENT',
          participantUserId: 'reviewer',
          participantName: '합의자',
          participantProfileImage: 'data:image/png;base64,reviewer',
          actionStatus: 'PENDING',
        },
        {
          electronicApprovalLineId: 73,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'REFERENCE',
          participantUserId: 'reader',
          participantName: '참조자',
          participantProfileImage: null,
          actionStatus: 'WAITING',
        },
      ],
      comments: [{
        commentId: 1101,
        ownerId: 1,
        commentType: 'USER',
        writerId: 'commenter',
        writerName: '댓글 작성자',
        writerProfileImage: 'data:image/png;base64,commenter',
        content: '<p>프로필 댓글</p>',
      }],
      systemEvents: [{
        commentId: 1102, ownerId: 1, eventType: 'SUBMITTED',
        writerName: '시스템 처리자',
        writerProfileImage: 'data:image/png;base64,event-actor',
        content: '문서가 결재신청되었습니다.',
      }],
    });
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce(detail);
    composerApi.listApprovalComments.mockResolvedValueOnce({
      comments: detail.comments, systemEvents: detail.systemEvents, resultCnt: 2,
      hasPrevious: false, nextBeforeCommentId: null,
    });
    const sharedProps = {
      open: true, electronicApprovalId: 1, detailRefreshToken: 0,
      onActionComplete: vi.fn(), onEditDocument: vi.fn(),
    };
    render(presentation === 'panel'
      ? <DocumentApprovalDetailFeed {...sharedProps} onClose={vi.fn()} />
      : <DocumentApprovalDetailFeed {...sharedProps} presentation="feed"
          employeeId="emp-1"
          feedItem={{ id: 1, title: detail.title, author: detail.drafterName,
            kind: '기안서', status: '결재진행중', summary: '',
            date: '', feedData: detail }} />);

    expect(await screen.findByRole('img', { name: '김민수' }))
      .toHaveAttribute('src', 'data:image/png;base64,drafter');
    if (presentation === 'feed') {
      fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    }
    const agreement = screen.getByTestId('approval-line-agreement-avatar-72');
    fireEvent.error(within(agreement).getByRole('img', { name: '합의자' }));
    await waitFor(() => expect(agreement).toHaveTextContent('합'));
    expect(screen.getByTestId('approval-line-reference-avatar-73')).toHaveTextContent('참');
    expect(await screen.findByRole('img', { name: '댓글 작성자' }))
      .toHaveAttribute('src', 'data:image/png;base64,commenter');
    expect(await screen.findByRole('img', { name: '시스템 처리자' }))
      .toHaveAttribute('src', 'data:image/png;base64,event-actor');
    expect(screen.getByTestId('system-event-badge')).toHaveTextContent('결재신청');
    expect(screen.queryByRole('button', { name: '댓글 메뉴 시스템 처리자' }))
      .not.toBeInTheDocument();
  });

  it.each(['panel', 'feed'] as const)('formats legacy system reasons in the %s presentation', async (presentation) => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    const events = [
      { commentId: 101, ownerId: 1, commentType: 'SYSTEM' as const, eventType: 'RETURNED',
        writerName: '결재자', content: '문서 보완이 요청되었습니다. 사유: 첫 줄\n둘째 줄' },
      { commentId: 102, ownerId: 1, commentType: 'SYSTEM' as const, eventType: 'REJECTED',
        writerName: '결재자', content: '문서가 반려되었습니다. 사유: 첫 줄\n둘째 줄' },
    ];
    const detail = toFeedRecord(record, { systemEvents: events });
    if (presentation === 'panel') {
      composerApi.getDocumentApprovalDetail.mockResolvedValueOnce(detail);
      composerApi.listApprovalComments.mockResolvedValueOnce({
        comments: [], systemEvents: events, resultCnt: 2,
        hasPrevious: false, nextBeforeCommentId: null,
      });
    }
    const sharedProps = {
      open: true, electronicApprovalId: 1, detailRefreshToken: 0,
      onActionComplete: vi.fn(), onEditDocument: vi.fn(),
    };
    render(presentation === 'panel'
      ? <DocumentApprovalDetailFeed {...sharedProps} onClose={vi.fn()} />
      : <DocumentApprovalDetailFeed {...sharedProps} presentation="feed"
          employeeId="emp-1"
          feedItem={{ id: 1, title: detail.title, author: detail.drafterName,
            kind: '기안서', status: '결재진행중', summary: '',
            date: '', feedData: detail }} />);
    for (const prefix of ['문서 보완이 요청되었습니다.', '문서가 반려되었습니다.']) {
      const message = await screen.findByText((_, el) =>
        el?.textContent === `${prefix}\n사유: 첫 줄\n둘째 줄`);
      expect(message).toHaveStyle({ whiteSpace: 'pre-wrap' });
    }
  }, 20000);

  it('opens approval comment image previews in the existing image viewer', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    const imageUrl = 'blob:approval-comment-image';
    vi.mocked(URL.createObjectURL).mockReturnValue(imageUrl);
    const detail = toFeedRecord(record, {
      comments: [
        {
          commentId: 1101,
          ownerId: 1,
          content: '<p>댓글 이미지</p>',
          commentType: 'USER',
          writerId: 'commenter',
          writerName: '댓글 작성자',
          attachments: [
            {
              fileId: 91,
              fileName: 'photo.png',
              fileSize: 123,
              mimeType: 'image/png',
            },
          ],
        },
      ],
    });

    render(
      <DocumentApprovalDetailFeed
        open
        electronicApprovalId={1}
        detailRefreshToken={0}
        onActionComplete={vi.fn()}
        onEditDocument={vi.fn()}
        presentation="feed"
        employeeId="emp-1"
        feedItem={{
          id: 1,
          title: detail.title,
          author: detail.drafterName,
          kind: '기안서',
          status: '결재진행중',
          summary: '',
          date: '',
          feedData: detail,
        }}
      />,
    );

    const preview = await screen.findByRole('button', {
      name: '댓글 이미지 미리보기 1: photo.png',
    });
    fireEvent.click(preview);

    const viewer = screen.getByRole('dialog');
    expect(within(viewer).getByRole('img', { name: 'photo.png' })).toHaveAttribute(
      'src',
      imageUrl,
    );
    expect(composerApi.fetchApprovalCommentAttachmentBlob).toHaveBeenCalledWith(
      1,
      1101,
      91,
    );
  });

  it('reports approval comment image preview failures without hiding the file', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    composerApi.fetchApprovalCommentAttachmentBlob.mockRejectedValueOnce(
      new Error('image request failed'),
    );
    const detail = toFeedRecord(record, {
      comments: [
        {
          commentId: 1102,
          ownerId: 1,
          content: '<p>댓글 이미지</p>',
          commentType: 'USER',
          writerId: 'commenter',
          writerName: '댓글 작성자',
          attachments: [
            {
              fileId: 92,
              fileName: 'failed.png',
              fileSize: 123,
              mimeType: 'image/png',
            },
          ],
        },
      ],
    });

    render(
      <DocumentApprovalDetailFeed
        open
        electronicApprovalId={1}
        detailRefreshToken={0}
        onActionComplete={vi.fn()}
        onEditDocument={vi.fn()}
        presentation="feed"
        employeeId="emp-1"
        feedItem={{
          id: 1,
          title: detail.title,
          author: detail.drafterName,
          kind: '기안서',
          status: '결재진행중',
          summary: '',
          date: '',
          feedData: detail,
        }}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이미지 미리보기를 불러오지 못했습니다.',
    );
    expect(screen.getByText('failed.png')).toBeInTheDocument();
  });

  it('shows rejection and revision reasons only in dismissible message popovers', async () => {
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'REJECTED',
      title: '문서 A',
      drafterName: '김민수',
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문 내용</p>',
      approvalLines: [
        {
          electronicApprovalLineId: 81,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'reviewer-1',
          participantName: '결재자',
          actionStatus: 'REJECTED',
          actionComment: '결재 내용을 확인해 주세요',
        },
        {
          electronicApprovalLineId: 82,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'reviewer-2',
          participantName: '다른 결재자',
          actionStatus: 'REJECTED',
          actionComment: '첨부 내역을 확인해 주세요',
        },
        ...[null, '', '   '].map((actionComment, index) => ({
          electronicApprovalLineId: 83 + index,
          stageOrder: 3 + index,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: `empty-reviewer-${index}`,
          participantName: `사유 없는 결재자 ${index}`,
          actionStatus: 'REJECTED',
          actionComment,
        })),
        {
          electronicApprovalLineId: 86,
          stageOrder: 6,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'reviewer-3',
          participantName: '보완 결재자',
          actionStatus: 'RETURNED',
          actionComment: '보완 의견 첫 줄\n둘째 줄\n\n마지막 줄',
        },
        ...[null, '', '   '].map((actionComment, index) => ({
          electronicApprovalLineId: 87 + index,
          stageOrder: 7 + index,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: `empty-revision-${index}`,
          participantName: `사유 없는 보완자 ${index}`,
          actionStatus: 'RETURNED',
          actionComment,
        })),
        {
          electronicApprovalLineId: 90,
          stageOrder: 10,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approved-reviewer',
          participantName: '승인자',
          actionStatus: 'APPROVED',
          actionComment: '승인 의견 유지',
        },
      ],
      attachments: [],
      systemEvents: [],
    });
    render(<DocumentApprovalDetailFeed
      open electronicApprovalId={1} detailRefreshToken={0}
      onClose={vi.fn()} onActionComplete={vi.fn()} onEditDocument={vi.fn()}
    />);
    const group = await screen.findByTestId('approval-line-group-approval');
    const message = within(group).getByRole('button', {
      name: '결재자 반려 사유 보기', exact: true,
    });
    expect(within(group).getAllByRole('button')).toHaveLength(3);
    expect(screen.queryByText('결재 내용을 확인해 주세요')).not.toBeInTheDocument();
    expect(group).not.toHaveTextContent('보완 의견 첫 줄');
    expect(group).toHaveTextContent('승인 의견 유지');
    const revisionSeal = screen.getByTestId('approval-line-status-seal-86');
    expect(revisionSeal.textContent).toBe('보완\n요청');
    expect(revisionSeal).toHaveStyle({ whiteSpace: 'pre-line', textAlign: 'center' });
    expect(revisionSeal).toHaveAccessibleName('결재 상태 보완요청');

    fireEvent.click(message);
    let popover = await screen.findByRole('dialog', { name: '반려 사유' });
    expect(popover).toHaveTextContent('결재 내용을 확인해 주세요');
    expect(popover).not.toHaveTextContent('첨부 내역을 확인해 주세요');
    fireEvent.keyDown(popover, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '반려 사유' }))
      .not.toBeInTheDocument());
    expect(screen.getByTestId('post-detail-panel')).toBeInTheDocument();

    fireEvent.click(within(group).getByRole('button', {
      name: '다른 결재자 반려 사유 보기',
    }));
    popover = await screen.findByRole('dialog', { name: '반려 사유' });
    expect(popover).toHaveTextContent('첨부 내역을 확인해 주세요');
    const backdrop = popover.closest('.MuiPopover-root')?.querySelector('.MuiBackdrop-root');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '반려 사유' }))
      .not.toBeInTheDocument());
    fireEvent.click(within(group).getByRole('button', { name: '보완 결재자 보완요청 사유 보기' }));
    popover = await screen.findByRole('dialog', { name: '보완요청 사유' });
    const reason = within(popover).getByText((_, el) =>
      el?.textContent === '보완 의견 첫 줄\n둘째 줄\n\n마지막 줄');
    expect(reason).toHaveStyle({ whiteSpace: 'pre-wrap' });
    expect(popover).not.toHaveTextContent('결재 내용을 확인해 주세요');
    fireEvent.keyDown(popover, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '보완요청 사유' })).not.toBeInTheDocument());
  }, 20000);

  it('matches a pending approval seal to its participant border color', async () => {
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'IN_PROGRESS',
      title: '문서 A',
      drafterName: '김민수',
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문 내용</p>',
      approvalLines: [
        {
          electronicApprovalLineId: 74,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approver-4',
          participantName: '결재자 D',
          actionStatus: 'PENDING',
        },
      ],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

    const currentParticipant = await screen.findByTestId('approval-line-participant-74');
    const currentSeal = screen.getByTestId('approval-line-status-seal-74');
    expect(currentParticipant).toHaveStyle({
      borderColor: muiTheme.palette.info.main,
    });
    expect(currentSeal).toHaveStyle({
      borderColor: muiTheme.palette.info.main,
      color: muiTheme.palette.info.main,
    });
    expect(getComputedStyle(currentSeal).borderColor).toBe(
      getComputedStyle(currentParticipant).borderColor,
    );
  });

  it('renders read-only system events and keeps only the required detail separators', async () => {
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      title: '문서 A',
      drafterName: '김민수',
      createdAt: '2026-10-12T09:00:00Z',
      updatedAt: '2026-10-15T11:00:00Z',
      submittedAt: null,
      viewCount: 7,
      draftingWorkCategoryId: null,
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문 내용</p>',
      approvalLines: [
        {
          electronicApprovalLineId: 71,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approver-1',
          participantName: '결재자 A',
          participantDepartmentName: '기획팀',
          actionStatus: 'WAITING',
        },
        {
          electronicApprovalLineId: 75,
          stageOrder: 3,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approver-3',
          participantName: '결재자 C',
          participantDepartmentName: '운영팀',
          actionStatus: 'APPROVED',
          participantStampImage: 'data:image/png;base64,AA==',
        },
        {
          electronicApprovalLineId: 74,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approver-4',
          participantName: '결재자 D 아주 긴 이름을 가운데 정렬하고 말줄임 처리해야 합니다',
          participantDepartmentName: '인사팀',
          actionStatus: 'PENDING',
          participantStampImage: 'data:image/png;base64,AA==',
        },
        {
          electronicApprovalLineId: 72,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'AGREEMENT',
          participantUserId: 'approver-2',
          participantName: '합의자 B',
          participantDepartmentName: null,
          actionStatus: 'PENDING',
          participantProfileImage: 'data:image/png;base64,AA==',
        },
        {
          electronicApprovalLineId: 76,
          stageOrder: 2,
          participantOrder: 2,
          participantType: 'AGREEMENT',
          participantUserId: 'approver-5',
          participantName: '합의자 D',
          participantDepartmentName: '재무팀',
          actionStatus: 'APPROVED',
          participantProfileImage: 'data:image/png;base64,AA==',
        },
        {
          electronicApprovalLineId: 77,
          stageOrder: 2,
          participantOrder: 3,
          participantType: 'AGREEMENT',
          participantUserId: 'approver-6',
          participantName: '합의자 E',
          participantDepartmentName: '',
          actionStatus: 'APPROVED',
          participantProfileImage: 'data:image/png;base64,AA==',
        },
        {
          electronicApprovalLineId: 73,
          stageOrder: 3,
          participantOrder: 1,
          participantType: 'REFERENCE',
          participantUserId: 'approver-3',
          participantName: '참조자 C',
          participantDepartmentName: '운영팀',
          actionStatus: '',
          participantProfileImage: 'data:image/png;base64,AA==',
        },
        {
          electronicApprovalLineId: 78,
          stageOrder: 3,
          participantOrder: 2,
          participantType: 'REFERENCE',
          participantUserId: 'approver-7',
          participantName: '참조자 공백부서',
          participantDepartmentName: '   ',
          actionStatus: '',
          participantProfileImage: 'data:image/png;base64,AA==',
        },
      ],
      attachments: [],
      systemEvents: [{
        eventType: 'SUBMITTED',
        content: '문서가 결재신청되었습니다.',
        writerName: '김민수',
        createdAt: '2026-10-12T09:00:00Z',
      }],
    });
    composerApi.listApprovalComments.mockResolvedValueOnce({
      comments: [{
        commentId: 31,
        ownerId: 1,
        parentCommentId: null,
        content: '<p>검토 의견입니다.</p>',
        commentType: 'USER',
        writerId: 'writer-1',
        writerName: '박서준',
        createdAt: '2026-10-12T10:00:00Z',
        attachments: [],
      }],
      systemEvents: [{
        commentId: 30,
        ownerId: 1,
        commentType: 'SYSTEM',
        eventType: 'SUBMITTED',
        content: '문서가 결재신청되었습니다.',
        writerName: '김민수',
        createdAt: '2026-10-12T09:00:00Z',
      }],
      hasPrevious: false,
      nextBeforeCommentId: null,
      resultCnt: 2,
    });
    const imagePreloaders: HTMLImageElement[] = [];
    const imagePreloaderSpy = vi.spyOn(window, 'Image').mockImplementation(function MockImage(
      width,
      height,
    ) {
      const image = document.createElement('img');
      if (width !== undefined) image.width = width;
      if (height !== undefined) image.height = height;
      imagePreloaders.push(image);
      return image;
    });
    restoreImagePreloader = () => imagePreloaderSpy.mockRestore();
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

    await waitFor(() => {
      expect(screen.getByTestId('post-detail-panel')).toHaveTextContent('검토 의견입니다.');
      expect(screen.getByTestId('post-detail-panel')).toHaveTextContent('문서가 결재신청되었습니다.');
    });
    expect(screen.getByTestId('system-event-badge')).toHaveTextContent('결재신청');
    expect(screen.getByTestId('system-event-badge')).toHaveClass('MuiChip-colorInfo');
    expect(screen.queryByRole('img', { name: '시스템 메시지' })).not.toBeInTheDocument();
    const approvalLine = screen.getByTestId('approval-line-readonly');
    const authorRow = screen.getByTestId('approval-author-row');
    expect(authorRow).toBeInTheDocument();
    expect(within(authorRow).getByText('김민수')).toBeInTheDocument();
    expect(within(authorRow).getByText('결재진행중')).toBeInTheDocument();
    expect(within(authorRow).getByText('기안', { exact: true })).toBeInTheDocument();
    expect(screen.getByTestId('approval-author-meta')).toHaveTextContent(
      '기안자 · 2026.10.15 · 조회 7',
    );
    expect(
      getComputedStyle(screen.getByTestId('approval-author-meta')).whiteSpace,
    ).not.toBe('nowrap');
    expect(screen.getByTestId('approval-line-drafter-meta')).toHaveTextContent(
      '기안자 김민수 · 2026.10.15',
    );
    expect(screen.getByTestId('approval-line-header-title'))
      .toHaveClass('MuiTypography-body1');
    expect(screen.getByTestId('approval-line-drafter-meta'))
      .toHaveClass('MuiTypography-body1');
    expect(screen.getByTestId('approval-line-header')).toHaveTextContent('결재선');
    expect(
      within(screen.getByTestId('approval-line-header')).queryByText('결재', { exact: true }),
    ).not.toBeInTheDocument();
    expect(within(screen.getByTestId('approval-line-group-approval')).queryByRole('button'))
      .not.toBeInTheDocument();
    expect(screen.getByTestId('approval-line-group-approval')).toHaveTextContent('결재자 A');
    expect(screen.getByTestId('approval-line-group-agreement')).toHaveTextContent(
      '합의',
    );
    expect(
      within(screen.getByTestId('approval-line-group-agreement')).getAllByText('2', { exact: true }),
    ).toHaveLength(1);
    const agreementStage = screen.getByTestId('approval-line-agreement-stage-2');
    const agreementParticipants = within(agreementStage).getAllByTestId(
      /^approval-line-agreement-participant-/,
    );
    expect(agreementParticipants).toHaveLength(3);
    const agreementStageRow = screen.getByTestId('approval-line-agreement-stage-row-2');
    const agreementStageOrder = within(agreementStageRow).getByTestId(
      'approval-line-agreement-stage-order',
    );
    const agreementSequenceBadge = within(agreementStageRow).getByLabelText(
      /^합의 순번 /,
    );
    expect(agreementSequenceBadge).toHaveStyle({
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
    });
    expect(agreementStageOrder.parentElement).toBe(agreementStageRow);
    expect(
      within(agreementStageRow).getByTestId('approval-line-agreement-participants').parentElement,
    ).toBe(agreementStageRow);
    expect(agreementParticipants.map((participant) => participant.textContent)).toEqual([
      expect.stringContaining('합의자 B'),
      expect.stringContaining('합의자 D'),
      expect.stringContaining('합의자 E'),
    ]);
    expect(agreementParticipants[0]).toHaveStyle({
      flexDirection: 'row',
      borderRadius: '10px',
    });
    expect(agreementStage).toHaveTextContent('재무팀');
    expect(screen.getByTestId('approval-line-agreement-participant-76')
      .querySelectorAll('.MuiTypography-body1').length)
      .toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('approval-line-agreement-status-72')).toHaveTextContent('처리 중');
    expect(screen.getByTestId('approval-line-agreement-status-76')).toHaveTextContent('승인');
    expect(screen.getByTestId('approval-line-agreement-status-72'))
      .toHaveStyle({ borderRadius: '99px' });
    const agreementWithoutDepartment = screen.getByTestId(
      'approval-line-agreement-participant-72',
    );
    const agreementWithEmptyDepartment = screen.getByTestId(
      'approval-line-agreement-participant-77',
    );
    for (const [lineId, participant] of [
      ['72', agreementWithoutDepartment],
      ['77', agreementWithEmptyDepartment],
    ]) {
      const department = within(participant).getByTestId(
        `approval-line-agreement-department-${lineId}`,
      );
      const status = screen.getByTestId(`approval-line-agreement-status-${lineId}`);
      expect(department).toHaveTextContent('부서없음');
      expect(
        within(participant).getByText(/합의자 [BE]/).parentElement,
      ).not.toBe(department.parentElement);
      expect(department.parentElement).toBe(status.parentElement);
      expect(participant).toHaveStyle({ alignItems: 'center' });
    }
    expect(screen.getByTestId('approval-line-agreement-participants'))
      .toHaveStyle({ flexWrap: 'wrap' });
    expect(screen.getByTestId('approval-line-group-reference')).toHaveTextContent(
      '참조',
    );
    expect(
      within(screen.getByTestId('approval-line-group-reference'))
        .queryByTestId(/^approval-line-reference-sequence-/),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('approval-line-group-reference')).toHaveTextContent('참조자 C');
    expect(screen.getByTestId('approval-line-group-reference')).toHaveTextContent('운영팀');
    const referenceParticipant = screen.getByTestId('approval-line-reference-participant-73');
    expect(
      within(referenceParticipant).getByTestId('approval-line-reference-department-73'),
    ).toHaveTextContent('운영팀');
    const referenceWithoutDepartment = screen.getByTestId(
      'approval-line-reference-participant-78',
    );
    expect(
      within(referenceWithoutDepartment).getByTestId(
        'approval-line-reference-department-78',
      ),
    ).toHaveTextContent('부서없음');
    expect(referenceWithoutDepartment).toHaveTextContent('참조자 공백부서');
    expect(
      within(referenceWithoutDepartment).getByTestId(
        'approval-line-reference-avatar-78',
      ),
    ).toBeInTheDocument();
    expect(referenceWithoutDepartment).toHaveStyle({ alignItems: 'center' });
    const participantCards = [
      screen.getByTestId('approval-line-agreement-participant-72'),
      screen.getByTestId('approval-line-reference-participant-73'),
    ];
    for (const card of participantCards) {
      expect(card).toHaveStyle({
        flex: '1 1 240px',
        minWidth: 'min(100%, 190px)',
        maxWidth: '100%',
        height: '56px',
        boxSizing: 'border-box',
        paddingTop: '6px',
        paddingBottom: '6px',
      });
    }
    expect(screen.getByTestId('approval-line-agreement-avatar-72'))
      .toHaveStyle({ width: '32px', height: '32px' });
    expect(screen.getByTestId('approval-line-reference-avatar-73'))
      .toHaveStyle({ width: '32px', height: '32px' });
    expect(
      within(screen.getByTestId('approval-line-participant-71')).getByTitle('결재자 A'),
    ).toHaveStyle({ fontSize: '14px' });
    expect(
      within(screen.getByTestId('approval-line-agreement-participant-72')).getByTitle('합의자 B'),
    ).toHaveStyle({ fontSize: '14px' });
    expect(
      within(screen.getByTestId('approval-line-reference-participant-73')).getByTitle('참조자 C'),
    ).toHaveStyle({ fontSize: '14px' });
    expect(
      screen.getByTestId('approval-line-agreement-department-72'),
    ).toHaveStyle({ fontSize: '14px', lineHeight: '18px' });
    expect(
      screen.getByTestId('approval-line-reference-department-73'),
    ).toHaveStyle({ fontSize: '14px', lineHeight: '18px' });
    expect(screen.getByTestId('approval-line-agreement-status-72'))
      .toHaveStyle({ fontSize: '14px', lineHeight: '18px' });
    const agreementLayoutGroup = screen.getByTestId('approval-line-group-agreement');
    const referenceLayoutGroup = screen.getByTestId('approval-line-group-reference');
    const agreementContent = within(agreementLayoutGroup).getByTestId(
      'approval-line-agreement-content',
    );
    const referenceContent = within(referenceLayoutGroup).getByTestId(
      'approval-line-reference-participants',
    );
    expect(agreementLayoutGroup.children).toHaveLength(2);
    expect(agreementLayoutGroup.children[0]).toHaveTextContent('합의');
    expect(agreementLayoutGroup.children[1]).toBe(agreementContent);
    expect(referenceLayoutGroup.children).toHaveLength(2);
    expect(referenceLayoutGroup.children[0]).toHaveTextContent('참조');
    expect(referenceLayoutGroup.children[1]).toBe(referenceContent);
    for (const row of [agreementLayoutGroup, referenceLayoutGroup]) {
      expect(row).toHaveStyle({
        display: 'grid',
        gridTemplateColumns: '64px minmax(0, 1fr)',
        minHeight: '72px',
      });
    }
    expect(screen.getByTestId('approval-line-group-agreement').querySelector('.MuiChip-root')).toBeNull();
    expect(screen.getByTestId('approval-line-group-reference').querySelector('.MuiChip-root')).toBeNull();
    const approvalParticipants = within(
      screen.getByTestId('approval-line-group-approval'),
    ).getAllByTestId(/^approval-line-participant-/);
    expect(approvalParticipants.map((participant) => participant.textContent)).toEqual([
      expect.stringContaining('결재자 A'),
      expect.stringContaining('결재자 D'),
      expect.stringContaining('결재자 C'),
    ]);
    expect(
      within(screen.getByTestId('approval-line-group-approval')).getAllByTestId(
        'approval-line-connector',
      ),
    ).toHaveLength(2);
    expect(screen.getByTestId('approval-line-participant-71')).toHaveAttribute(
      'data-status-tone',
      'neutral',
    );
    expect(screen.getByTestId('approval-line-participant-74')).toHaveAttribute(
      'data-status-tone',
      'primary',
    );
    expect(screen.getByTestId('approval-line-participant-74')).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByTestId('approval-line-participant-75')).toHaveAttribute(
      'data-status-tone',
      'success',
    );
    expect(screen.getByTestId('approval-line-participant-75')).not.toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByTestId('approval-line-status-seal-71')).toHaveTextContent('대기');
    expect(screen.getByTestId('approval-line-status-seal-71')).toHaveAttribute(
      'data-status-tone',
      'neutral',
    );
    expect(screen.getByTestId('approval-line-status-seal-74')).toHaveTextContent('진행');
    expect(screen.getByTestId('approval-line-status-seal-74')).toHaveAttribute(
      'data-status-tone',
      'primary',
    );
    expect(screen.getByTestId('approval-line-status-seal-74')).toHaveAttribute(
      'aria-label',
      '결재 상태 처리 중',
    );
    expect(screen.getByTestId('approval-line-status-seal-75')).toHaveAttribute(
      'aria-label',
      '결재 상태 승인',
    );
    expect(screen.getByTestId('approval-line-status-seal-75')).toHaveAttribute(
      'data-status-tone',
      'success',
    );
    expect(screen.getByTestId('approval-line-status-seal-75').querySelector('img'))
      .toHaveAttribute('src', 'data:image/png;base64,AA==');
    expect(screen.getByTestId('approval-line-status-seal-74').querySelector('img'))
      .toBeNull();
    const agreementAvatar = screen.getByTestId('approval-line-agreement-avatar-72');
    expect(agreementAvatar.querySelector('img'))
      .toHaveAttribute('src', 'data:image/png;base64,AA==');
    const referenceAvatar = screen.getByTestId('approval-line-reference-avatar-73');
    expect(referenceAvatar.querySelector('img'))
      .toHaveAttribute('src', 'data:image/png;base64,AA==');
    await waitFor(() => {
      expect(imagePreloaders.length).toBeGreaterThan(0);
    });
    act(() => {
      imagePreloaders.forEach((image) => image.onerror?.(new Event('error')));
    });
    expect(screen.getByTestId('approval-line-status-seal-75')).toHaveTextContent('승인');
    expect(agreementAvatar.querySelector('img')).toBeNull();
    expect(agreementAvatar).toHaveTextContent('합');
    expect(referenceAvatar.querySelector('img')).toBeNull();
    expect(referenceAvatar).toHaveTextContent('참');
    const centeredStage = screen.getByTestId('approval-line-sequence-74');
    const approvalSequenceBadge = within(centeredStage).getByLabelText(
      /^결재선 순번 /,
    );
    expect(approvalSequenceBadge).toHaveStyle({
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
    });
    expect(centeredStage).toHaveStyle({ justifyContent: 'center' });
    expect(within(centeredStage).getByText(
      '결재자 D 아주 긴 이름을 가운데 정렬하고 말줄임 처리해야 합니다',
    )).toHaveAttribute(
      'title',
      '결재자 D 아주 긴 이름을 가운데 정렬하고 말줄임 처리해야 합니다',
    );
    expect(screen.getByTestId('approval-line-inner-divider')).toBeInTheDocument();
    expect(screen.queryByTestId('approval-line-chip-agreement-72')).not.toBeInTheDocument();
    expect(screen.queryByTestId('approval-line-chip-reference-73')).not.toBeInTheDocument();
    expect(screen.getByTestId('approval-line-divider')).toBeInTheDocument();
    expect(approvalLine.nextElementSibling).toBe(
      screen.getByTestId('approval-line-divider'),
    );
    expect(screen.getByTestId('approval-line-participant-71')).toHaveStyle({
      gridTemplateRows: '32px 64px 32px',
    });
    expect(screen.getByTestId('feed-reaction-bar')).toBeInTheDocument();
    expect(screen.getByTestId('feed-comments-section')).toBeInTheDocument();
    const detailCard = screen.getByTestId('approval-detail-card');
    expect(
      within(detailCard)
        .getAllByRole('separator')
        .filter(
          (separator) =>
            !separator.closest('[data-testid="document-approval-toolbar"]'),
        ),
    ).toHaveLength(3);
    const footer = screen.getByTestId('approval-feed-footer');
    const reactionBar = screen.getByTestId('feed-reaction-bar');
    const commentsSection = screen.getByTestId('feed-comments-section');
    expect(reactionBar.parentElement).toBe(footer);
    expect(commentsSection.parentElement).toBe(footer);
    expect(parseFloat(getComputedStyle(reactionBar).marginTop)).toBe(0);
    expect(parseFloat(getComputedStyle(commentsSection).marginTop)).toBe(0);
    expect(
      reactionBar.nextElementSibling,
    ).toBe(commentsSection);
    expect(screen.queryByText('첨부파일', { exact: true })).not.toBeInTheDocument();
    expect(composerApi.listApprovalComments).toHaveBeenCalledWith(1, {
      limit: 3,
      beforeCommentId: undefined,
    });
  });

  it('shows the document number beneath the approval detail title', async () => {
    render(
      <ThemeProvider theme={muiTheme}>
        <DocumentApprovalDetailFeed
          open
          presentation="panel"
          electronicApprovalId={1}
          onActionComplete={() => undefined}
          onEditDocument={() => undefined}
          onClose={() => undefined}
          detailRefreshToken={0}
        />
      </ThemeProvider>,
    );

    expect(
      await screen.findByText('문서번호: EA-20261012-0001'),
    ).toBeInTheDocument();
  });

  it('opens approval detail with the body expanded', async () => {
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      documentNo: 'EA-20261012-0001',
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      title: '문서 A',
      drafterName: '김민수',
      draftingWorkCategoryId: null,
      viewCount: 0,
      summary: '짧은 요약',
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: `<p>${'긴 본문 내용입니다. '.repeat(100)}</p>`,
      approvalLines: [],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

    const detailCard = await screen.findByTestId('approval-detail-card');
    expect(detailCard).toBeVisible();
    expect(screen.getByText('문서번호: EA-20261012-0001')).toBeInTheDocument();
    expect(detailCard).toHaveClass('MuiStack-root');
    const body = screen.getByTestId('approval-document-body');
    expect(body).toHaveAttribute('data-expanded', 'true');
    const collapseButton = screen.getByRole('button', { name: '접기' });
    expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(collapseButton);
    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument();
    expect(body).toHaveAttribute('data-expanded', 'false');
    expect(screen.queryByTestId('approval-line-readonly')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(screen.getByTestId('approval-line-readonly')).toBeInTheDocument();
  });

  it('hides the empty comment message while keeping the comment composer available', async () => {
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

    expect(
      await screen.findByRole('textbox', { name: '댓글 입력' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('등록된 댓글이 없습니다.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '등록' })).toBeInTheDocument();
  });

  it('lets the drafter cancel a pending submission after confirmation', async () => {
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      title: '문서 A',
      drafterName: '홍길동',
      isDrafter: true,
      viewCount: 0,
      draftingWorkCategoryId: null,
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문 내용</p>',
      summary: '본문 내용',
      approvalLines: [
        {
          electronicApprovalLineId: 11,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'APPROVED',
          actionAt: '2026-10-13T09:00:00Z',
        },
      ],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

    expect(screen.queryByRole('button', { name: '승인 취소' })).not.toBeInTheDocument();
    composerApi.cancelDocumentSubmission.mockRejectedValueOnce(
      new Error('문서 상태가 변경되어 취소할 수 없습니다.'),
    );
    const cancelSubmissionButton = await screen.findByRole('button', {
      name: '상신 취소',
    });
    const commentSubmitButton = within(
      screen.getByTestId('post-detail-panel'),
    ).getByRole('button', { name: '등록' });
    expect(getButtonGeometry(cancelSubmissionButton)).toEqual(
      getButtonGeometry(commentSubmitButton),
    );
    expect(cancelSubmissionButton).toHaveClass(
      'MuiButton-contained',
      'MuiButton-colorError',
    );
    fireEvent.click(cancelSubmissionButton);
    expect(
      await screen.findByRole('dialog', { name: '결재신청 취소' }),
    ).toHaveTextContent('임시저장 상태로 되돌립니다.');
    fireEvent.click(screen.getByRole('button', { name: '상신 취소 확인' }));

    expect(
      await screen.findByText('문서 상태가 변경되어 취소할 수 없습니다.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '상신 취소 확인' }));
    await waitFor(() => {
      expect(composerApi.cancelDocumentSubmission).toHaveBeenCalledTimes(2);
    });
    expect(composerNotifications.showSuccess).toHaveBeenCalledWith(
      '결재신청이 취소되었습니다.',
    );
  });

  it('lets an approver cancel their own approval only before a later stage acts', async () => {
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'IN_PROGRESS',
      title: '문서 A',
      drafterName: '김민수',
      isDrafter: false,
      viewCount: 0,
      draftingWorkCategoryId: null,
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문 내용</p>',
      summary: '본문 내용',
      approvalLines: [
        {
          electronicApprovalLineId: 12,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'APPROVED',
          actionAt: '2026-10-13T09:00:00Z',
        },
        {
          electronicApprovalLineId: 13,
          stageOrder: 3,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-2',
          participantName: '김민수',
          actionStatus: 'PENDING',
        },
      ],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

    const cancelApprovalButton = await screen.findByRole('button', {
      name: '승인 취소',
    });
    const commentSubmitButton = within(
      screen.getByTestId('post-detail-panel'),
    ).getByRole('button', { name: '등록' });
    expect(getButtonGeometry(cancelApprovalButton)).toEqual(
      getButtonGeometry(commentSubmitButton),
    );
    expect(cancelApprovalButton).toHaveClass(
      'MuiButton-contained',
      'MuiButton-colorError',
    );
    fireEvent.click(cancelApprovalButton);
    fireEvent.click(screen.getByRole('button', { name: '승인 취소 확인' }));

    await waitFor(() => {
      expect(composerApi.cancelDocumentApproval).toHaveBeenCalledWith(1);
    });
    expect(composerNotifications.showSuccess).toHaveBeenCalledWith(
      '승인이 취소되었습니다.',
    );
  });

  it('does not offer approval cancellation after the final approval completes the document', async () => {
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'COMPLETED',
      title: '문서 A',
      drafterName: '김민수',
      isDrafter: false,
      viewCount: 0,
      draftingWorkCategoryId: null,
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문 내용</p>',
      summary: '본문 내용',
      approvalLines: [
        {
          electronicApprovalLineId: 14,
          stageOrder: 4,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'APPROVED',
          actionAt: '2026-10-13T09:00:00Z',
        },
      ],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));
    await screen.findByTestId('approval-detail-card');

    expect(screen.queryByRole('button', { name: '승인 취소' })).not.toBeInTheDocument();
  });

  it('shows embedded document images as clickable previews', async () => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:approval-image-preview'),
      revokeObjectURL: vi.fn(),
    });
    try {
      composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
        electronicApprovalId: 1,
        eabusNo: '001',
        documentType: 'DRAFTING',
        documentStatus: 'PENDING',
        title: '문서 A',
        drafterName: '김민수',
        draftingWorkCategoryId: null,
        viewCount: 0,
        summary: '이미지 포함',
        contentsJson: '{"type":"doc","content":[]}',
        contentsHtml:
          '<p>이미지</p><img src="/api/v1/groupware/approvals/1/embedded-images/51" alt="영수증" />',
        approvalLines: [],
        attachments: [],
        systemEvents: [],
      });
      render(<DashboardContent {...pageProps} />);
      const listRegion = await screen.findByRole('region', {
        name: '리스트형 문서 목록',
      });
      fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

      await waitFor(() =>
        expect(composerApi.fetchApprovalEmbeddedImageBlob).toHaveBeenCalledWith(1, 51),
      );
      const body = screen.getByTestId('approval-document-body');
      expect(body).toHaveAttribute('data-expanded', 'true');
      await waitFor(() =>
        expect(body.querySelector('img')).toHaveAttribute(
          'src',
          'blob:approval-image-preview',
        ),
      );
      expect(screen.queryByTestId('feed-body-image-previews')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '접기' }));
      const preview = await screen.findByRole('button', {
        name: '본문 이미지 미리보기 1: 영수증',
      });
      expect(preview.querySelector('img')).toHaveAttribute('alt', '영수증');
      expect(screen.queryByText(/\[본문 이미지/)).not.toBeInTheDocument();
      expect(screen.queryByText('본문 이미지', { exact: true })).not.toBeInTheDocument();
      fireEvent.click(preview);
      expect(await screen.findByRole('dialog', { name: '이미지 보기' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '이미지 뷰어 닫기' }));
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: '이미지 보기' })).not.toBeInTheDocument(),
      );
      fireEvent.click(screen.getByRole('button', { name: '더보기' }));
      await waitFor(() => {
        expect(screen.getByTestId('approval-document-body').querySelector('img')).toHaveAttribute(
          'src',
          'blob:approval-image-preview',
        );
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('posts a new comment through the approval API without reloading the first page', async () => {
    const createdComment = {
      commentId: 32,
      ownerId: 1,
      parentCommentId: null,
      content: '<p>새 검토 의견</p>',
      commentType: 'USER',
      writerId: 'writer-1',
      writerName: '박서준',
      createdAt: '2026-10-12T10:00:00Z',
      attachments: [],
    };
    composerApi.createApprovalComment.mockResolvedValueOnce(createdComment);
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));
    const editor = await screen.findByRole('textbox', { name: '댓글 입력' });
    fireEvent.input(editor, { target: { innerHTML: '<p>새 검토 의견</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => {
      expect(composerApi.createApprovalComment).toHaveBeenCalledWith(
        1,
        '<p>새 검토 의견</p>',
        undefined,
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId('post-detail-panel')).toHaveTextContent('새 검토 의견'),
    );
    expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText('전자결재 댓글 응답을 확인할 수 없습니다.'),
    ).not.toBeInTheDocument();
  });

  it('loads and prepends an earlier approval comment page', async () => {
    const createComment = (commentId: number, content: string) => ({
      commentId,
      ownerId: 1,
      parentCommentId: null,
      content: `<p>${content}</p>`,
      commentType: 'USER',
      writerId: `writer-${commentId}`,
      writerName: `작성자 ${commentId}`,
      createdAt: '2026-10-12T10:00:00Z',
      attachments: [],
    });
    const createSystemEvent = (
      commentId: number,
      content: string,
      createdAt: string,
    ) => ({
      commentId,
      ownerId: 1,
      commentType: 'SYSTEM',
      eventType: 'SUBMITTED',
      content,
      writerName: '시스템',
      createdAt,
    });
    composerApi.listApprovalComments
      .mockResolvedValueOnce({
        comments: [createComment(30, '최근 댓글')],
        systemEvents: [
          createSystemEvent(31, '최신 페이지 시스템 메시지', '2026-10-12T09:00:00Z'),
        ],
        hasPrevious: true,
        nextBeforeCommentId: 31,
        resultCnt: 4,
      })
      .mockRejectedValueOnce(new Error('이전 페이지를 불러오지 못했습니다.'))
      .mockResolvedValueOnce({
        comments: [createComment(20, '이전 댓글')],
        systemEvents: [
          createSystemEvent(19, '이전 페이지 시스템 메시지', '2026-10-12T08:00:00Z'),
        ],
        hasPrevious: false,
        nextBeforeCommentId: null,
        resultCnt: 4,
      });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

    await waitFor(() =>
      expect(screen.getByTestId('post-detail-panel')).toHaveTextContent('최근 댓글'),
    );
    expect(screen.getByText('최신 페이지 시스템 메시지')).toBeInTheDocument();
    expect(screen.getByText('댓글 4')).toBeInTheDocument();
    expect(composerApi.listApprovalComments).toHaveBeenNthCalledWith(1, 1, {
      limit: 3,
      beforeCommentId: undefined,
    });
    fireEvent.click(screen.getByRole('button', { name: '이전 댓글 보기 (2)' }));
    expect(
      await screen.findByText('이전 페이지를 불러오지 못했습니다.'),
    ).toBeInTheDocument();
    expect(screen.getByText('최신 페이지 시스템 메시지')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전 댓글 보기 (2)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() =>
      expect(screen.getByTestId('post-detail-panel')).toHaveTextContent('이전 댓글'),
    );
    expect(screen.getByText('이전 페이지 시스템 메시지')).toBeInTheDocument();
    expect(screen.getByText('최신 페이지 시스템 메시지')).toBeInTheDocument();
    expect(screen.getByText('댓글 4')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /이전 댓글 보기/ }),
    ).not.toBeInTheDocument();
    expect(composerApi.listApprovalComments).toHaveBeenNthCalledWith(2, 1, {
      limit: 20,
      beforeCommentId: 31,
    });
    expect(composerApi.listApprovalComments).toHaveBeenLastCalledWith(1, {
      limit: 20,
      beforeCommentId: 31,
    });
  });

  it('keeps loaded approval comments and the remaining count after creating a comment', async () => {
    const createComment = (commentId: number, content: string) => ({
      commentId,
      ownerId: 1,
      parentCommentId: null,
      content: `<p>${content}</p>`,
      commentType: 'USER',
      writerId: `writer-${commentId}`,
      writerName: `작성자 ${commentId}`,
      createdAt: '2026-10-12T10:00:00Z',
      attachments: [],
    });
    const latestComments = [25, 24, 23].map((id) =>
      createComment(id, `최근 댓글 ${id}`),
    );
    const previousComments = [createComment(22, '이전 댓글 22')];
    composerApi.listApprovalComments
      .mockResolvedValueOnce({
        comments: latestComments,
        systemEvents: [],
        hasPrevious: true,
        nextBeforeCommentId: 23,
        resultCnt: 5,
      })
      .mockResolvedValueOnce({
        comments: previousComments,
        systemEvents: [],
        hasPrevious: true,
        nextBeforeCommentId: 22,
        resultCnt: 5,
      });
    composerApi.createApprovalComment
      .mockResolvedValueOnce(createComment(26, '새 검토 의견'))
      .mockResolvedValueOnce({
        ...createComment(27, '새 검토 답글'),
        parentCommentId: 26,
      });

    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /문서 A/ }),
    );
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledWith(1, {
        limit: 3,
        beforeCommentId: undefined,
      }),
    );
    await screen.findByText('최근 댓글 25');
    expect(
      screen.getByRole('button', { name: '이전 댓글 보기 (2)' }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: '이전 댓글 보기 (2)' }),
    );
    await screen.findByText('이전 댓글 22');
    expect(
      screen.getByRole('button', { name: '이전 댓글 보기 (1)' }),
    ).toBeInTheDocument();

    const editor = screen.getByRole('textbox', { name: '댓글 입력' });
    fireEvent.input(editor, { target: { innerHTML: '<p>새 검토 의견</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await screen.findByText('새 검토 의견');
    expect(screen.getByText('이전 댓글 22')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '이전 댓글 보기 (1)' }),
    ).toBeInTheDocument();
    expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(2);
    expect(composerApi.listApprovalComments).toHaveBeenLastCalledWith(1, {
      limit: 20,
      beforeCommentId: 23,
    });

    const replyButtons = within(
      screen.getByTestId('post-detail-panel'),
    ).getAllByRole('button', { name: '답글' });
    expect(replyButtons.length).toBeGreaterThan(0);
    fireEvent.click(replyButtons[replyButtons.length - 1]);
    const replyEditor = screen.getByRole('textbox', { name: '답글 입력' });
    fireEvent.input(replyEditor, {
      target: { innerHTML: '<p>새 검토 답글</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '답글 등록' }));

    await screen.findByText('새 검토 답글');
    expect(screen.getByText('이전 댓글 22')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '이전 댓글 보기 (1)' }),
    ).toBeInTheDocument();
    expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(2);
  }, 15000);

  it('opens a revision-requested draft in the composer with its persisted content and approvers', async () => {
    mockPaginatedDocumentLists();
    composerApi.listApprovalComments.mockReset();
    composerApi.listApprovalComments
      .mockResolvedValueOnce({
        comments: [],
        systemEvents: [
          {
            commentId: 40,
            ownerId: 4,
            commentType: 'SYSTEM',
            eventType: 'RETURNED',
            content: '문서 보완이 요청되었습니다.',
            writerName: '홍길동',
            attachments: [],
          },
        ],
        hasPrevious: false,
        nextBeforeCommentId: null,
        resultCnt: 1,
      })
      .mockResolvedValueOnce({
        comments: [],
        systemEvents: [
          {
            commentId: 41,
            ownerId: 4,
            commentType: 'SYSTEM',
            eventType: 'RESUBMITTED',
            content: '문서가 재상신되었습니다.',
            writerName: '김민수',
            attachments: [],
          },
          {
            commentId: 40,
            ownerId: 4,
            commentType: 'SYSTEM',
            eventType: 'RETURNED',
            content: '문서 보완이 요청되었습니다.',
            writerName: '홍길동',
            attachments: [],
          },
        ],
        hasPrevious: false,
        nextBeforeCommentId: null,
        resultCnt: 2,
      });
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 4,
      eabusNo: '004',
      documentType: 'DRAFTING',
      documentStatus: 'REVISION_REQUESTED',
      isDrafter: true,
      title: '보완할 기안서',
      drafterName: '김민수',
      draftingWorkCategoryId: 77,
      viewCount: 0,
      summary: '기존 내용',
      contentsJson: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '기존 본문' }] }],
      }),
      contentsHtml: '<p>기존 본문</p>',
      approvalLines: [
        {
          electronicApprovalLineId: 11,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'APPROVED',
        },
        {
          electronicApprovalLineId: 12,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-2',
          participantName: '김민수',
          actionStatus: 'RETURNED',
        },
      ],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);

    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /문서 D/ }),
    );
    const detailPanel = await screen.findByTestId('post-detail-panel');
    await within(detailPanel).findByText('문서 보완이 요청되었습니다.');
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '수정 후 재상신' }));
    const composer = await screen.findByRole('dialog', { name: '문서 작성' });
    await screen.findByRole('textbox', { name: '기안자' }, { timeout: 10000 });

    expect(detailPanel).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue(
      '보완할 기안서',
    );
    expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent(
      '기존 본문',
    );
    const approvalPeople = screen.getAllByTestId('document-approval-person');
    expect(approvalPeople[0]).toHaveAttribute(
      'aria-label',
      '결재 1 홍길동',
    );
    expect(approvalPeople[1]).toHaveAttribute('aria-label', '결재 2 김민수');

    await waitFor(() =>
      expect(within(composer).getByRole('button', { name: '결재신청' })).toBeEnabled(),
    );
    fireEvent.click(within(composer).getByRole('button', { name: '결재신청' }));
    await waitFor(() =>
      expect(composerApi.submitDocumentApproval).toHaveBeenCalled(),
    );
    await waitForElementToBeRemoved(composer);
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(2),
    );
    expect(
      await within(detailPanel).findByText('문서가 재상신되었습니다.'),
    ).toBeInTheDocument();
  }, 15000);

  it('shows and preserves existing attachments when editing a revision-requested document', async () => {
    mockPaginatedDocumentLists();
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 4,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'REVISION_REQUESTED',
      isDrafter: true,
      title: '첨부파일이 있는 문서',
      drafterName: '김민수',
      draftingWorkCategoryId: null,
      viewCount: 0,
      summary: '기존 내용',
      contentsJson: '{"type":"doc","content":[{"type":"paragraph"}]}',
      contentsHtml: '<p>기존 본문</p>',
      approvalLines: [
        {
          electronicApprovalLineId: 11,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'APPROVED',
        },
      ],
      attachments: [
        { fileId: 62, fileName: '기존자료.pdf', fileSize: 128, mimeType: 'application/pdf' },
      ],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /^문서 D/ }),
    );
    await screen.findByTestId('post-detail-panel');
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '수정 후 재상신' }));

    const dialog = await screen.findByRole('dialog', { name: '문서 작성' });
    await within(dialog).findByRole('textbox', { name: '기안자' }, { timeout: 10000 });
    expect(await within(dialog).findByText('기존자료.pdf')).toBeInTheDocument();
    const uploadedRow = within(dialog).getByTestId(
      'document-composer-attachment-uploaded',
    );
    const uploadedBadge = within(uploadedRow).getByTestId(
      'document-composer-attachment-status',
    );
    expect(uploadedBadge).toHaveTextContent('완료');
    expect(within(uploadedRow).queryByText('업로드 완료')).not.toBeInTheDocument();
    const uploadedRemoveButton = within(uploadedRow).getByRole('button', {
      name: '첨부 파일 삭제',
    });
    expect(
      uploadedBadge.compareDocumentPosition(uploadedRemoveButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText('첨부 파일 선택'), {
      target: {
        files: [
          new File(['new'], 'new-file.xlsx', {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
        ],
      },
    });
    const pendingRow = within(dialog).getByTestId(
      'document-composer-attachment-pending',
    );
    const pendingBadge = within(pendingRow).getByTestId(
      'document-composer-attachment-status',
    );
    expect(pendingBadge).toHaveTextContent('대기');
    expect(within(pendingRow).queryByText('저장 후 업로드')).not.toBeInTheDocument();
    fireEvent.click(
      within(pendingRow).getByRole('button', { name: '첨부 파일 삭제' }),
    );

    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(composerApi.saveDocumentDraft).toHaveBeenCalledWith(
        expect.any(Object),
        4,
      ),
    );
    expect(composerApi.uploadDocumentDraftAttachment).not.toHaveBeenCalled();
  }, 15000);

  it('loads protected existing images in the edit composer without saving blob URLs', async () => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:approval-image-preview'),
      revokeObjectURL: vi.fn(),
    });
    try {
      composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
        electronicApprovalId: 4,
        eabusNo: '001',
        documentType: 'DRAFTING',
        documentStatus: 'REVISION_REQUESTED',
        isDrafter: true,
        title: '이미지가 있는 문서',
        drafterName: '김민수',
        draftingWorkCategoryId: null,
        viewCount: 0,
        summary: '기존 내용',
        contentsJson: '{"type":"doc","content":[{"type":"paragraph"}]}',
        contentsHtml:
          '<p>기존 본문</p><img src="/api/v1/groupware/approvals/4/embedded-images/51" alt="영수증" data-file-id="51" data-upload-token="image-token" />',
        approvalLines: [
          {
            electronicApprovalLineId: 11,
            stageOrder: 1,
            participantOrder: 1,
            participantType: 'APPROVAL',
            participantUserId: 'emp-1',
            participantName: '홍길동',
            actionStatus: 'APPROVED',
          },
        ],
        attachments: [],
        systemEvents: [],
      });
      render(<DashboardContent {...pageProps} />);
      const listRegion = await screen.findByRole('region', {
        name: '리스트형 문서 목록',
      });
      fireEvent.click(
        await within(listRegion).findByRole('button', { name: /문서 D/ }),
      );
      await screen.findByTestId('post-detail-panel');
      fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: '수정 후 재상신' }));

      const dialog = await screen.findByRole('dialog', { name: '문서 작성' });
      await within(dialog).findByRole('textbox', { name: '기안자' }, { timeout: 10000 });
      await waitFor(() =>
        expect(
          dialog.querySelector('.document-composer-editor .ProseMirror img'),
        ).toHaveAttribute('src', 'blob:approval-image-preview'),
      );
      expect(composerApi.fetchApprovalEmbeddedImageBlob).toHaveBeenCalledWith(4, 51);

      const image = dialog.querySelector<HTMLImageElement>(
        '.document-composer-editor .ProseMirror img',
      );
      if (!image) throw new Error('Expected the existing document image in the editor');
      const elementFromPointDescriptor = Object.getOwnPropertyDescriptor(
        document,
        'elementFromPoint',
      );
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        value: vi.fn(() => image),
      });
      try {
        fireEvent.mouseDown(image);
      } finally {
        if (elementFromPointDescriptor) {
          Object.defineProperty(
            document,
            'elementFromPoint',
            elementFromPointDescriptor,
          );
        } else {
          delete (document as Document & { elementFromPoint?: unknown })
            .elementFromPoint;
        }
      }
      const resizeHandle = await screen.findByLabelText(
        'se 방향 이미지 크기 조절',
      );
      fireEvent.pointerDown(resizeHandle, { clientX: 0, clientY: 0 });
      fireEvent.pointerMove(window, { clientX: 50, clientY: 50 });
      fireEvent.pointerUp(window);
      await waitFor(() =>
        expect(
          dialog.querySelector('.document-composer-editor .ProseMirror img'),
        ).toHaveAttribute('src', 'blob:approval-image-preview'),
      );
      expect(
        dialog.querySelector('.document-composer-editor .ProseMirror img'),
      ).toHaveAttribute('width', '400px');
      expect(
        dialog.querySelector('.document-composer-editor .ProseMirror img'),
      ).toHaveAttribute('height', '250px');

      fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
      await waitFor(() =>
        expect(composerApi.saveDocumentDraft).toHaveBeenCalledWith(
          expect.objectContaining({
            contentsHtml: expect.stringContaining(
              '/api/v1/groupware/approvals/4/embedded-images/51',
            ),
          }),
          4,
        ),
      );
      const savedRequest = composerApi.saveDocumentDraft.mock.calls.at(-1)?.[0];
      expect(savedRequest?.contentsHtml).not.toContain('blob:approval-image-preview');
      expect(savedRequest?.contentsHtml).toContain('width="400px"');
      expect(savedRequest?.contentsHtml).toContain('height="250px"');
      const savedContentsJson = JSON.stringify(savedRequest?.contentsJson);
      expect(savedContentsJson).toContain(
        '/api/v1/groupware/approvals/4/embedded-images/51',
      );
      expect(savedContentsJson).toContain('"width":"400px"');
      expect(savedContentsJson).toContain('"height":"250px"');
      expect(savedContentsJson).not.toContain('blob:approval-image-preview');
    } finally {
      vi.unstubAllGlobals();
    }
  }, 15000);

  it('keeps the detail panel open and refreshes it quietly after closing the composer', async () => {
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 4,
      eabusNo: '004',
      documentType: 'DRAFTING',
      documentStatus: 'REVISION_REQUESTED',
      isDrafter: true,
      title: '보완할 기안서',
      drafterName: '김민수',
      draftingWorkCategoryId: 77,
      viewCount: 0,
      summary: '기존 내용',
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>기존 본문</p>',
      approvalLines: [],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /문서 D/ }),
    );
    const detailPanel = await screen.findByTestId('post-detail-panel');
    await within(detailPanel).findByText('기존 본문');
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '수정 후 재상신' }));
    await screen.findByRole('dialog', { name: '문서 작성' });
    await screen.findByRole('textbox', { name: '기안자' }, { timeout: 10000 });

    let resolveDocuments!: (records: DocumentApprovalRecord[]) => void;
    let resolveSummary!: (summary: DocumentApprovalSummary) => void;
    let resolveDetail!: (detail: DocumentApprovalDetail) => void;
    composerApi.listDocumentApprovals.mockImplementationOnce(
      () =>
        new Promise<DocumentApprovalRecord[]>((resolve) => {
          resolveDocuments = resolve;
        }),
    );
    composerApi.getDocumentApprovalSummary.mockImplementationOnce(
      () =>
        new Promise<DocumentApprovalSummary>((resolve) => {
          resolveSummary = resolve;
        }),
    );
    composerApi.getDocumentApprovalDetail.mockImplementationOnce(
      () =>
        new Promise<DocumentApprovalDetail>((resolve) => {
          resolveDetail = resolve;
        }),
    );

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: '문서 작성' }),
    );
    await waitFor(() => {
      expect(composerApi.listDocumentApprovals).toHaveBeenCalledTimes(2);
      expect(composerApi.getDocumentApprovalSummary).toHaveBeenCalledTimes(2);
      expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByTestId('post-detail-panel')).toBeInTheDocument();
    expect(screen.getByTestId('post-detail-panel')).toHaveTextContent('기존 본문');
    expect(screen.queryByTestId('list-view-skeleton')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: '문서 상세 불러오는 중' }),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveDocuments([]);
      resolveSummary({
        actionRequiredCount: 0,
        inProgressCount: 0,
        draftCount: 0,
        completedCount: 0,
        revisionRequestedCount: 0,
        rejectedCount: 0,
        notices: [],
      });
      resolveDetail({
        electronicApprovalId: 4,
        eabusNo: '004',
        documentType: 'DRAFTING',
        documentStatus: 'REVISION_REQUESTED',
        isDrafter: true,
        title: '수정된 기안서',
        drafterName: '김민수',
        draftingWorkCategoryId: 77,
        viewCount: 1,
        summary: '수정된 요약',
        contentsJson: '{"type":"doc","content":[]}',
        contentsHtml: '<p>수정된 본문</p>',
        approvalLines: [],
        attachments: [],
        systemEvents: [],
      });
    });
    expect(
      await within(screen.getByTestId('post-detail-panel')).findByText('수정된 본문'),
    ).toBeInTheDocument();
  }, 30000);

  it('renders type-specific system badges in document feed cards', async () => {
    const events = [
      ['DRAFT_SAVED', '임시저장', 'Default'],
      ['SUBMITTED', '결재신청', 'Info'],
      ['REJECTED', '반려', 'Error'],
      ['APPROVED', '승인', 'Success'],
      ['RETURNED', '보완요청', 'Warning'],
      ['COMPLETED', '완료', 'Success'],
      ['UNKNOWN', null, null],
    ] as const;
    composerApi.listDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) =>
        Promise.resolve(includeDetails
          ? [...defaultDocumentRecords, { ...defaultDocumentRecords[0], electronicApprovalId: 7 }].map((record, index) => {
              const [eventType] = events[index];
              return toFeedRecord(record, {
                systemEvents: [{
                  eventType,
                  writerName: '시스템',
                  content: `시스템 처리 ${eventType}`,
                  createdAt: '2026-10-16T09:00:00Z',
                }],
              });
            })
          : defaultDocumentRecords),
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

    const feed = await screen.findByTestId('document-feed');
    await waitFor(() => {
      expect(within(feed).getAllByTestId('system-event-badge')).toHaveLength(6);
    });
    const cards = within(feed).getAllByTestId('document-write-item');
    events.forEach(([eventType, label, color], index) => {
      const card = within(cards[index]);
      expect(card.getByText(`시스템 처리 ${eventType}`)).toBeInTheDocument();
      if (label) {
        expect(card.getByTestId('system-event-badge')).toHaveTextContent(label);
        expect(card.getByTestId('system-event-badge')).toHaveClass(`MuiChip-color${color}`);
        expect(card.queryByTestId('system-event-icon')).not.toBeInTheDocument();
      } else {
        expect(card.queryByTestId('system-event-badge')).not.toBeInTheDocument();
        expect(card.getByTestId('system-event-icon')).toBeInTheDocument();
      }
    });
  });

  it('renders every filtered document as a complete feed card with comments and reactions', async () => {
    composerApi.listDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) =>
        Promise.resolve(
          includeDetails
            ? defaultDocumentRecords.map((record) =>
                toFeedRecord(record, {
                  ...(record.electronicApprovalId === 1
                    ? {
                        submittedAt: '2026-10-14T11:00:00Z',
                        updatedAt: '2026-10-15T11:00:00Z',
                        createdAt: '2026-10-12T09:00:00Z',
                      }
                    : {}),
                  title: `상세 문서 ${record.electronicApprovalId}`,
                  viewCount: 3,
                  contentsHtml: `<p>전체 본문 ${record.electronicApprovalId}</p>`,
                  approvalLines: [
                    {
                      electronicApprovalLineId: record.electronicApprovalId,
                      stageOrder: 1,
                      participantOrder: 1,
                      participantType: 'APPROVAL',
                      participantUserId: 'reviewer-1',
                      participantName: `결재자 ${record.electronicApprovalId}`,
                      actionStatus: 'WAITING',
                    },
                  ],
                  attachments: [
                    {
                      fileId: record.electronicApprovalId + 100,
                      fileName: `첨부 ${record.electronicApprovalId}.pdf`,
                      fileSize: 1,
                    },
                  ],
                  commentCount: 4,
                  hasPreviousComments: true,
                  nextBeforeCommentId: record.electronicApprovalId + 1000,
                }),
              )
            : defaultDocumentRecords,
        ),
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

    const documentFeed = await screen.findByTestId('document-feed');
    const cards = await within(documentFeed).findAllByTestId('document-write-item');
    expect(cards).toHaveLength(6);

    for (let index = 0; index < cards.length; index += 1) {
      const documentId = index + 1;
      const card = cards[index];
      if (!card) throw new Error(`Missing document card ${documentId}.`);
      if (documentId === 1) {
        expect(card).toHaveTextContent('기안자 · 2026.10.14 · 조회 3');
      }
      expect(
        await within(card).findByText(`전체 본문 ${documentId}`),
      ).toBeInTheDocument();
      expect(within(card).queryByTestId('approval-line-readonly')).not.toBeInTheDocument();
      const expandBodyButton = within(card).queryByRole('button', { name: '더보기' });
      if (expandBodyButton) fireEvent.click(expandBodyButton);
      if (documentId === 1) {
        expect(within(card).getByText('기안', { exact: true })).toBeInTheDocument();
        expect(within(card).getByText('결재진행중')).toBeInTheDocument();
      }
      expect(within(card).getByText(`결재자 ${documentId}`)).toBeInTheDocument();
      expect(within(card).getByText(`첨부 ${documentId}.pdf`)).toBeInTheDocument();
      expect(
        within(card).getByRole('button', { name: '좋아요 0' }),
      ).toHaveAttribute('aria-pressed', 'false');
      expect(
        within(card).getByRole('textbox', { name: '댓글 입력' }),
      ).toBeInTheDocument();
      expect(within(card).getByText(`초기 댓글 ${documentId}`)).toBeInTheDocument();
      expect(
        within(card).queryByRole('button', { name: '승인' }),
      ).not.toBeInTheDocument();
      expect(
        within(card).queryByRole('button', { name: '상신 취소' }),
      ).not.toBeInTheDocument();
    }
    expect(composerApi.getDocumentApprovalDetail).not.toHaveBeenCalled();
    expect(composerApi.listApprovalComments).not.toHaveBeenCalled();
    composerApi.listApprovalComments.mockResolvedValueOnce({
      comments: [
        {
          commentId: 501,
          ownerId: 1,
          content: '<p>이전 페이지 댓글</p>',
          commentType: 'USER',
          writerId: 'commenter',
          writerName: '댓글 작성자',
          attachments: [],
        },
      ],
      systemEvents: [],
      hasPrevious: false,
      nextBeforeCommentId: null,
      resultCnt: 4,
    });
    const firstCard = cards[0];
    if (!firstCard) throw new Error('No document feed cards were rendered.');
    fireEvent.click(
      within(firstCard).getByRole('button', { name: '이전 댓글 보기 (3)' }),
    );
    expect(await within(firstCard).findByText('이전 페이지 댓글')).toBeInTheDocument();
    expect(composerApi.listApprovalComments).toHaveBeenCalledWith(1, {
      limit: 20,
      beforeCommentId: 1001,
    });
    expect(composerApi.listDocumentApprovals).toHaveBeenCalledWith(
      'ALL',
      undefined,
      undefined,
      true,
    );
    expect(composerApi.getDocumentApprovalDetail).not.toHaveBeenCalled();
    expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();
  }, 20000);

  it('shows the ordered approval toolbar to a feed approver', async () => {
    mockPendingFeedForCurrentApprover();
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

    const card = await screen.findByTestId('document-write-item');
    const toolbar = within(card).getByTestId('document-approval-toolbar');
    const approve = await within(toolbar).findByRole('button', { name: '승인' });
    await waitFor(() =>
      expect(composerApi.fetchMyProfile).toHaveBeenCalledTimes(1),
    );
    const reject = within(toolbar).getByRole('button', { name: '반려' });
    const returnForRevision = within(toolbar).getByRole('button', {
      name: '보완요청',
    });
    const statusChip = within(toolbar).getByText('결재진행중').closest('.MuiChip-root');
    const kindChip = within(toolbar).getByText('기안').closest('.MuiChip-root');
    if (!statusChip || !kindChip) throw new Error('Missing document badges.');
    const divider = within(toolbar).getByRole('separator');
    const pin = within(toolbar).getByRole('button', {
      name: '상단 고정 문서 A',
    });
    const commentSubmitButton = within(card).getByRole('button', {
      name: '등록',
    });
    const orderedElements = [
      approve,
      reject,
      returnForRevision,
      statusChip,
      kindChip,
      divider,
      pin,
    ];
    const actionButtonStyles = [approve, reject, returnForRevision].map(
      (button) => getComputedStyle(button),
    );

    expect(getComputedStyle(statusChip).height).toBe('28px');
    expect(getComputedStyle(kindChip).height).toBe('28px');
    expect(getComputedStyle(toolbar).columnGap).toBe('4px');
    expect(parseFloat(getComputedStyle(statusChip).marginRight)).toBe(0);
    expect(parseFloat(getComputedStyle(pin).marginLeft)).toBe(0);
    expect(parseFloat(getComputedStyle(kindChip).marginRight)).toBe(0);
    expect(actionButtonStyles.map((style) => style.minHeight)).toEqual([
      getComputedStyle(commentSubmitButton).minHeight,
      getComputedStyle(commentSubmitButton).minHeight,
      getComputedStyle(commentSubmitButton).minHeight,
    ]);
    expect([approve, reject, returnForRevision].map(getButtonGeometry)).toEqual([
      getButtonGeometry(commentSubmitButton),
      getButtonGeometry(commentSubmitButton),
      getButtonGeometry(commentSubmitButton),
    ]);
    expect(getComputedStyle(divider).marginRight).toBe('0px');
    expect(approve).toHaveClass('MuiButton-contained', 'MuiButton-colorPrimary');
    expect(reject).toHaveClass('MuiButton-contained', 'MuiButton-colorError');
    expect(returnForRevision).toHaveClass('MuiButton-outlined', 'MuiButton-colorWarning');
    expect(statusChip).toHaveClass('MuiChip-filled');
    expect(statusChip).toHaveStyle({ borderRadius: '8px' });
    expect(kindChip).toHaveStyle({ borderRadius: '8px' });
    expect(getComputedStyle(statusChip).borderRadius).toBe(
      getComputedStyle(kindChip).borderRadius,
    );
    expect(
      within(toolbar).queryByRole('button', { name: '상신 취소' }),
    ).not.toBeInTheDocument();
    expect(
      within(toolbar).queryByRole('button', { name: '승인 취소' }),
    ).not.toBeInTheDocument();
    for (let index = 0; index < orderedElements.length - 1; index += 1) {
      const current = orderedElements[index];
      const next = orderedElements[index + 1];
      if (!current || !next) throw new Error('Missing toolbar element.');
      expect(
        current.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).not.toBe(0);
    }
    expect(screen.getByTestId('approval-line-participant-90')).toHaveStyle({
      borderColor: muiTheme.palette.info.main,
    });
  });

  it('places detail approval actions before the status and keeps the opinion field', async () => {
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      isDrafter: false,
      title: '결재할 문서',
      drafterName: '김민수',
      draftingWorkCategoryId: null,
      viewCount: 0,
      summary: '본문',
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문</p>',
      approvalLines: [
        {
          electronicApprovalLineId: 93,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'PENDING',
        },
      ],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /문서 A/ }),
    );

    const toolbar = await screen.findByTestId('document-approval-toolbar');
    const approve = await within(toolbar).findByRole('button', { name: '승인' });
    const status = within(toolbar).getByText('결재진행중');
    expect(
      approve.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      screen.getByRole('textbox', { name: '처리 의견' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['REJECTED', '반려', '반려 사유', '반려 확인'],
    ['RETURNED', '보완요청', '보완요청 사유', '보완요청 확인'],
  ] as const)('processes a detail %s through a reason dialog with retry', async (
    action, label, dialogTitle, confirmLabel,
  ) => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    composerApi.getDocumentApprovalDetail.mockResolvedValue(toFeedRecord(record, {
      isDrafter: false,
      approvalLines: [{
        electronicApprovalLineId: 93,
        stageOrder: 2,
        participantOrder: 1,
        participantType: 'APPROVAL',
        participantUserId: 'emp-1',
        participantName: '결재자',
        actionStatus: 'PENDING',
      }],
    }));
    const onClose = vi.fn();
    const onActionComplete = vi.fn();
    render(<DocumentApprovalDetailFeed
      open electronicApprovalId={1} detailRefreshToken={0}
      onClose={onClose} onActionComplete={onActionComplete} onEditDocument={vi.fn()}
    />);
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1),
    );
    fireEvent.click(await screen.findByRole('button', { name: label, exact: true }));
    let dialog = await screen.findByRole('dialog', { name: dialogTitle });
    expect(dialog).toHaveStyle({ maxWidth: '480px' });
    expect(dialog).toHaveAccessibleDescription('처리 사유를 입력해 주세요.');
    expect(within(dialog).getByTestId('common-dialog-actions')).toContainElement(
      within(dialog).getByRole('button', { name: confirmLabel }),
    );
    expect(within(dialog).getByRole('button', { name: '닫기', exact: true })).toBeInTheDocument();
    expect(composerApi.processDocumentApprovalAction).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: '처리 사유' }), {
      target: { value: '취소할 사유' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '닫기', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: dialogTitle })).not.toBeInTheDocument());
    expect(composerApi.processDocumentApprovalAction).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: label, exact: true }));
    dialog = await screen.findByRole('dialog', { name: dialogTitle });
    expect(within(dialog).getByRole('textbox', { name: '처리 사유' })).toHaveValue('');
    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: dialogTitle })).not.toBeInTheDocument());
    expect(composerApi.processDocumentApprovalAction).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: label, exact: true }));
    dialog = await screen.findByRole('dialog', { name: dialogTitle });
    expect(within(dialog).getByRole('textbox', { name: '처리 사유' })).toHaveValue('');
    fireEvent.change(within(dialog).getByRole('textbox', { name: '처리 사유' }), {
      target: { value: ' \n ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: confirmLabel }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('반려 또는 보완요청 사유를 입력해 주세요.');
    expect(composerApi.processDocumentApprovalAction).not.toHaveBeenCalled();
    const reason = '첫 번째 사유\n두 번째 사유\n\n마지막 사유 <b>확인</b>';
    fireEvent.change(within(dialog).getByRole('textbox', { name: '처리 사유' }), {
      target: { value: `  ${reason}  ` },
    });
    composerApi.processDocumentApprovalAction.mockRejectedValueOnce(new Error('결재 처리 실패'));
    fireEvent.click(within(dialog).getByRole('button', { name: confirmLabel }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('결재 처리 실패');
    expect(within(dialog).getByRole('textbox', { name: '처리 사유' })).toHaveValue(`  ${reason}  `);
    expect(onClose).not.toHaveBeenCalled();
    expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole('button', { name: confirmLabel }));
    await waitFor(() => expect(onActionComplete).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(2),
    );
    expect(composerApi.processDocumentApprovalAction).toHaveBeenCalledTimes(2);
    expect(composerApi.processDocumentApprovalAction).toHaveBeenLastCalledWith(1, {
      action, actionComment: reason,
    });
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: dialogTitle })).not.toBeInTheDocument());
  }, 15000);

  it('submits a detail approval directly with its optional opinion', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    composerApi.getDocumentApprovalDetail.mockResolvedValue(toFeedRecord(record, {
      isDrafter: false,
      approvalLines: [{
        electronicApprovalLineId: 93,
        stageOrder: 2,
        participantOrder: 1,
        participantType: 'APPROVAL',
        participantUserId: 'emp-1',
        participantName: '결재자',
        actionStatus: 'PENDING',
      }],
    }));
    const onClose = vi.fn();
    const onActionComplete = vi.fn();
    composerApi.listApprovalComments
      .mockResolvedValueOnce({
        comments: [],
        systemEvents: [],
        hasPrevious: false,
        nextBeforeCommentId: null,
        resultCnt: 0,
      })
      .mockResolvedValueOnce({
        comments: [],
        systemEvents: [{
          commentId: 501,
          ownerId: 1,
          commentType: 'SYSTEM',
          eventType: 'APPROVED',
          content: '승인 액션 시스템 메시지',
          writerName: '결재자',
          createdAt: '2026-10-16T09:00:00Z',
        }],
        hasPrevious: false,
        nextBeforeCommentId: null,
        resultCnt: 1,
      });
    render(<DocumentApprovalDetailFeed
      open electronicApprovalId={1} detailRefreshToken={0}
      onClose={onClose} onActionComplete={onActionComplete} onEditDocument={vi.fn()}
    />);
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1),
    );
    fireEvent.change(await screen.findByRole('textbox', { name: '처리 의견' }), {
      target: { value: '승인 의견' },
    });
    fireEvent.click(screen.getByRole('button', { name: '승인', exact: true }));
    await waitFor(() => expect(onActionComplete).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledTimes(2),
    );
    expect(composerApi.processDocumentApprovalAction).toHaveBeenCalledWith(1, {
      action: 'APPROVED', actionComment: '승인 의견',
    });
    expect(screen.getByText('승인 액션 시스템 메시지')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps an approval successful when refreshing comments fails', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    composerApi.getDocumentApprovalDetail.mockResolvedValue(toFeedRecord(record, {
      isDrafter: false,
      approvalLines: [{
        electronicApprovalLineId: 93,
        stageOrder: 2,
        participantOrder: 1,
        participantType: 'APPROVAL',
        participantUserId: 'emp-1',
        participantName: '결재자',
        actionStatus: 'PENDING',
      }],
    }));
    composerApi.listApprovalComments
      .mockResolvedValueOnce({
        comments: [],
        systemEvents: [],
        hasPrevious: false,
        nextBeforeCommentId: null,
        resultCnt: 0,
      })
      .mockRejectedValueOnce(new Error('댓글 재조회 실패'));
    const onClose = vi.fn();
    const onActionComplete = vi.fn();
    render(<DocumentApprovalDetailFeed
      open electronicApprovalId={1} detailRefreshToken={0}
      onClose={onClose} onActionComplete={onActionComplete} onEditDocument={vi.fn()}
    />);

    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1),
    );
    fireEvent.click(await screen.findByRole('button', { name: '승인', exact: true }));

    expect(await screen.findByText('댓글 재조회 실패')).toBeInTheDocument();
    expect(composerNotifications.showSuccess).toHaveBeenCalledWith(
      '문서가 승인되었습니다.',
    );
    expect(onActionComplete).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each([
    ['submission', '상신 취소', '결재신청 취소'],
    ['approval', '승인 취소', '승인 취소'],
  ] as const)('submits the detail %s cancellation from its confirmation dialog', async (
    kind, buttonLabel, dialogTitle,
  ) => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    composerApi.getDocumentApprovalDetail.mockResolvedValue(toFeedRecord(record, {
      isDrafter: kind === 'submission',
      approvalLines: kind === 'approval' ? [{
        electronicApprovalLineId: 93,
        stageOrder: 2,
        participantOrder: 1,
        participantType: 'APPROVAL',
        participantUserId: 'emp-1',
        participantName: '결재자',
        actionStatus: 'APPROVED',
      }] : [],
    }));
    const onActionComplete = vi.fn();
    const onClose = vi.fn();
    const cancelApi = kind === 'submission'
      ? composerApi.cancelDocumentSubmission : composerApi.cancelDocumentApproval;
    render(<DocumentApprovalDetailFeed
      open electronicApprovalId={1} detailRefreshToken={0}
      onClose={onClose} onActionComplete={onActionComplete} onEditDocument={vi.fn()}
    />);
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1),
    );
    fireEvent.click(await screen.findByRole('button', { name: buttonLabel, exact: true }));
    const dialog = await screen.findByRole('dialog', { name: dialogTitle });
    expect(cancelApi).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: buttonLabel, exact: true }));
    await waitFor(() => expect(onActionComplete).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledTimes(2),
    );
    expect(cancelApi).toHaveBeenCalledWith(1);
    expect(onClose).not.toHaveBeenCalled();
  }, 15000);

  it.each([
    ['submission', '상신 취소', '결재신청 취소'],
    ['approval', '승인 취소', '승인 취소'],
  ] as const)('confirms and retries feed %s cancellation with a list refresh', async (
    kind, buttonLabel, dialogTitle,
  ) => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    const feedRecord = toFeedRecord(record, {
      isDrafter: kind === 'submission',
      approvalLines: kind === 'approval' ? [{
        electronicApprovalLineId: 93,
        stageOrder: 2,
        participantOrder: 1,
        participantType: 'APPROVAL',
        participantUserId: 'emp-1',
        participantName: '결재자',
        actionStatus: 'APPROVED',
      }] : [],
    });
    const onActionComplete = vi.fn();
    const cancelApi = kind === 'submission'
      ? composerApi.cancelDocumentSubmission : composerApi.cancelDocumentApproval;
    cancelApi.mockRejectedValueOnce(new Error('취소 처리 실패'));
    render(<DocumentApprovalDetailFeed
      open presentation="feed" electronicApprovalId={1} detailRefreshToken={0}
      feedItem={{
        id: 1, title: record.title, author: record.drafterName,
        kind: '기안서', status: '결재진행중', date: '', summary: record.summary, feedData: feedRecord,
      }}
      employeeId="emp-1"
      onActionComplete={onActionComplete} onEditDocument={vi.fn()}
    />);
    fireEvent.click(await screen.findByRole('button', { name: buttonLabel, exact: true }));
    let dialog = await screen.findByRole('dialog', { name: dialogTitle });
    expect(cancelApi).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    await waitForElementToBeRemoved(dialog);
    expect(cancelApi).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: buttonLabel, exact: true }));
    dialog = await screen.findByRole('dialog', { name: dialogTitle });
    fireEvent.click(within(dialog).getByRole('button', { name: buttonLabel, exact: true }));
    expect(await within(dialog).findByText('취소 처리 실패')).toBeInTheDocument();
    expect(onActionComplete).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: buttonLabel, exact: true }));
    await waitFor(() => expect(onActionComplete).toHaveBeenCalledOnce());
    expect(cancelApi).toHaveBeenCalledTimes(2);
    expect(cancelApi).toHaveBeenLastCalledWith(1);
    expect(composerApi.getDocumentApprovalDetail).not.toHaveBeenCalled();
    expect(composerApi.listApprovalComments).toHaveBeenCalledWith(1, {
      beforeCommentId: undefined, limit: 3,
    });
  }, 20000);

  it.each([
    ['not the drafter', 'PENDING', false, 'WAITING', false],
    ['already in progress', 'IN_PROGRESS', true, 'WAITING', false],
    ['completed', 'COMPLETED', true, 'APPROVED', false],
    ['a later stage acted', 'IN_PROGRESS', false, 'APPROVED', true],
  ] as const)('hides ineligible feed cancellation when %s', async (
    _reason, documentStatus, isDrafter, ownStatus, laterActed,
  ) => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    const feedRecord = toFeedRecord(record, {
      documentStatus, isDrafter,
      approvalLines: [{
        electronicApprovalLineId: 93, stageOrder: 2, participantOrder: 1,
        participantType: 'APPROVAL', participantUserId: 'emp-1',
        participantName: '결재자', actionStatus: ownStatus,
      }, ...(laterActed ? [{
        electronicApprovalLineId: 94, stageOrder: 3, participantOrder: 1,
        participantType: 'APPROVAL' as const, participantUserId: 'emp-2',
        participantName: '후속 결재자', actionStatus: 'APPROVED' as const,
      }] : [])],
    });
    render(<DocumentApprovalDetailFeed
      open presentation="feed" electronicApprovalId={1} detailRefreshToken={0}
      feedItem={{
        id: 1, title: record.title, author: record.drafterName,
        kind: '기안서', status: '결재진행중', date: '', summary: record.summary, feedData: feedRecord,
      }}
      employeeId="emp-1" onActionComplete={vi.fn()} onEditDocument={vi.fn()}
    />);
    await screen.findByTestId('document-approval-toolbar');
    expect(screen.queryByRole('button', { name: /상신 취소|승인 취소/ })).toBeNull();
  });

  it('shows a feed approval error when the direct approval request fails', async () => {
    mockPendingFeedForCurrentApprover();
    composerApi.processDocumentApprovalAction.mockRejectedValueOnce(
      new Error('승인 처리에 실패했습니다.'),
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

    const card = await screen.findByTestId('document-write-item');
    fireEvent.click(await within(card).findByRole('button', { name: '승인' }));

    expect(
      await within(card).findByText('승인 처리에 실패했습니다.'),
    ).toBeInTheDocument();
  });

  it('shows a retryable page error when feed employee identity cannot be loaded', async () => {
    mockPendingFeedForCurrentApprover();
    composerApi.fetchMyProfile.mockRejectedValueOnce(
      new Error('프로필 조회에 실패했습니다.'),
    ).mockResolvedValueOnce({
      userId: 'emp-1',
      employeeId: 'emp-1',
      name: '홍길동',
    });
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

    expect(
      await screen.findByText('프로필 조회에 실패했습니다.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: '사원 정보 다시 시도' }),
    ).toBeInTheDocument();
    expect(
      within(await screen.findByTestId('document-write-item')).queryByRole('button', {
        name: '승인',
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '사원 정보 다시 시도' }));
    expect(
      await within(await screen.findByTestId('document-write-item')).findByRole(
        'button',
        { name: '승인' },
      ),
    ).toBeInTheDocument();
    expect(composerApi.fetchMyProfile).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      label: '반려',
      dialogTitle: '반려 사유',
      confirmLabel: '반려 확인',
      action: 'REJECTED',
      reason: '결재 내용 확인 필요',
    },
    {
      label: '보완요청',
      dialogTitle: '보완요청 사유',
      confirmLabel: '보완요청 확인',
      action: 'RETURNED',
      reason: '첨부 자료를 보완해 주세요',
    },
  ] as const)(
    'requires a reason before a feed reviewer submits $label',
    async ({ label, dialogTitle, confirmLabel, action, reason }) => {
      mockPendingFeedForCurrentApprover();
      render(<DashboardContent {...pageProps} />);
      fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

      const card = await screen.findByTestId('document-write-item');
      fireEvent.click(await within(card).findByRole('button', { name: label }));

      const dialog = await screen.findByRole('dialog', { name: dialogTitle });
      expect(composerApi.processDocumentApprovalAction).not.toHaveBeenCalled();
      fireEvent.click(within(dialog).getByRole('button', { name: confirmLabel }));
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        '반려 또는 보완요청 사유를 입력해 주세요.',
      );
      expect(composerApi.processDocumentApprovalAction).not.toHaveBeenCalled();

      fireEvent.change(within(dialog).getByRole('textbox', { name: '처리 사유' }), {
        target: { value: reason },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: confirmLabel }));

      await waitFor(() =>
        expect(composerApi.processDocumentApprovalAction).toHaveBeenCalledWith(1, {
          action,
          actionComment: reason,
        }),
      );
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: dialogTitle })).not.toBeInTheDocument(),
      );
    },
  );

  it('does not offer deletion for a pending drafter document', async () => {
    mockPaginatedDocumentLists();
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      isDrafter: true,
      title: '상신한 문서',
      drafterName: '홍길동',
      draftingWorkCategoryId: null,
      viewCount: 0,
      summary: '본문',
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문</p>',
      approvalLines: [
        {
          electronicApprovalLineId: 91,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'APPROVED',
          actionAt: '2026-10-14T09:00:00Z',
        },
        {
          electronicApprovalLineId: 92,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-2',
          participantName: '김민수',
          actionStatus: 'WAITING',
        },
      ],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /^문서 A/ }),
    );

    await screen.findByTestId('approval-detail-card');
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
    expect(await screen.findByRole('menuitem', { name: '문서 공유하기' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '삭제' })).not.toBeInTheDocument();
  });

  it('keeps the document deletion menu available for a draft', async () => {
    mockPaginatedDocumentLists();
    const draftRecord = defaultDocumentRecords[2];
    if (!draftRecord) throw new Error('Missing draft document fixture.');
    composerApi.listDocumentApprovals.mockResolvedValueOnce({ resultList: [
      {
        ...draftRecord,
        title: '임시저장 문서',
        documentStatus: 'DRAFT',
      },
    ], totalRowCount: 1 });
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 3,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'DRAFT',
      isDrafter: true,
      title: '임시저장 문서',
      drafterName: '홍길동',
      draftingWorkCategoryId: null,
      viewCount: 0,
      summary: '본문',
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문</p>',
      approvalLines: [],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /^임시저장 문서/ }),
    );

    fireEvent.click(await screen.findByRole('button', { name: '문서 더보기' }));
    expect(await screen.findByRole('menuitem', { name: '삭제' })).toBeInTheDocument();
  });

  it('keeps the notice-style owner menu, like toggle, and comments inside the feed card', async () => {
    composerApi.listDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) =>
        Promise.resolve(
          { resultList: includeDetails
            ? defaultDocumentRecords.map((record) =>
                toFeedRecord(record, {
                  isDrafter: true,
                  documentStatus: 'DRAFT',
                  contentsHtml: '<p>본문</p>',
                }),
              )
            : defaultDocumentRecords,
            totalRowCount: defaultDocumentRecords.length,
          },
        ),
    );
    composerApi.createApprovalComment.mockResolvedValueOnce({
      commentId: 91,
      ownerId: 1,
      parentCommentId: null,
      content: '<p>피드 댓글</p>',
      commentType: 'USER',
      writerId: 'writer-1',
      writerName: '김민수',
      createdAt: '2026-10-12T10:00:00Z',
      attachments: [],
    }, 20000);
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

    const firstCard = (
      await within(await screen.findByTestId('document-feed')).findAllByTestId(
        'document-write-item',
      )
    )[0];
    if (!firstCard) throw new Error('No document feed cards were rendered.');

    const likeButton = await within(firstCard).findByRole('button', {
      name: '좋아요 0',
    });
    fireEvent.click(likeButton);
    expect(
      within(firstCard).getByRole('button', { name: '좋아요 취소 0' }),
    ).toHaveAttribute('aria-pressed', 'true');

    const editor = await within(firstCard).findByRole('textbox', {
      name: '댓글 입력',
    });
    fireEvent.input(editor, {
      target: { innerHTML: '<p>피드 댓글</p>' },
    });
    fireEvent.click(within(firstCard).getByRole('button', { name: '등록' }));
    await waitFor(() =>
      expect(composerApi.createApprovalComment).toHaveBeenCalledWith(
        1,
        '<p>피드 댓글</p>',
        undefined,
      ),
    );
    expect(within(firstCard).getByText('피드 댓글')).toBeInTheDocument();

    fireEvent.click(
      within(firstCard).getByRole('button', { name: '문서 더보기' }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: '문서 수정' }));
    expect(
      await screen.findByRole('dialog', { name: '문서 작성' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();

    const closeButton = within(screen.getByRole('dialog', { name: '문서 작성' }))
      .getAllByRole('button', { name: '닫기' })
      .find((button) => button.textContent === '닫기');
    if (!closeButton) throw new Error('Missing composer close action.');
    fireEvent.click(closeButton);
    await waitFor(() => {
      expect(composerApi.listDocumentApprovals).toHaveBeenCalledTimes(3);
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'ALL',
        undefined,
        undefined,
        true,
        { offset: 0, limit: 20 },
      );
      expect(composerApi.getDocumentApprovalDetail).not.toHaveBeenCalled();
    });
    expect(screen.queryByTestId('document-feed-skeleton')).not.toBeInTheDocument();
  }, 20000);

  it('retries a failed atomic feed request without showing partial cards', async () => {
    let feedRequest = 0;
    composerApi.listDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) => {
        if (!includeDetails) return Promise.resolve(defaultDocumentRecords);
        if (feedRequest++ === 0) {
          return Promise.reject(new Error('피드 목록 조회에 실패했습니다.'));
        }
        return Promise.resolve(
          defaultDocumentRecords.map((record) =>
            toFeedRecord(record, {
              contentsHtml: `<p>재시도한 본문 ${record.electronicApprovalId}</p>`,
            }),
          ),
        );
      },
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('피드 목록 조회에 실패했습니다.');
    expect(screen.queryByTestId('document-write-item')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(
      await screen.findByText('재시도한 본문 1'),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('document-write-item')).toHaveLength(6);
    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();
  }, 20000);

  it('clears feed cards when a filter reload fails after a quiet refresh', async () => {
    let feedRequest = 0;
    composerApi.listDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) => {
        if (!includeDetails) return Promise.resolve(defaultDocumentRecords);
        feedRequest += 1;
        if (feedRequest === 3) {
          return Promise.reject(new Error('필터 적용 후 피드 조회에 실패했습니다.'));
        }
        return Promise.resolve(
          defaultDocumentRecords.map((record) => toFeedRecord(record)),
        );
      },
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    expect(await screen.findAllByTestId('document-write-item')).toHaveLength(6);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await screen.findByRole('dialog', { name: '문서 작성' });
    await waitForComposerReady();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: '문서 작성' }),
    );
    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenCalledTimes(3),
    );

    fireEvent.click(
      screen.getByRole('button', { name: '문서 업무구분 필터' }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: '기안서' }));

    expect(
      await screen.findByText('필터 적용 후 피드 조회에 실패했습니다.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('document-write-item')).not.toBeInTheDocument();
  }, 20000);

  it('switches to feed mode and opens the document composer with available tabs', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    expect(screen.getByRole('button', { name: '피드형 보기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await screen.findByTestId('document-feed')).toBeInTheDocument();

    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '문서 상세' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    expect(
      screen.getByRole('dialog', { name: '문서 작성' }),
    ).toBeInTheDocument();
    await waitForComposerReady();
    expect(
      screen.getByTestId('document-composer-dialog-root'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: '기안서' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '업무연락' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '지출결의서' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: '근태신청' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '제목' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '본문' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: '본문' }).closest('.rich-text-editor-content'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '툴바 열기' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '첨부 링크' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '툴바 열기' }));
    expect(screen.getByRole('button', { name: '굵게' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '표 삽입' })).toBeInTheDocument();
  }, 20000);

  it('uses the shared dark surface and theme-aware editor surface', async () => {
    render(
      <ThemeProvider theme={createAppTheme('dark')}>
        <DashboardContent {...pageProps} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const dialog = screen.getByRole('dialog', { name: '문서 작성' });
    const header = dialog.querySelector('.MuiDialogTitle-root')?.parentElement
      ?.parentElement;
    const content = dialog.querySelector('.MuiDialogContent-root');
    const footer = dialog.querySelector('.MuiDialogActions-root');
    const editorPanel = screen.getByTestId('document-composer-editor-panel');

    [dialog, header, content, footer].forEach((region) => {
      expect(getComputedStyle(region as Element).backgroundColor).toBe(
        'rgb(30, 41, 59)',
      );
    });
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const title = screen.getByRole('textbox', { name: '제목' });
    const placeholder = editor.querySelector('p.is-editor-empty');

    expect(getComputedStyle(editorPanel).backgroundColor).toBe(
      'rgb(30, 41, 59)',
    );
    expect(getComputedStyle(editor).backgroundColor).toBe('rgb(30, 41, 59)');
    expect(getComputedStyle(editor).color).toBe('rgb(226, 232, 240)');
    expect(getComputedStyle(title).fontWeight).toBe('700');
    expect(getComputedStyle(editor).fontWeight).toBe('400');
    expect(placeholder).toBeInTheDocument();
  });

  it('keeps the editor surface white in the light theme', async () => {
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <DashboardContent {...pageProps} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const editorPanel = screen.getByTestId('document-composer-editor-panel');
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const title = screen.getByRole('textbox', { name: '제목' });

    expect(getComputedStyle(editorPanel).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
    expect(getComputedStyle(editor).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
    expect(getComputedStyle(editor).color).toBe('rgb(15, 23, 42)');
    expect(getComputedStyle(title).fontWeight).toBe('700');
    expect(getComputedStyle(editor).fontWeight).toBe('400');
  });

  it('lets the dialog content scroll while the editor surface grows naturally', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const editor = await screen.findByRole('textbox', { name: '본문' });
    const composerLayout = screen.getByTestId('document-composer-layout');
    const editorPanel = screen.getByTestId('document-composer-editor-panel');
    const dialogContent = editor.closest('.MuiDialogContent-root');

    expect(composerLayout).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '0',
    });
    expect(editorPanel).toHaveStyle({
      flexGrow: '1',
      flexShrink: '0',
      minHeight: '200px',
    });
    expect(editor).toHaveStyle({
      minHeight: '180px',
      maxHeight: 'none',
      flexShrink: '0',
    });
    expect(dialogContent).toHaveStyle({ overflowY: 'auto' });
  });

  it('keeps the editor whitespace even when a template starts with a margined block', async () => {
    composerApi.fetchDraftFormTemplate.mockResolvedValue({
      ...draftFormTemplate,
      templateJson: null,
      templateHtml:
        '<blockquote><p>첫 블록</p></blockquote><p>마지막 블록</p>',
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const formSelector = screen.getByRole('combobox', { name: '기안양식' });
    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));

    const editor = await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editor).toHaveTextContent('마지막 블록'));

    const firstBlock = editor.firstElementChild;
    const lastBlock = editor.lastElementChild;
    if (!firstBlock || !lastBlock) {
      throw new Error('Template blocks were not rendered in the editor.');
    }

    expect(getComputedStyle(editor).paddingTop).toBe(
      getComputedStyle(editor).paddingBottom,
    );
    expect(getComputedStyle(firstBlock).marginTop).toBe('0px');
    expect(getComputedStyle(lastBlock).marginBottom).toBe('0px');
  });

  it('shows read-only draft metadata and the default category and form fields', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const draftDate = await screen.findByRole('textbox', { name: '기안일' });
    const drafter = screen.getByRole('textbox', { name: '기안자' });
    expect(draftDate).toHaveValue();
    expect(draftDate.getAttribute('value')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(draftDate).toHaveAttribute('readonly');
    expect(draftDate.closest('.MuiInputBase-root')).toHaveStyle({
      minHeight: '38px',
    });
    expect(drafter).toHaveValue('기안자');
    expect(drafter).toHaveAttribute('readonly');
    const categorySelector = screen.getByRole('combobox', { name: '구분' });
    const formSelector = screen.getByRole('combobox', { name: '기안양식' });
    expect(categorySelector).toHaveTextContent('전체');
    expect(categorySelector.closest('.MuiInputBase-root')).toHaveStyle({
      minHeight: '38px',
    });
    expect(formSelector).toBeInTheDocument();
    expect(formSelector.closest('.MuiInputBase-root')).toHaveStyle({
      minHeight: '38px',
    });
    expect(composerApi.fetchDraftFormOptions).toHaveBeenCalledOnce();
    expect(composerApi.fetchDraftForms).toHaveBeenCalledOnce();
    expect(composerApi.fetchMyProfile).toHaveBeenCalledOnce();
  });

  it('shows a visible error when initial draft lookup fails', async () => {
    composerApi.fetchDraftFormOptions.mockRejectedValue(
      new Error('기안 분류를 불러오지 못했습니다.'),
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));

    const error = await screen.findByText('기안 분류를 불러오지 못했습니다.');
    expect(error).toBeInTheDocument();
    expect(error.closest('.MuiDialogContent-root')).not.toBeNull();
    expect(screen.getByTestId('document-composer-layout').firstElementChild)
      .toHaveClass('MuiAlert-colorError');
    expect(
      screen.queryByRole('progressbar', { name: '문서 정보 불러오는 중' }),
    ).not.toBeInTheDocument();
  });

  it('shows a loading status while initial draft lookups are pending', async () => {
    composerApi.fetchDraftFormOptions.mockReturnValue(
      new Promise(() => undefined),
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));

    expect(
      await screen.findByRole('progressbar', {
        name: '문서 정보 불러오는 중',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '기안자' })).toBeNull();
    expect(screen.getByRole('tab', { name: '기안서' })).toBeDisabled();
    expect(
      screen.getByLabelText('첨부 파일 선택'),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: '결재선 설정' }),
    ).not.toBeInTheDocument();
  });

  it('shows an error when the profile has no drafter name and explicit empty states', async () => {
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'writer',
      employeeId: 'writer',
      name: ' ',
    });
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [],
      cycleItems: [],
      users: [],
    });
    composerApi.fetchDraftForms.mockResolvedValue([]);
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: '기안자' }),
      ).toBeInTheDocument(),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '로그인 사용자의 이름을 확인할 수 없습니다.',
    );
    expect(screen.getByText('등록된 분류가 없습니다.')).toBeInTheDocument();
    expect(
      screen.getByText('선택 가능한 기안양식이 없습니다.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('선택 가능한 사용자가 없습니다.'),
    ).not.toBeInTheDocument();
  });

  it('shows an error when the profile has no employee identity', async () => {
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'login-code-1',
      employeeId: ' ',
      name: '기안자',
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '로그인 사용자의 사원 ID를 확인할 수 없습니다.',
    );
    expect(screen.queryByTestId('document-approval-person')).toBeNull();
  });

  it('filters the selectable forms by active category and available body', async () => {
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category, anotherCategory],
      cycleItems: [],
      users: [composerUser],
    });
    composerApi.fetchDraftForms.mockResolvedValue([
      draftForm,
      {
        ...draftForm,
        draftingWorkCategoryId: 78,
        codeName: '다른 분류 양식',
        categoryItemId: 102,
      },
      {
        ...draftForm,
        draftingWorkCategoryId: 79,
        codeName: '사용 중지 양식',
        useAt: 'N',
      },
      {
        ...draftForm,
        draftingWorkCategoryId: 80,
        codeName: '본문 미등록 양식',
        hasDocument: false,
      },
    ]);
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '구분' }));
    fireEvent.click(await screen.findByRole('option', { name: '업무' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '기안양식' }));

    expect(
      await screen.findByRole('option', { name: '정기점검' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '다른 분류 양식' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '사용 중지 양식' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '본문 미등록 양식' }),
    ).not.toBeInTheDocument();
  });

  it('calculates approval slot capacity from the measured content width', () => {
    expect(calculateApprovalSlotCapacity(262)).toBe(2);
    expect(calculateApprovalSlotCapacity(654)).toBe(7);
    expect(calculateApprovalSlotCapacity(940)).toBe(10);
    expect(calculateApprovalSlotCapacity(0)).toBe(1);
  });

  it('fills subdued empty approval slots and updates them when the observed width changes', async () => {
    const approvalObservers = installApprovalResizeObserverMock();
    let unmount = () => {};

    try {
      const rendered = render(<DashboardContent {...pageProps} />);
      unmount = rendered.unmount;

      fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
      await waitForComposerReady();

      const grid = screen.getByTestId('document-approval-grid');
      const slots = () => Array.from(grid.children) as HTMLElement[];
      const emptySlots = () =>
        within(grid).getAllByTestId('document-empty-approval-slot');
      expect(grid).toHaveAttribute('data-slot-capacity', '2');
      expect(slots()).toHaveLength(2);
      expect(within(grid).getAllByTestId('document-approval-person')).toHaveLength(
        1,
      );
      expect(emptySlots()).toHaveLength(1);
      emptySlots().forEach((slot) => {
        const seal = within(slot).getByLabelText('결재 도장 자리');
        expect(slot).toHaveStyle({
          borderStyle: 'dashed',
          borderColor: muiTheme.palette.divider,
        });
        expect(seal).toHaveStyle({
          color: muiTheme.palette.text.disabled,
        });
        expect(within(slot).getByLabelText('직위/직함 자리')).toBeInTheDocument();
        expect(within(slot).getByLabelText('결재자 이름 자리')).toBeInTheDocument();
        expect(slot.querySelector('[aria-label*="순번"]')).toBeNull();
        expect(slot.querySelector('button')).toBeNull();
      });

      expect(approvalObservers.length).toBeGreaterThan(0);
      const gridObserver = approvalObservers.find((observer) =>
        observer.isObserving(grid),
      );
      expect(gridObserver).toBeDefined();
      act(() => gridObserver!.resize(654));
      await waitFor(() => {
        expect(grid).toHaveAttribute('data-slot-capacity', '7');
        expect(slots()).toHaveLength(7);
        expect(emptySlots()).toHaveLength(6);
      });
    } finally {
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it('recalculates approval slot capacity after a viewport resize', async () => {
    installApprovalResizeObserverMock();
    let unmount = () => {};

    try {
      const rendered = render(<DashboardContent {...pageProps} />);
      unmount = rendered.unmount;

      fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
      await waitForComposerReady();

      const grid = screen.getByTestId('document-approval-grid');
      expect(grid).toHaveAttribute('data-slot-capacity', '2');
      Object.defineProperty(grid, 'clientWidth', {
        configurable: true,
        value: 654,
      });
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        expect(grid).toHaveAttribute('data-slot-capacity', '7');
        expect(grid.children).toHaveLength(7);
        expect(within(grid).getAllByTestId('document-empty-approval-slot')).toHaveLength(
          6,
        );
      });
    } finally {
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it('retains and wraps the fourth approval in a three-column grid', async () => {
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category],
      cycleItems: [],
      users: [
        composerUser,
        anotherComposerUser,
        thirdComposerUser,
        fourthComposerUser,
        fifthComposerUser,
      ],
    });
    const approvalObservers = installApprovalResizeObserverMock();
    let unmount = () => {};

    try {
      const rendered = render(<DashboardContent {...pageProps} />);
      unmount = rendered.unmount;

      fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
      await waitForComposerReady();

      const picker = screen.getByRole('combobox', {
        name: '결재선 2 사용자 선택',
      });
      const names = ['김민수', '박서준', '이수진', '최민호'];
      for (const name of names) {
        fireEvent.change(picker, { target: { value: name } });
        fireEvent.click(
          await screen.findByRole('option', { name: new RegExp(name) }),
        );
      }
      fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

      const grid = screen.getByTestId('document-approval-grid');
      const gridObserver = approvalObservers.find((observer) =>
        observer.isObserving(grid),
      );
      expect(gridObserver).toBeDefined();
      act(() => gridObserver!.resize(272));
      await waitFor(() => {
        expect(grid).toHaveAttribute('data-slot-capacity', '3');
      });

      const approvalPeople = within(grid).getAllByTestId(
        'document-approval-person',
      );
      expect(grid).toHaveAttribute('data-slot-capacity', '3');
      expect(grid).toHaveStyle({
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(88px, 1fr))',
      });
      expect(grid.children).toHaveLength(5);
      expect(
        approvalPeople.map((person) => person.getAttribute('aria-label')),
      ).toEqual([
        '결재 1 홍길동',
        ...names.map((name, index) => `결재 ${index + 2} ${name}`),
      ]);
      expect(grid.lastElementChild).toBe(approvalPeople[4]);
    } finally {
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it('hides the empty agreement row while preserving the remaining row order', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalInputRow = screen.getByTestId('document-approval-input-row');
    const approvalDisplayRow = screen.getByTestId(
      'document-approval-display-row',
    );
    expect(
      screen.queryByTestId('document-agreement-display-row'),
    ).not.toBeInTheDocument();
    const referenceRow = screen.getByTestId('document-reference-row');
    expect(within(approvalInputRow).getByText('결재선')).toBeInTheDocument();
    expect(within(approvalDisplayRow).getByText('결재')).toBeInTheDocument();
    expect(within(referenceRow).getByText('참조')).toBeInTheDocument();
    expect(
      approvalInputRow.compareDocumentPosition(approvalDisplayRow) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      approvalDisplayRow.compareDocumentPosition(referenceRow) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      within(approvalInputRow).getByRole('combobox', {
        name: '결재선 2 사용자 선택',
      }),
    ).toBeInTheDocument();
    expect(
      within(approvalInputRow).getByRole('button', { name: '결재 추가' }),
    ).toBeDisabled();
    expect(
      within(approvalInputRow).getByRole('button', { name: '합의 추가' }),
    ).toBeDisabled(    );
    expect(approvalDisplayRow).toHaveTextContent('홍길동');
    expect(
      within(referenceRow).getByRole('combobox', { name: '참조자 선택' }),
    ).toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: '문서 작성' });
    const titleSurface = dialog.querySelector('.MuiDialogTitle-root')
      ?.parentElement?.parentElement;
    const contentSurface = dialog.querySelector('.MuiDialogContent-root');
    const footerSurface = dialog.querySelector('.MuiDialogActions-root');
    expect(getComputedStyle(dialog).backgroundColor).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(titleSurface!).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
    expect(getComputedStyle(contentSurface!).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
    expect(getComputedStyle(footerSurface!).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
  });

  it('renders an approval participant in a table column with position, seal, sequence, and name', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const participant = screen.getByTestId('document-approval-person');
    expect(participant).toHaveTextContent('대리');
    expect(participant).toHaveTextContent('1');
    expect(participant).toHaveTextContent('홍길동');
    expect(participant).not.toHaveTextContent('기획팀');
    expect(participant.querySelector('img')).toBeNull();
    expect(
      within(participant).getByLabelText('결재 도장 자리'),
    ).toBeInTheDocument();
    expect(
      within(participant).queryByRole('button', { name: /삭제/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '결재선 2 사용자 선택' }))
      .toBeInTheDocument();
    const selectorControl = screen
      .getByRole('combobox', { name: '결재선 2 사용자 선택' })
      .closest('.MuiInputBase-root');
    const referenceControl = screen
      .getByRole('combobox', { name: '참조자 선택' })
      .closest('.MuiInputBase-root');
    expect(screen.getByTestId('document-approval-grid')).toHaveStyle({
      display: 'grid',
    });
    expect(selectorControl).toHaveStyle({ height: '40px' });
    expect(referenceControl).toHaveStyle({ height: '40px' });
    expect(screen.getByRole('button', { name: '결재 추가' })).toHaveStyle({
      height: '40px',
    });
    expect(screen.getByRole('button', { name: '합의 추가' })).toHaveStyle({
      height: '40px',
    });
  });

  it('wraps approval actions when the composer has a narrow viewport', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalActions = screen
      .getByRole('button', { name: '결재 추가' })
      .parentElement;
    expect(approvalActions).toHaveStyle({ flexWrap: 'wrap' });
  });

  it('renders compact accessible badges, seals, removal actions, and ellipsized names', async () => {
    const approvalName = '홍길동김';
    const agreementName = '김민수';
    const longName = '홍길동김철수';
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category],
      cycleItems: [],
      users: [
        { ...composerUser, userId: 'emp-long-1', userNm: approvalName },
        { ...anotherComposerUser, userId: 'emp-long-2', userNm: agreementName },
        { ...thirdComposerUser, userId: 'emp-long-3', userNm: longName },
      ],
    }, 15000);
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'emp-long-1',
      employeeId: 'emp-long-1',
      name: '기안자',
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: longName } });
    fireEvent.click(
      await screen.findByRole('option', { name: new RegExp(longName) }),
    );
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const agreementPicker = screen.getByRole('combobox', {
      name: '결재선 3 사용자 선택',
    });
    fireEvent.change(agreementPicker, { target: { value: agreementName } });
    fireEvent.click(
      await screen.findByRole('option', { name: new RegExp(agreementName) }),
    );
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));

    const approvals = screen.getAllByTestId('document-approval-person');
    const approval = approvals[0];
    const longApproval = approvals[1];
    const agreement = screen.getByTestId('document-agreement-chip');
    const assertParticipantPresentation = (
      participant: HTMLElement,
      sequence: number,
      fullName: string,
      kind: '결재' | '합의',
    ) => {
      const badge = within(participant).getByText(String(sequence), {
        exact: true,
      });
      expect(badge).toHaveStyle({
        backgroundColor: muiTheme.palette.primary.light,
        borderRadius: '50%',
      });
      expect(badge).toHaveAttribute('aria-label', `참여 순번 ${sequence}`);

      if (kind === '결재') {
        expect(
          within(participant).getByLabelText('결재 도장 자리'),
        ).toBeInTheDocument();
      } else {
        expect(
          within(participant).queryByLabelText('합의 도장 자리'),
        ).toBeNull();
      }
      const removeButton = within(participant).queryByRole('button', {
        name: `${kind} 참여자 ${sequence} ${fullName} 삭제`,
      });
      if (kind === '결재') {
        expect(removeButton).toBeNull();
      } else {
        expect(removeButton).toBeInTheDocument();
      }
      const name = within(participant).getByTitle(fullName);
      expect(name).toHaveStyle({
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      });
      if (kind === '결재') {
        expect(participant).toHaveStyle({ minWidth: '88px' });
        expect(name).not.toHaveStyle({ maxWidth: '3em' });
      } else {
        expect(name).toHaveStyle({ maxWidth: '4em' });
      }
      expect(participant.getAttribute('aria-label')).toContain(fullName);
    };

    assertParticipantPresentation(approval, 1, approvalName, '결재');
    assertParticipantPresentation(agreement, 3, agreementName, '합의');
    const truncatedApprovalName = within(longApproval).getByTitle(longName);
    expect(truncatedApprovalName).toHaveStyle({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });
    expect(longApproval.getAttribute('aria-label')).toBe(
      `결재 2 ${longName}`,
    );
  });

  it('adds selected approval users as ordered individual stages and removes them from candidates', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    expect(
      screen.queryByRole('option', { name: /김민수/ }),
    ).not.toBeInTheDocument();
    expect(
      approvalPicker.closest('.MuiAutocomplete-root'),
    ).toHaveTextContent('김민수');

    expect(screen.getByRole('button', { name: '결재 추가' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const participants = screen.getAllByTestId('document-approval-person');
    expect(participants).toHaveLength(2);
    expect(participants[0]).toHaveTextContent('대리');
    expect(participants[0]).toHaveTextContent('1');
    expect(participants[0]).toHaveTextContent('홍길동');
    expect(participants[1]).toHaveTextContent('과장');
    expect(participants[1]).toHaveTextContent('2');
    expect(participants[1]).toHaveTextContent('김민수');
    expect(participants[0]).not.toHaveTextContent('기획팀');
    expect(participants[1]).not.toHaveTextContent('개발팀');
    expect(
      screen.queryByRole('combobox', { name: '결재선 2' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: '결재선 3' }),
    ).not.toBeInTheDocument();
    const nextApprovalPicker = screen.getByRole('combobox', {
      name: '결재선 3 사용자 선택',
    });
    fireEvent.click(nextApprovalPicker);
    expect(screen.queryByRole('option', { name: /김민수/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /홍길동/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('document-approval-grid')).toHaveStyle({
      display: 'grid',
    });
  });

  it('applies edited stages and references only after confirming the settings dialog', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.keyDown(approvalPicker, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const agreementPicker = screen.getByRole('combobox', {
      name: '결재선 3 사용자 선택',
    });
    fireEvent.change(agreementPicker, { target: { value: '박서준' } });
    fireEvent.click(await screen.findByRole('option', { name: /박서준/ }));
    fireEvent.keyDown(agreementPicker, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));

    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.change(referencePicker, { target: { value: '최민호' } });
    fireEvent.click(await screen.findByRole('option', { name: /최민호/ }));
    fireEvent.keyDown(referencePicker, { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: '결재선 설정' }));
    const settingsDialog = screen.getByRole('dialog', {
      name: '결재선 설정',
    });
    fireEvent.click(
      within(settingsDialog).getByRole('button', {
        name: '결재 2 아래로 이동',
      }),
    );

    const settingsReferencePicker = within(settingsDialog).getByRole(
      'combobox',
      { name: '참조자 선택' },
    );
    const currentReferenceChip = within(
      settingsReferencePicker.closest('.MuiAutocomplete-root')!,
    ).getByText('최민호');
    const currentReferenceDelete = currentReferenceChip
      .closest('.MuiChip-root')
      ?.querySelector('.MuiChip-deleteIcon');
    if (!currentReferenceDelete) {
      throw new Error('Current reference chip delete action is missing.');
    }
    fireEvent.click(currentReferenceDelete);
    fireEvent.change(settingsReferencePicker, {
      target: { value: '이수진' },
    });
    fireEvent.click(await screen.findByRole('option', { name: /이수진/ }));
    fireEvent.keyDown(settingsReferencePicker, { key: 'Escape' });

    fireEvent.click(
      within(settingsDialog).getByRole('button', { name: '취소' }),
    );
    await waitForElementToBeRemoved(settingsDialog);

    expect(
      screen.getByRole('group', { name: '결재 2 김민수' }),
    ).toBeInTheDocument();
    expect(
      within(
        screen
          .getByRole('combobox', { name: '참조자 선택' })
          .closest('.MuiAutocomplete-root')!,
      ).getByText('최민호'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: '결재 3 김민수' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '결재선 설정' }));
    const reopenedDialog = screen.getByRole('dialog', {
      name: '결재선 설정',
    });
    fireEvent.click(
      within(reopenedDialog).getByRole('button', {
        name: '결재 2 아래로 이동',
      }),
    );

    const reopenedReferencePicker = within(reopenedDialog).getByRole(
      'combobox',
      { name: '참조자 선택' },
    );
    const reopenedReferenceChip = within(
      reopenedReferencePicker.closest('.MuiAutocomplete-root')!,
    ).getByText('최민호');
    const reopenedReferenceDelete = reopenedReferenceChip
      .closest('.MuiChip-root')
      ?.querySelector('.MuiChip-deleteIcon');
    if (!reopenedReferenceDelete) {
      throw new Error('Reopened reference chip delete action is missing.');
    }
    fireEvent.click(reopenedReferenceDelete);
    fireEvent.change(reopenedReferencePicker, {
      target: { value: '이수진' },
    });
    fireEvent.click(await screen.findByRole('option', { name: /이수진/ }));
    fireEvent.keyDown(reopenedReferencePicker, { key: 'Escape' });
    fireEvent.click(
      within(reopenedDialog).getByRole('button', { name: '적용' }),
    );
    await waitForElementToBeRemoved(reopenedDialog);

    expect(
      screen.getByRole('group', { name: '결재 3 김민수' }),
    ).toBeInTheDocument();
    const appliedReferenceRoot = screen
      .getByRole('combobox', { name: '참조자 선택' })
      .closest('.MuiAutocomplete-root')!;
    expect(within(appliedReferenceRoot).getByText('이수진')).toBeInTheDocument();
    expect(
      within(appliedReferenceRoot).queryByText('최민호'),
    ).not.toBeInTheDocument();

    const nextApprovalPicker = screen.getByRole('combobox', {
      name: '결재선 4 사용자 선택',
    });
    fireEvent.change(nextApprovalPicker, { target: { value: '최민호' } });
    fireEvent.click(await screen.findByRole('option', { name: /최민호/ }));
    fireEvent.keyDown(nextApprovalPicker, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));
    expect(
      screen.getByRole('group', { name: '결재 4 최민호' }),
    ).toBeInTheDocument();
  }, 15000);

  it('renders each selected agreement user as a wrapped chip and appends the next selector', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    expect(screen.getByRole('button', { name: '결재 추가' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '합의 추가' })).toBeDisabled();
    expect(
      screen.queryByTestId('document-agreement-display-row'),
    ).not.toBeInTheDocument();
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.change(approvalPicker, { target: { value: '박서준' } });
    fireEvent.click(await screen.findByRole('option', { name: /박서준/ }));
    expect(screen.getByRole('button', { name: '결재 추가' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '합의 추가' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));

    const agreementChips = screen.getAllByTestId('document-agreement-chip');
    expect(agreementChips).toHaveLength(2);
    const agreementSequenceBadge = within(agreementChips[0]).getByLabelText(
      '참여 순번 2',
    );
    expect(agreementSequenceBadge).toHaveStyle({
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
    });
    expect(agreementChips[0]).toHaveTextContent('2');
    expect(agreementChips[0]).toHaveTextContent('김민수');
    expect(agreementChips[1]).toHaveTextContent('2');
    expect(agreementChips[1]).toHaveTextContent('박서준');
    agreementChips.forEach((chip) => {
      expect(chip.querySelector('img')).toBeNull();
      expect(chip).not.toHaveTextContent('합의');
      expect(within(chip).queryByLabelText('합의 도장 자리')).toBeNull();
    });
    expect(
      within(agreementChips[0]).getByRole('button', {
        name: '합의 참여자 2 김민수 삭제',
      }),
    ).toBeInTheDocument();
    const approvalRow = screen.getByTestId('document-approval-display-row');
    const agreementRow = screen.getByTestId('document-agreement-display-row');
    const referenceRow = screen.getByTestId('document-reference-row');
    expect(
      approvalRow.compareDocumentPosition(agreementRow) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      agreementRow.compareDocumentPosition(referenceRow) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(screen.getByTestId('document-agreement-list')).toHaveStyle({
      display: 'flex',
      flexWrap: 'wrap',
    });
    expect(
      screen.getByRole('combobox', { name: '결재선 3 사용자 선택' }),
    ).toBeInTheDocument();
  });

  it('removes only the selected agreement user and returns that user to candidates', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    }, 15000);
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.change(approvalPicker, { target: { value: '박서준' } });
    fireEvent.click(await screen.findByRole('option', { name: /박서준/ }));
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));
    fireEvent.click(
      screen.getByRole('button', { name: '합의 참여자 2 김민수 삭제' }),
    );

    expect(screen.getAllByTestId('document-agreement-chip')).toHaveLength(1);
    expect(screen.getByTestId('document-agreement-chip')).toHaveTextContent(
      '박서준',
    );
    expect(
      screen.getByRole('button', { name: '합의 참여자 2 박서준 삭제' }),
    ).toBeInTheDocument();
    const activeApprovalPicker = screen.getByRole('combobox', {
      name: '결재선 3 사용자 선택',
    });
    fireEvent.click(activeApprovalPicker);
    expect(screen.queryByRole('option', { name: /홍길동/ })).toBeNull();
    expect(
      await screen.findByRole('option', { name: /김민수/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /박서준/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: '합의 참여자 2 박서준 삭제' }),
    );
    expect(screen.queryAllByTestId('document-agreement-chip')).toHaveLength(0);
    expect(
      screen.queryByTestId('document-agreement-display-row'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: '결재선 2 사용자 선택' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('combobox', { name: '결재선 2 사용자 선택' }));
    expect(
      await screen.findByRole('option', { name: /김민수/ }),
    ).toBeInTheDocument();
  }, 15000);

  it('numbers participants by stage and renumbers after a removable stage is deleted', async () => {
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category],
      cycleItems: [],
      users: [
        composerUser,
        anotherComposerUser,
        thirdComposerUser,
        fourthComposerUser,
        fifthComposerUser,
      ],
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const addUsers = async (
      selectorNumber: number,
      names: string[],
      actionLabel: '결재 추가' | '합의 추가',
    ) => {
      const picker = screen.getByRole('combobox', {
        name: `결재선 ${selectorNumber} 사용자 선택`,
      });
      for (const name of names) {
        fireEvent.change(picker, { target: { value: name } });
        fireEvent.click(await screen.findByRole('option', { name: new RegExp(name) }));
      }
      fireEvent.click(screen.getByRole('button', { name: actionLabel }));
    };

    await addUsers(2, ['김민수', '박서준'], '합의 추가');
    await addUsers(3, ['이수진'], '결재 추가');
    await addUsers(4, ['최민호'], '결재 추가');

    const approvalPeople = screen.getAllByTestId('document-approval-person');
    const agreementChips = screen.getAllByTestId('document-agreement-chip');
    expect(approvalPeople).toHaveLength(3);
    expect(approvalPeople[0]).toHaveAttribute('aria-label', '결재 1 홍길동');
    expect(approvalPeople[1]).toHaveAttribute('aria-label', '결재 3 이수진');
    expect(approvalPeople[2]).toHaveAttribute('aria-label', '결재 4 최민호');
    expect(agreementChips).toHaveLength(2);
    expect(agreementChips[0]).toHaveAttribute('aria-label', '합의 2 김민수');
    expect(agreementChips[1]).toHaveAttribute('aria-label', '합의 2 박서준');

    fireEvent.click(
      within(approvalPeople[1]).getByRole('button', {
        name: '결재 참여자 3 이수진 삭제',
      }),
    );

    const renumberedApprovals = screen.getAllByTestId('document-approval-person');
    expect(renumberedApprovals).toHaveLength(2);
    expect(renumberedApprovals[0]).toHaveAttribute('aria-label', '결재 1 홍길동');
    expect(renumberedApprovals[1]).toHaveAttribute('aria-label', '결재 3 최민호');
    const renumberedChips = screen.getAllByTestId('document-agreement-chip');
    expect(renumberedChips[0]).toHaveAttribute('aria-label', '합의 2 김민수');
    expect(renumberedChips[1]).toHaveAttribute('aria-label', '합의 2 박서준');
    const nextApprovalPicker = screen.getByRole('combobox', {
      name: '결재선 4 사용자 선택',
    });
    fireEvent.click(nextApprovalPicker);
    expect(
      await screen.findByRole('option', { name: /이수진/ }),
    ).toBeInTheDocument();
    for (const remainingApprover of ['홍길동', '김민수', '박서준', '최민호']) {
      expect(
        screen.queryByRole('option', {
          name: new RegExp(remainingApprover),
        }),
      ).not.toBeInTheDocument();
    }
  }, 15000);

  it('keeps the empty approval selector without an unavailable-user message', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    for (const userName of ['김민수', '박서준', '이수진', '최민호']) {
      const approvalPicker = screen.getByRole('combobox', {
        name: '결재선 2 사용자 선택',
      });
      fireEvent.change(approvalPicker, { target: { value: userName } });
      fireEvent.click(
        await screen.findByRole('option', { name: new RegExp(userName) }),
      );
    }
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    expect(
      screen.getByRole('combobox', { name: '결재선 6 사용자 선택' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('선택 가능한 사용자가 없습니다.'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결재 추가' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '합의 추가' })).toBeDisabled();
  });

  it('keeps reference users separate from approval stages', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.change(referencePicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.change(referencePicker, { target: { value: '박서준' } });
    fireEvent.click(await screen.findByRole('option', { name: /박서준/ }));

    expect(screen.queryByTestId('document-reference-list')).not.toBeInTheDocument();
    expect(referencePicker.closest('.MuiAutocomplete-root')).toHaveTextContent(
      '김민수',
    );
    expect(referencePicker.closest('.MuiAutocomplete-root')).toHaveTextContent(
      '박서준',
    );
    expect(
      screen.queryByRole('option', { name: /홍길동/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('document-approval-person')).toHaveAttribute(
      'aria-label',
      '결재 1 홍길동',
    );
    fireEvent.click(
      screen.getByRole('combobox', { name: '결재선 2 사용자 선택' }),
    );
    expect(screen.queryByRole('option', { name: /김민수/ })).toBeNull();
    expect(screen.queryByRole('option', { name: /박서준/ })).toBeNull();
    expect(screen.queryByLabelText('참조 도장 자리')).toBeNull();
  });

  it('shows a visible error when selected template content cannot be loaded', async () => {
    composerApi.fetchDraftFormTemplate.mockRejectedValue(
      new Error('양식 본문 조회 실패'),
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '기안양식' }));
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));

    const error = await screen.findByText('양식 본문 조회 실패');
    expect(error).toBeInTheDocument();
    expect(error.closest('.MuiDialogContent-root')).not.toBeNull();
    expect(screen.getByTestId('document-composer-layout').firstElementChild)
      .toHaveClass('MuiAlert-colorError');
    expect(
      screen.queryByRole('progressbar', {
        name: '문서 정보 불러오는 중',
      }),
    ).not.toBeInTheDocument();
  });

  it('keeps the editor read-only while a selected template is loading', async () => {
    let resolveTemplate:
      | ((template: typeof draftFormTemplate) => void)
      | undefined;
    composerApi.fetchDraftFormTemplate.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTemplate = resolve;
        }),
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '로딩 중 보존할 제목' },
    });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '기안양식' }));
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));

    expect(
      screen.getByRole('progressbar', {
        name: '문서 정보 불러오는 중',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '본문' })).toBeNull();
    expect(screen.queryByRole('textbox', { name: '제목' })).toBeNull();
    expect(screen.getByRole('tab', { name: '기안서' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '툴바 열기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();

    await act(async () => {
      resolveTemplate?.(draftFormTemplate);
    });

    const editor = await screen.findByRole('textbox', { name: '본문' });
    expect(
      screen.queryByRole('progressbar', {
        name: '문서 정보 불러오는 중',
      }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(editor).toHaveTextContent('양식 본문'));
    expect(editor).toHaveAttribute('contenteditable', 'true');
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue(
      '로딩 중 보존할 제목',
    );
  });

  it('preserves the prior category and body when a dirty category change is cancelled', async () => {
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category, anotherCategory],
      cycleItems: [],
      users: [composerUser, anotherComposerUser],
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '기안양식' }));
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));
    const editor = await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editor).toHaveTextContent('양식 본문'));
    fireEvent.input(editor, {
      target: { innerHTML: '<p>작성자 수정 본문</p>' },
    });
    await waitFor(() => expect(editor).toHaveTextContent('작성자 수정 본문'));

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '구분' }));
    fireEvent.click(await screen.findByRole('option', { name: '프로젝트' }));
    const replacementDialog = screen.getByRole('dialog', {
      name: '작성 중인 본문 교체',
    });
    fireEvent.click(within(replacementDialog).getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: '작성 중인 본문 교체' }),
    );

    expect(screen.getByRole('combobox', { name: '구분' })).toHaveTextContent(
      '전체',
    );
    expect(screen.getByRole('combobox', { name: '기안양식' })).toHaveTextContent(
      '정기점검',
    );
    expect(editor).toHaveTextContent('작성자 수정 본문');
  });

  it('confirms replacing an edited template and preserves content when cancelled', async () => {
    composerApi.fetchDraftForms.mockResolvedValue([
      draftForm,
      {
        ...draftForm,
        draftingWorkCategoryId: 78,
        codeName: '다른 양식',
        categoryItemId: 102,
      },
    ]);
    composerApi.fetchDraftFormTemplate.mockImplementation(
      async (formId: number) =>
        formId === 77
          ? draftFormTemplate
          : {
              ...draftFormTemplate,
              draftingWorkCategoryId: 78,
              codeName: '다른 양식',
              templateJson: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: '새 양식 본문' },
                    ],
                  },
                ],
              },
              templateHtml: '<p>새 양식 본문</p>',
            },
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const formSelector = screen.getByRole('combobox', { name: '기안양식' });
    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));
    const editor = await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editor).toHaveTextContent('양식 본문'));

    fireEvent.input(editor, {
      target: { innerHTML: '<p>작성자 수정 본문</p>' },
    });
    await waitFor(() => expect(editor).toHaveTextContent('작성자 수정 본문'));

    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '다른 양식' }));
    const replacementDialog = screen.getByRole('dialog', {
      name: '작성 중인 본문 교체',
    });
    fireEvent.click(within(replacementDialog).getByRole('button', { name: '취소' }));

    expect(formSelector).toHaveTextContent('정기점검');
    expect(editor).toHaveTextContent('작성자 수정 본문');
    expect(composerApi.fetchDraftFormTemplate).toHaveBeenCalledTimes(1);
  });

  it('replaces the edited body after confirming a different template', async () => {
    composerApi.fetchDraftForms.mockResolvedValue([
      draftForm,
      {
        ...draftForm,
        draftingWorkCategoryId: 78,
        codeName: '다른 양식',
        categoryItemId: 102,
      },
    ]);
    composerApi.fetchDraftFormTemplate.mockImplementation(
      async (formId: number) =>
        formId === 77
          ? draftFormTemplate
          : {
              ...draftFormTemplate,
              draftingWorkCategoryId: 78,
              codeName: '다른 양식',
              templateJson: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: '새 양식 본문' },
                    ],
                  },
                ],
              },
              templateHtml: '<p>새 양식 본문</p>',
            },
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    const formSelector = screen.getByRole('combobox', { name: '기안양식' });
    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));
    const editor = await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editor).toHaveTextContent('양식 본문'));

    fireEvent.input(editor, {
      target: { innerHTML: '<p>작성자 수정 본문</p>' },
    });
    await waitFor(() => expect(editor).toHaveTextContent('작성자 수정 본문'));
    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '다른 양식' }));

    const replacementDialog = screen.getByRole('dialog', {
      name: '작성 중인 본문 교체',
    });
    fireEvent.click(within(replacementDialog).getByRole('button', { name: '교체' }));

    await waitFor(() => expect(editor).toHaveTextContent('새 양식 본문'));
    expect(formSelector).toHaveTextContent('다른 양식');
  });

  it('clears the compose title when the dialog closes and reopens', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));
    fireEvent.keyDown(
      screen.getByRole('combobox', { name: '결재선 3 사용자 선택' }),
      { key: 'Escape' },
    );
    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.change(referencePicker, { target: { value: '박서준' } });
    fireEvent.click(await screen.findByRole('option', { name: /박서준/ }));
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '작성 중 제목' },
    });
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue(
      '작성 중 제목',
    );

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: '문서 작성' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('');
    expect(screen.getByTestId('document-approval-person')).toHaveAttribute(
      'aria-label',
      '결재 1 홍길동',
    );
    expect(screen.queryByTestId('document-reference-list')).not.toBeInTheDocument();
    expect(
      screen
        .getByRole('combobox', { name: '참조자 선택' })
        .closest('.MuiAutocomplete-root'),
    ).not.toHaveTextContent(/박서준/);
  }, 10000);

  it('saves the document payload and reuses its ID on subsequent saves', async () => {
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '초안 제목' },
    });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(composerApi.saveDocumentDraft).toHaveBeenCalledTimes(1),
    );
    const firstRequest = composerApi.saveDocumentDraft.mock.calls[0][0];
    expect(composerApi.saveDocumentDraft.mock.calls[0][1]).toBeNull();
    expect(firstRequest).toMatchObject({
      documentType: 'DRAFTING',
      draftingWorkCategoryId: null,
      title: '초안 제목',
      approvalLines: [
        expect.objectContaining({
          stageOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
        }),
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(composerApi.saveDocumentDraft).toHaveBeenCalledTimes(2),
    );
    expect(composerApi.saveDocumentDraft.mock.calls[1][1]).toBe(77);
    await waitFor(() =>
      expect(composerNotifications.showSuccess).toHaveBeenCalledTimes(2),
    );
    expect(composerNotifications.showSuccess).toHaveBeenNthCalledWith(
      2,
      '문서가 임시저장되었습니다.',
    );
    const dialog = screen.getByRole('dialog', { name: '문서 작성' });
    expect(dialog.querySelector('[role="alert"]')).toBeNull();
    const titleHeader = dialog.querySelector('.MuiDialogTitle-root')?.parentElement;
    expect(titleHeader).toHaveTextContent('임시저장 문서 ID: 77');
    expect(dialog.querySelector('.MuiDialogContent-root')).not.toHaveTextContent(
      '임시저장 문서 ID: 77',
    );
  });

  it('saves the latest draft before submitting and closes after submission succeeds', async () => {
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '상신할 문서' },
    });
    const approverPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approverPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    fireEvent.click(screen.getByRole('button', { name: '결재신청' }));

    await waitFor(() =>
      expect(composerApi.submitDocumentApproval).toHaveBeenCalledTimes(1),
    );
    expect(composerApi.saveDocumentDraft).toHaveBeenCalledTimes(1);
    expect(composerApi.submitDocumentApproval).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        title: '상신할 문서',
        approvalLines: [
          expect.objectContaining({
            stageOrder: 1,
            participantType: 'APPROVAL',
            participantUserId: 'emp-1',
          }),
          expect.objectContaining({
            stageOrder: 2,
            participantType: 'APPROVAL',
            participantUserId: 'emp-2',
          }),
        ],
      }),
    );
    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: '문서 작성' }),
    );
    expect(composerNotifications.showSuccess).toHaveBeenCalledWith(
      '문서가 결재신청되었습니다.',
    );
  }, 15000);

  it('uploads pasted images and includes editor image metadata in the draft request', async () => {
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '이미지 초안' },
    });
    const editor = screen.getByRole('textbox', { name: '본문' });
    const file = new File(['png data'], 'pasted.png', { type: 'image/png' });

    fireEvent.paste(editor, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
        getData: () => '',
      },
    });

    await waitFor(() =>
      expect(composerApi.uploadDocumentDraftEmbeddedImage).toHaveBeenCalledWith(file),
    );
    await waitFor(() =>
      expect(editor.querySelector('img')).toHaveAttribute(
        'src',
        'https://minio.example/approval-preview',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(composerApi.saveDocumentDraft).toHaveBeenCalledOnce(),
    );

    const request = composerApi.saveDocumentDraft.mock.calls[0][0];
    expect(request.contentsHtml).toContain('data-upload-token="approval-image-token"');
    expect(JSON.stringify(request.contentsJson)).toContain('"data-upload-token":"approval-image-token"');
    expect(request).toMatchObject({
      embeddedImages: [
        expect.objectContaining({
          uploadToken: 'approval-image-token',
          fileName: 'pasted.png',
          imageUrl: 'https://minio.example/approval-preview',
          objectKey: 'tenant/1/embedded-image-temp/approval-image-token/pasted.png',
          fileSize: 8,
          mimeType: 'image/png',
        }),
      ],
      temporaryImages: [
        {
          uploadToken: 'approval-image-token',
          fileName: 'pasted.png',
        },
      ],
    });
    expect(composerApi.deleteDocumentDraftEmbeddedImage).not.toHaveBeenCalled();
  });

  it('prevents saving while a pasted image upload is pending and reports upload failures', async () => {
    let resolveUpload!: (value: {
      src: string;
      alt: string;
      fileName: string;
      uploadToken: string;
      fileSize: number;
      mimeType: string;
      objectKey: string;
    }) => void;
    composerApi.uploadDocumentDraftEmbeddedImage.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '업로드 대기 초안' },
    });
    const editor = screen.getByRole('textbox', { name: '본문' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => new File(['png'], 'pending.png', { type: 'image/png' }),
          },
        ],
        getData: () => '',
      },
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '이미지 업로드 중...' })).toBeDisabled(),
    );
    expect(composerApi.saveDocumentDraft).not.toHaveBeenCalled();
    resolveUpload({
      src: 'https://minio.example/pending-preview',
      alt: 'pending.png',
      fileName: 'pending.png',
      uploadToken: 'pending-token',
      fileSize: 3,
      mimeType: 'image/png',
      objectKey: 'tenant/1/embedded-image-temp/pending-token/pending.png',
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '저장' })).toBeEnabled(),
    );

    composerApi.uploadDocumentDraftEmbeddedImage.mockRejectedValueOnce(
      new Error('upload failed'),
    );
    fireEvent.paste(editor, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => new File(['bad'], 'failed.png', { type: 'image/png' }),
          },
        ],
        getData: () => '',
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '본문 이미지 업로드에 실패했습니다.',
    );
    expect(editor.querySelector('img')).not.toBeInTheDocument();
  });

  it('deletes temporary pasted images when the composer is closed without saving', async () => {
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    const editor = screen.getByRole('textbox', { name: '본문' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => new File(['png'], 'pasted.png', { type: 'image/png' }),
          },
        ],
        getData: () => '',
      },
    });
    await waitFor(() =>
      expect(editor.querySelector('img')).toHaveAttribute(
        'src',
        'https://minio.example/approval-preview',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: '문서 작성' }),
    );
    await waitFor(() =>
      expect(composerApi.deleteDocumentDraftEmbeddedImage).toHaveBeenCalledWith(
        'approval-image-token',
        'pasted.png',
      ),
    );
  });

  it('keeps failed attachments and retries them individually', async () => {
    composerApi.uploadDocumentDraftAttachment
      .mockRejectedValueOnce(new Error('definite failure'))
      .mockResolvedValueOnce({
        fileId: 502,
        fileName: 'evidence.txt',
        fileSize: 8,
      });
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '첨부 포함 초안' },
    });
    const file = new File(['evidence'], 'evidence.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('첨부 파일 선택'), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const failedRow = await screen.findByTestId(
      'document-composer-attachment-failed',
    );
    expect(
      within(failedRow).getByTestId('document-composer-attachment-status'),
    ).toHaveTextContent('실패');
    expect(within(failedRow).queryByText('definite failure')).not.toBeInTheDocument();
    const partialUploadAlert = screen
      .getByRole('dialog', { name: '문서 작성' })
      .querySelector('.MuiDialogContent-root [role="alert"]');
    expect(partialUploadAlert).toHaveClass('MuiAlert-colorError');
    expect(partialUploadAlert).toHaveTextContent(
      '문서는 저장되었지만 첨부파일 1건의 상태 확인이 필요합니다.',
    );
    expect(composerNotifications.showSuccess).not.toHaveBeenCalled();
    expect(composerApi.uploadDocumentDraftAttachment).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '재시도' }));
    await waitFor(() =>
      expect(
        screen.getByTestId('document-composer-attachment-uploaded'),
      ).toBeInTheDocument(),
    );
    expect(composerApi.uploadDocumentDraftAttachment).toHaveBeenCalledTimes(2);
    const uploadedRow = screen.getByTestId(
      'document-composer-attachment-uploaded',
    );
    expect(
      within(uploadedRow).getByTestId('document-composer-attachment-status'),
    ).toHaveTextContent('완료');
    expect(within(uploadedRow).queryByText('업로드 완료')).not.toBeInTheDocument();
  });

  it('keeps retry failures in the composer error area', async () => {
    composerApi.uploadDocumentDraftAttachment
      .mockRejectedValueOnce(new Error('definite failure'))
      .mockRejectedValueOnce(new Error('definite failure'));
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '첨부 재시도 실패 초안' },
    });
    const file = new File(['evidence'], 'evidence.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('첨부 파일 선택'), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(
      await screen.findByTestId('document-composer-attachment-failed'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '재시도' }));
    await waitFor(() =>
      expect(composerApi.uploadDocumentDraftAttachment).toHaveBeenCalledTimes(2),
    );

    const error = screen
      .getByRole('dialog', { name: '문서 작성' })
      .querySelector('.MuiDialogContent-root [role="alert"]');
    expect(error).toHaveClass('MuiAlert-colorError');
    expect(error).toHaveTextContent(
      '문서는 저장되었지만 첨부파일 1건의 상태 확인이 필요합니다.',
    );
  });

  it('keeps attachment deletion failures in the composer error area', async () => {
    composerApi.deleteDocumentDraftAttachment.mockRejectedValueOnce(
      new Error('첨부 삭제 실패'),
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '첨부 삭제 실패 초안' },
    });
    fireEvent.change(screen.getByLabelText('첨부 파일 선택'), {
      target: {
        files: [new File(['evidence'], 'evidence.txt', { type: 'text/plain' })],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(
        screen.getByTestId('document-composer-attachment-uploaded'),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: '첨부 파일 삭제' }));
    await waitFor(() =>
      expect(composerApi.deleteDocumentDraftAttachment).toHaveBeenCalledTimes(1),
    );

    const error = await within(
      screen.getByRole('dialog', { name: '문서 작성' }),
    ).findByRole('alert');
    expect(error.closest('.MuiDialogContent-root')).not.toBeNull();
    expect(error).toHaveTextContent('첨부 삭제 실패');
    expect(error).toHaveClass('MuiAlert-colorError');
  });

  it('keeps unresolved attachment errors after deleting a confirmed file', async () => {
    composerApi.uploadDocumentDraftAttachment
      .mockResolvedValueOnce({
        fileId: 504,
        fileName: 'confirmed.txt',
        fileSize: 9,
      })
      .mockRejectedValueOnce(new Error('definite failure'));
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '첨부 부분 실패 후 삭제 초안' },
    });
    fireEvent.change(screen.getByLabelText('첨부 파일 선택'), {
      target: {
        files: [
          new File(['evidence1'], 'confirmed.txt', { type: 'text/plain' }),
          new File(['evidence2'], 'failed.txt', { type: 'text/plain' }),
        ],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const uploadedAttachment = await screen.findByTestId(
      'document-composer-attachment-uploaded',
    );
    await screen.findByTestId('document-composer-attachment-failed');
    fireEvent.click(
      within(uploadedAttachment).getByRole('button', {
        name: '첨부 파일 삭제',
      }),
    );
    await waitFor(() =>
      expect(composerApi.deleteDocumentDraftAttachment).toHaveBeenCalledTimes(1),
    );

    expect(
      screen
        .getByRole('dialog', { name: '문서 작성' })
        .querySelector('.MuiDialogContent-root [role="alert"]'),
    ).toHaveTextContent(
      '문서는 저장되었지만 첨부파일 1건의 상태 확인이 필요합니다.',
    );
  });

  it('keeps save failures in the composer error area without a success toast', async () => {
    composerApi.saveDocumentDraft.mockRejectedValueOnce(
      new Error('문서 저장 실패'),
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '저장 실패 초안' },
    });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    const error = await screen.findByText('문서 저장 실패');
    expect(error.closest('.MuiDialogContent-root')).not.toBeNull();
    expect(error.closest('.MuiAlert-root')).toHaveClass(
      'MuiAlert-colorError',
    );
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue(
      '저장 실패 초안',
    );
    expect(composerNotifications.showSuccess).not.toHaveBeenCalled();
  });

  it('marks an ambiguous upload as unknown and does not retry it automatically', async () => {
    composerApi.uploadDocumentDraftAttachment.mockRejectedValueOnce(
      new Error('network disconnected'),
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '네트워크 확인 초안' },
    });
    const file = new File(['evidence'], 'evidence.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('첨부 파일 선택'), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(
      await screen.findByRole('button', { name: '상태 확인' }),
    ).toBeInTheDocument();
    const unknownRow = screen.getByTestId(
      'document-composer-attachment-unknown',
    );
    expect(
      within(unknownRow).getByTestId('document-composer-attachment-status'),
    ).toHaveTextContent('확인 필요');
    expect(
      within(unknownRow).queryByText('업로드 결과 확인 필요'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '재시도' }),
    ).not.toBeInTheDocument();
    expect(composerApi.uploadDocumentDraftAttachment).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '상태 확인' }));
    const error = await within(
      screen.getByRole('dialog', { name: '문서 작성' }),
    ).findByRole('alert');
    expect(error).toHaveTextContent(
      '파일 목록에서 업로드 여부를 확인하지 못했습니다.',
    );
    expect(error).toHaveClass('MuiAlert-colorError');
    expect(error).toHaveTextContent(
      '파일 목록에서 업로드 여부를 확인하지 못했습니다.',
    );
    expect(composerApi.uploadDocumentDraftAttachment).toHaveBeenCalledTimes(1);
  });

  it('shows a success toast when an ambiguous attachment is confirmed', async () => {
    composerApi.uploadDocumentDraftAttachment.mockRejectedValueOnce(
      new Error('network disconnected'),
    );
    composerApi.listDocumentDraftAttachments.mockResolvedValueOnce([
      { fileId: 503, fileName: 'evidence.txt', fileSize: 8 },
    ]);
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '첨부 확인 초안' },
    });
    fireEvent.change(screen.getByLabelText('첨부 파일 선택'), {
      target: {
        files: [new File(['evidence'], 'evidence.txt', { type: 'text/plain' })],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    fireEvent.click(await screen.findByRole('button', { name: '상태 확인' }));

    await waitFor(() =>
      expect(composerNotifications.showSuccess).toHaveBeenCalledWith(
        '첨부파일 업로드가 확인되었습니다.',
      ),
    );
    expect(
      screen.getByTestId('document-composer-attachment-uploaded'),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole('dialog', { name: '문서 작성' })
        .querySelector('.MuiDialogContent-root [role="alert"]'),
    ).toBeNull();
  });
});
