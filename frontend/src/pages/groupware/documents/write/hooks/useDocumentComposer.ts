import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import dayjs from 'dayjs';
import { useTheme } from '@mui/material/styles';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import {
  fetchDraftFormOptions,
  fetchDraftForms,
} from '../../../../co/workflow/form/services/draftFormManagement.service';
import { fetchDraftFormTemplate } from '../../../../co/workflow/form/services/draftFormTemplate.service';
import { fetchMyProfile } from '../../../../dashboard/services/profileSettings.service';
import type {
  DraftFormRow,
  DraftFormUserOption,
} from '../../../../co/workflow/form/types/draftFormManagement.types';
import type { F1GridUserOption } from '../../../../../shared/components/f1-grid/types/grid.types';
import { useRichTextEditorSaveLifecycle } from '../../../../../shared/components/rich-text-editor/useRichTextEditorSaveLifecycle';
import type {
  DocumentApprovalDraftRequest,
  DocumentApprovalDetail,
  DocumentApprovalStage,
  DocumentDraftAttachment,
  DocumentDraftAttachmentStatus,
  DocumentKind,
} from '../types/documentWrite.types';
import {
  deleteDocumentDraftAttachment,
  deleteDocumentDraftEmbeddedImage,
  fetchApprovalEmbeddedImageBlob,
  isDefiniteAttachmentUploadFailure,
  listDocumentDraftAttachments,
  saveDocumentDraft,
  submitDocumentApproval,
  UnknownAttachmentUploadOutcomeError,
  uploadDocumentDraftAttachment,
  uploadDocumentDraftEmbeddedImage,
} from '../services/documentApproval.service';
import type { F1GridUserValue } from '../../../../../shared/components/f1-grid/editing/UserSelectEditor';

export const ALL_CATEGORY_VALUE = '__all__';

function getDocumentType(kind: DocumentKind) {
  const documentTypes: Record<DocumentKind, DocumentApprovalDraftRequest['documentType']> = {
    기안서: 'DRAFTING',
    업무연락: 'BUSINESS_CONTACT',
    지출결의서: 'EXPENSE_RESOLUTION',
    근태신청: 'ATTENDANCE_APPLICATION',
  };
  return documentTypes[kind];
}

const kindByDocumentType: Record<
  DocumentApprovalDraftRequest['documentType'],
  DocumentKind
> = {
  DRAFTING: '기안서',
  BUSINESS_CONTACT: '업무연락',
  EXPENSE_RESOLUTION: '지출결의서',
  ATTENDANCE_APPLICATION: '근태신청',
};

function toUserOption(user: DraftFormUserOption): F1GridUserOption {
  return {
    value: user.userId.trim(),
    label: user.userNm,
    avatarUrl: user.profileImage,
    positionName: user.levelNm,
    departmentName: user.departmentNm,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : '기안서 작성 정보를 불러오지 못했습니다.';
}

function getTemplateErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : '기안양식 본문을 불러오지 못했습니다.';
}

function toUserIds(value: F1GridUserValue): string[] {
  if (Array.isArray(value)) return [...new Set(value.map(String))];
  return value == null ? [] : [String(value)];
}

export function useDocumentComposer(
  open: boolean,
  onClose: () => void,
  initialDocument: DocumentApprovalDetail | null = null,
) {
  const theme = useTheme();
  const { showSuccess } = useNotification();
  const isDark = theme.palette.mode === 'dark';
  const editorSurfaceBackground = isDark ? '#1e293b' : '#ffffff';
  const fieldSurfaceBackground = isDark ? '#1e293b' : '#ffffff';
  const [activeDocumentKind, setActiveDocumentKind] =
    useState<DocumentKind>('기안서');
  const [pendingDocumentKind, setPendingDocumentKind] = useState<DocumentKind | null>(null);
  const [drafterUser, setDrafterUser] = useState<F1GridUserOption | null>(null);
  const [composerTitle, setComposerTitle] = useState('');
  const [attachments, setAttachments] = useState<DocumentDraftAttachment[]>([]);
  const [electronicApprovalId, setElectronicApprovalId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [drafterName, setDrafterName] = useState('');
  const [categoryItems, setCategoryItems] = useState<
    Awaited<ReturnType<typeof fetchDraftFormOptions>>['categoryItems']
  >([]);
  const [draftForms, setDraftForms] = useState<DraftFormRow[]>([]);
  const [userOptions, setUserOptions] = useState<F1GridUserOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState(ALL_CATEGORY_VALUE);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateReplaceConfirmOpen, setTemplateReplaceConfirmOpen] =
    useState(false);
  const [pendingSelection, setPendingSelection] = useState<{
    categoryId: string;
    formId: string;
  } | null>(null);
  const [approvalStages, setApprovalStages] = useState<
    DocumentApprovalStage[]
  >([]);
  const [selectedApprovalUserIds, setSelectedApprovalUserIds] = useState<
    string[]
  >([]);
  const [referenceUserIds, setReferenceUserIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState('');
  const [initialLookupsComplete, setInitialLookupsComplete] = useState(false);
  const draftDate = open ? dayjs().format('YYYY-MM-DD') : '';
  const isLoading = open && !initialLookupsComplete;
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const nextStageId = useRef(1);
  const editorBaseline = useRef<string | null>(null);
  const templateRequestId = useRef(0);
  const nextAttachmentId = useRef(1);
  const draftIdRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const imageSaveLifecycle = useRichTextEditorSaveLifecycle({
    editor,
    uploadImage: uploadDocumentDraftEmbeddedImage,
    deleteTemporaryImage: ({ uploadToken, fileName }) =>
      deleteDocumentDraftEmbeddedImage(uploadToken, fileName),
    onImageUploadError: (message) => {
      setSaveError((current) => {
        if (message) return message;
        return current === '본문 이미지 업로드에 실패했습니다.' ? '' : current;
      });
    },
  });

  useEffect(() => {
    if (!editor || !open || !initialDocument) return;

    let active = true;
    const previewUrls = new Map<string, string>();
    const failedSources = new Set<string>();
    const syncImagePreviews = () => {
      editor.view.dom
        .querySelectorAll<HTMLImageElement>('img')
        .forEach((image) => {
          const source = image.getAttribute('src') ?? '';
          const previewUrl = previewUrls.get(source);
          if (previewUrl) {
            image.setAttribute('src', previewUrl);
          } else if (failedSources.has(source)) {
            image.removeAttribute('src');
          }
        });
    };
    const requestedSources = new Set<string>();
    const imageRequests = Array.from(
      editor.view.dom.querySelectorAll<HTMLImageElement>('img'),
    ).flatMap((image) => {
      const source = image.getAttribute('src') ?? '';
      const match = source.match(
        new RegExp(
          `^/api/v1/groupware/approvals/${initialDocument.electronicApprovalId}/embedded-images/(\\d+)$`,
        ),
      );
      const fileId = Number(match?.[1]);
      if (
        !match ||
        !Number.isSafeInteger(fileId) ||
        fileId <= 0 ||
        requestedSources.has(source)
      ) {
        return [];
      }
      requestedSources.add(source);
      return [{ source, fileId }];
    });

    if (imageRequests.length === 0) return;

    editor.on('update', syncImagePreviews);
    void Promise.allSettled(
      imageRequests.map(async (request) => ({
        ...request,
        blob: await fetchApprovalEmbeddedImageBlob(
          initialDocument.electronicApprovalId,
          request.fileId,
        ),
      })),
    ).then((results) => {
      if (!active) return;

      let failed = false;
      results.forEach((result, index) => {
        const request = imageRequests[index];
        if (!request) return;
        if (result.status === 'rejected') {
          failedSources.add(request.source);
          failed = true;
          return;
        }
        const objectUrl = URL.createObjectURL(result.value.blob);
        previewUrls.set(request.source, objectUrl);
      });
      syncImagePreviews();
      if (failed) setSaveError('본문 이미지를 불러오지 못했습니다.');
    });

    return () => {
      active = false;
      editor.off('update', syncImagePreviews);
      const originalSourcesByPreviewUrl = new Map(
        Array.from(previewUrls, ([source, previewUrl]) => [
          previewUrl,
          source,
        ]),
      );
      editor.view.dom
        .querySelectorAll<HTMLImageElement>('img')
        .forEach((image) => {
          const source = image.getAttribute('src') ?? '';
          const originalSource = originalSourcesByPreviewUrl.get(source);
          if (originalSource) image.setAttribute('src', originalSource);
        });
      previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, [editor, initialDocument, open]);

  useEffect(() => {
    if (!open) return;

    let active = true;
    void Promise.all([
      fetchDraftFormOptions(),
      fetchDraftForms(),
      fetchMyProfile(),
    ])
      .then(([options, forms, profile]) => {
        if (!active) return;

        setCategoryItems(options.categoryItems);
        const availableUsers = options.users.map(toUserOption);
        setUserOptions(availableUsers);
        setDraftForms(forms);
        if (!profile.name?.trim()) {
          setLoadError('로그인 사용자의 이름을 확인할 수 없습니다.');
          return;
        }
        setDrafterName(profile.name.trim());
        const signedInEmployeeId = String(profile.employeeId ?? '').trim();
        if (!signedInEmployeeId) {
          setLoadError('로그인 사용자의 사원 ID를 확인할 수 없습니다.');
          return;
        }
        const signedInUser =
          availableUsers.find(
            (user) => String(user.value).trim() === signedInEmployeeId,
          ) ?? {
            value: signedInEmployeeId,
            label: profile.name.trim(),
            avatarUrl: profile.profileImage,
            positionName: profile.levelName,
            departmentName: profile.departmentName,
          };
        setDrafterUser(signedInUser);
        setApprovalStages([
          {
            id: nextStageId.current++,
            kind: 'approval',
            users: [signedInUser],
            isFixed: true,
          },
        ]);
        if (initialDocument) {
          const authorLine = initialDocument.approvalLines.find(
            (line) =>
              line.stageOrder === 1 &&
              line.participantType === 'APPROVAL' &&
              line.participantUserId === signedInEmployeeId,
          );
          const isBusinessContact = initialDocument.documentType === 'BUSINESS_CONTACT';
          if (!isBusinessContact && !authorLine) {
            setLoadError('저장된 결재선에서 기안자를 확인할 수 없습니다.');
            return;
          }
          setElectronicApprovalId(initialDocument.electronicApprovalId);
          draftIdRef.current = initialDocument.electronicApprovalId;
          setComposerTitle(initialDocument.title);
          setAttachments(
            initialDocument.attachments.map((attachment) => ({
              clientId: `existing-${attachment.fileId}`,
              file: null,
              fileId: attachment.fileId,
              fileName: attachment.fileName,
              fileSize: attachment.fileSize,
              mimeType: attachment.mimeType,
              status: 'uploaded',
            })),
          );
          setActiveDocumentKind(kindByDocumentType[initialDocument.documentType]);
          setSelectedFormId(
            initialDocument.draftingWorkCategoryId === null
              ? ''
              : String(initialDocument.draftingWorkCategoryId),
          );
          const matchingForm = forms.find(
            (form) =>
              form.draftingWorkCategoryId === initialDocument.draftingWorkCategoryId,
          );
          setSelectedCategoryId(
            matchingForm ? String(matchingForm.categoryItemId) : ALL_CATEGORY_VALUE,
          );
          const lineStages = new Map<number, DocumentApprovalStage>();
          const references: string[] = [];
          for (const line of [...initialDocument.approvalLines].sort(
            (left, right) =>
              left.stageOrder - right.stageOrder ||
              left.participantOrder - right.participantOrder,
          )) {
            if (line.participantType === 'REFERENCE') {
              references.push(line.participantUserId);
              continue;
            }
            if (isBusinessContact || line.electronicApprovalLineId === authorLine?.electronicApprovalLineId) {
              continue;
            }
            let stage = lineStages.get(line.stageOrder);
            if (!stage) {
              stage = {
                id: nextStageId.current++,
                kind: line.participantType === 'AGREEMENT' ? 'agreement' : 'approval',
                users: [],
              };
              lineStages.set(line.stageOrder, stage);
            }
            const participant =
              availableUsers.find(
                (user) => String(user.value) === line.participantUserId,
              ) ?? {
                value: line.participantUserId,
                label: line.participantName,
                departmentName: line.participantDepartmentName ?? undefined,
              };
            stage.users.push(participant);
          }
          setApprovalStages(isBusinessContact ? [] : [
            {
              id: nextStageId.current++,
              kind: 'approval',
              users: [signedInUser],
              isFixed: true,
            },
            ...Array.from(lineStages.values()),
          ]);
          setReferenceUserIds(references);
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setInitialLookupsComplete(true);
      });

    return () => {
      active = false;
    };
  }, [initialDocument, open]);

  const availableForms = useMemo(
    () =>
      draftForms.filter(
        (form) =>
          form.useAt === 'Y' &&
          form.hasDocument &&
          (selectedCategoryId === ALL_CATEGORY_VALUE ||
            String(form.categoryItemId) === selectedCategoryId),
      ),
    [draftForms, selectedCategoryId],
  );

  const applyDocumentKind = (kind: DocumentKind) => {
    setActiveDocumentKind(kind);
    setApprovalStages(kind === '기안서' && drafterUser ? [{
      id: nextStageId.current++,
      kind: 'approval',
      users: [drafterUser],
      isFixed: true,
    }] : []);
    setSelectedApprovalUserIds([]);
    setReferenceUserIds([]);
    setPendingDocumentKind(null);
  };

  const requestDocumentKindChange = (kind: DocumentKind) => {
    if (
      kind === activeDocumentKind || (kind !== '기안서' && kind !== '업무연락') ||
      isLoading || templateLoading || isSaving || imageSaveLifecycle.uploadingCount > 0
    ) return;
    setPendingDocumentKind(kind);
  };

  const confirmDocumentKindChange = () => {
    if (pendingDocumentKind !== null) applyDocumentKind(pendingDocumentKind);
  };

  const cancelDocumentKindChange = () => setPendingDocumentKind(null);
  const referenceUserOptions = userOptions.filter(
    (user) => String(user.value) !== String(drafterUser?.value),
  );

  const handleEditorReady = useCallback((nextEditor: Editor | null) => {
    setEditor(nextEditor);
    if (nextEditor) {
      if (initialDocument) {
        nextEditor.commands.setContent(initialDocument.contentsHtml, {
          emitUpdate: false,
        });
      }
      editorBaseline.current = JSON.stringify(nextEditor.getJSON());
    }
  }, [initialDocument]);

  const applyDraftSelection = useCallback(
    async (selection: { categoryId: string; formId: string }) => {
      const requestId = ++templateRequestId.current;
      setTemplateError('');
      setTemplateLoading(Boolean(selection.formId));

      try {
        if (!editor) {
          throw new Error('본문 편집기가 준비되지 않았습니다.');
        }
        let content: JSONContent | string = '<p></p>';
        if (selection.formId) {
          const template = await fetchDraftFormTemplate(
            Number(selection.formId),
          );
          if (requestId !== templateRequestId.current) return;
          content =
            (template.templateJson as JSONContent | null) ??
            template.templateHtml ??
            '<p></p>';
        }
        if (requestId !== templateRequestId.current) return;
        editor.commands.setContent(content, { emitUpdate: false });
        editorBaseline.current = JSON.stringify(editor.getJSON());
        setSelectedCategoryId(selection.categoryId);
        setSelectedFormId(selection.formId);
      } catch (error: unknown) {
        if (requestId === templateRequestId.current) {
          setTemplateError(getTemplateErrorMessage(error));
        }
      } finally {
        if (requestId === templateRequestId.current) {
          setTemplateLoading(false);
        }
      }
    },
    [editor],
  );

  const requestDraftSelection = useCallback(
    (selection: { categoryId: string; formId: string }) => {
      if (
        selection.categoryId === selectedCategoryId &&
        selection.formId === selectedFormId
      ) {
        return;
      }
      const bodyHasChanges =
        editor !== null &&
        editorBaseline.current !== null &&
        JSON.stringify(editor.getJSON()) !== editorBaseline.current;
      if (bodyHasChanges) {
        setPendingSelection(selection);
        setTemplateReplaceConfirmOpen(true);
        return;
      }
      void applyDraftSelection(selection);
    },
    [applyDraftSelection, editor, selectedCategoryId, selectedFormId],
  );

  const handleCategoryChange = (categoryId: string) => {
    requestDraftSelection({ categoryId, formId: '' });
  };

  const handleFormChange = (formId: string) => {
    requestDraftSelection({ categoryId: selectedCategoryId, formId });
  };

  const cancelTemplateReplacement = () => {
    setPendingSelection(null);
    setTemplateReplaceConfirmOpen(false);
  };

  const confirmTemplateReplacement = () => {
    const selection = pendingSelection;
    setPendingSelection(null);
    setTemplateReplaceConfirmOpen(false);
    if (selection) void applyDraftSelection(selection);
  };

  const selectedApprovalUsers = useMemo(
    () =>
      selectedApprovalUserIds
        .map((id) =>
          userOptions.find((user) => String(user.value) === id),
        )
        .filter((user): user is F1GridUserOption => Boolean(user)),
    [selectedApprovalUserIds, userOptions],
  );

  const addApproval = useCallback(() => {
    const assignedUserIds = new Set(
      approvalStages.flatMap((stage) =>
        stage.users.map((user) => String(user.value)),
      ),
    );
    const referenceIds = new Set(referenceUserIds);
    const eligibleUsers = selectedApprovalUsers.filter(
      (user) =>
        !assignedUserIds.has(String(user.value)) &&
        !referenceIds.has(String(user.value)),
    );
    if (eligibleUsers.length === 0) return;
    const nextStages: DocumentApprovalStage[] = eligibleUsers.map((user) => ({
        id: nextStageId.current++,
        kind: 'approval',
        users: [user],
      }));
    setApprovalStages((current) => [...current, ...nextStages]);
    setSelectedApprovalUserIds([]);
  }, [approvalStages, referenceUserIds, selectedApprovalUsers]);

  const addAgreement = useCallback(() => {
    const assignedUserIds = new Set(
      approvalStages.flatMap((stage) =>
        stage.users.map((user) => String(user.value)),
      ),
    );
    const referenceIds = new Set(referenceUserIds);
    const eligibleUsers = selectedApprovalUsers.filter(
      (user) =>
        !assignedUserIds.has(String(user.value)) &&
        !referenceIds.has(String(user.value)),
    );
    if (eligibleUsers.length === 0) return;
    setApprovalStages((current) => [
      ...current,
      {
        id: nextStageId.current++,
        kind: 'agreement',
        users: eligibleUsers,
      },
    ]);
    setSelectedApprovalUserIds([]);
  }, [approvalStages, referenceUserIds, selectedApprovalUsers]);

  const removeApprovalUser = useCallback((stageId: number, userId: string) => {
    setApprovalStages((current) =>
      current.flatMap((stage) => {
        if (stage.id !== stageId) return [stage];
        if (stage.isFixed) return [stage];
        const users = stage.users.filter(
          (user) => String(user.value) !== userId,
        );
        return users.length > 0 ? [{ ...stage, users }] : [];
      }),
    );
  }, []);

  const replaceApprovalLine = useCallback(
    (stages: DocumentApprovalStage[], references: string[]) => {
      const assignedUserIds = new Set(
        stages.flatMap((stage) =>
          stage.users.map((user) => String(user.value)),
        ),
      );
      const referenceIds = new Set(references);
      const nextStageIdValue = stages.reduce(
        (nextId, stage) => Math.max(nextId, stage.id + 1),
        1,
      );
      nextStageId.current = Math.max(nextStageId.current, nextStageIdValue);
      setApprovalStages(stages);
      setReferenceUserIds(references);
      setSelectedApprovalUserIds((current) =>
        current.filter(
          (id) => !assignedUserIds.has(id) && !referenceIds.has(id),
        ),
      );
    },
    [],
  );

  const handleApprovalUserChange = (value: F1GridUserValue) => {
    const assignedUserIds = new Set(
      approvalStages.flatMap((stage) =>
        stage.users.map((user) => String(user.value)),
      ),
    );
    const referenceIds = new Set(referenceUserIds);
    setSelectedApprovalUserIds(
      toUserIds(value).filter(
        (id) => !assignedUserIds.has(id) && !referenceIds.has(id),
      ),
    );
  };

  const handleReferenceUserChange = (value: F1GridUserValue) => {
    const assignedUserIds = new Set(
      approvalStages.flatMap((stage) =>
        stage.users.map((user) => String(user.value)),
      ),
    );
    const selectedApprovalIds = new Set(selectedApprovalUserIds);
    setReferenceUserIds(
      toUserIds(value).filter(
        (id) => !assignedUserIds.has(id) && !selectedApprovalIds.has(id)
          && (activeDocumentKind !== '업무연락' || id !== String(drafterUser?.value)),
      ),
    );
  };

  const handleAttachmentSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length > 0) {
      setAttachments((current) => [
        ...current,
        ...nextFiles.map((file) => ({
          clientId: `attachment-${nextAttachmentId.current++}`,
          file,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          status: 'pending' as const,
        })),
      ]);
    }
    event.target.value = '';
  };

  const uploadAttachment = useCallback(
    async (
      attachment: DocumentDraftAttachment,
      approvalId: number,
    ): Promise<DocumentDraftAttachmentStatus> => {
      try {
        if (!attachment.file) {
          throw new Error('업로드할 첨부파일 데이터를 확인할 수 없습니다.');
        }
        const uploaded = await uploadDocumentDraftAttachment(
          approvalId,
          attachment.file,
        );
        setAttachments((current) =>
          current.map((item) =>
            item.clientId === attachment.clientId
              ? { ...item, status: 'uploaded', fileId: uploaded.fileId, error: undefined }
              : item,
          ),
        );
        return 'uploaded';
      } catch (error: unknown) {
        const status = isDefiniteAttachmentUploadFailure(error) ? 'failed' : 'unknown';
        const message =
          error instanceof UnknownAttachmentUploadOutcomeError
            ? error.message
            : error instanceof Error
              ? error.message
              : '첨부파일 업로드 결과를 확인할 수 없습니다.';
        setAttachments((current) =>
          current.map((item) =>
            item.clientId === attachment.clientId
              ? { ...item, status, error: message }
              : item,
          ),
        );
        return status;
      }
    },
    [],
  );

  const closeComposer = useCallback(() => {
    if (savingRef.current) return;
    if (imageSaveLifecycle.uploadingCount > 0) {
      setSaveError('본문 이미지 업로드가 끝난 뒤 닫아 주세요.');
      return;
    }
    void imageSaveLifecycle.cleanupTemporaryImages();
    draftIdRef.current = null;
    setElectronicApprovalId(null);
    setIsSaving(false);
    setSaveError('');
    setComposerTitle('');
    setAttachments([]);
    nextAttachmentId.current = 1;
    setDrafterName('');
    setCategoryItems([]);
    setDraftForms([]);
    setUserOptions([]);
    setSelectedCategoryId(ALL_CATEGORY_VALUE);
    setSelectedFormId('');
    setTemplateError('');
    setTemplateLoading(false);
    setTemplateReplaceConfirmOpen(false);
    setPendingSelection(null);
    setApprovalStages([]);
    setSelectedApprovalUserIds([]);
    setReferenceUserIds([]);
    setActiveDocumentKind('기안서');
    setPendingDocumentKind(null);
    setDrafterUser(null);
    nextStageId.current = 1;
    setLoadError('');
    setInitialLookupsComplete(false);
    templateRequestId.current += 1;
    if (editor) {
      editor.commands.setContent('<p></p>', { emitUpdate: false });
      editorBaseline.current = JSON.stringify(editor.getJSON());
    } else {
      editorBaseline.current = null;
    }
    onClose();
  }, [editor, imageSaveLifecycle, onClose]);

  const buildDraftRequest = useCallback((): DocumentApprovalDraftRequest | null => {
    if (!editor || !composerTitle.trim()
      || (activeDocumentKind !== '업무연락' && approvalStages.length === 0)) return null;
    const approvalLines: DocumentApprovalDraftRequest['approvalLines'] =
      (activeDocumentKind === '업무연락' ? [] : approvalStages).flatMap((stage, stageIndex) =>
        stage.users.map((user, participantIndex) => ({
          stageOrder: stageIndex + 1,
          participantOrder: participantIndex + 1,
          participantType:
            stage.kind === 'approval' ? ('APPROVAL' as const) : ('AGREEMENT' as const),
          participantUserId: String(user.value),
        })),
      );
    if (referenceUserIds.length > 0) {
      approvalLines.push(
        ...referenceUserIds.map((participantUserId, participantIndex) => ({
          stageOrder: activeDocumentKind === '업무연락' ? 1 : approvalStages.length + 1,
          participantOrder: participantIndex + 1,
          participantType: 'REFERENCE' as const,
          participantUserId,
        })),
      );
    }

    const snapshot = imageSaveLifecycle.getSnapshot();
    return {
      documentType: getDocumentType(activeDocumentKind),
      draftingWorkCategoryId: selectedFormId ? Number(selectedFormId) : null,
      title: composerTitle.trim(),
      contentsJson: snapshot.json,
      contentsHtml: snapshot.html,
      contentsText: editor.getText({ blockSeparator: '\n' }),
      approvalLines,
      embeddedImages: snapshot.referencedImages.map((image) => ({
        uploadToken: image.uploadToken,
        fileName: image.fileName,
        imageUrl: image.src ?? null,
        fileId: image.fileId ?? null,
        objectKey: image.objectKey ?? null,
        fileSize: image.fileSize ?? null,
        mimeType: image.mimeType ?? null,
        width: image.width ?? null,
      })),
      temporaryImages: snapshot.temporaryImages,
    };
  }, [
    activeDocumentKind,
    approvalStages,
    composerTitle,
    editor,
    imageSaveLifecycle,
    referenceUserIds,
    selectedFormId,
  ]);

  const persistDocument = useCallback(async (submit: boolean) => {
    if (
      savingRef.current ||
      !editor ||
      !composerTitle.trim() ||
      (activeDocumentKind !== '업무연락' && approvalStages.length === 0)
    ) {
      return;
    }
    if (submit && activeDocumentKind === '업무연락' && referenceUserIds.length === 0) {
      setSaveError('발송할 참조자를 선택해 주세요.');
      return;
    }
    if (imageSaveLifecycle.uploadingCount > 0) {
      setSaveError('본문 이미지 업로드가 끝난 뒤 저장해 주세요.');
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setSaveError('');
    try {
      const request = buildDraftRequest();
      if (!request) return;
      const saved = await saveDocumentDraft(request, draftIdRef.current);
      imageSaveLifecycle.completeSave();
      draftIdRef.current = saved.electronicApprovalId;
      setElectronicApprovalId(saved.electronicApprovalId);
      if (submit && saved.documentStatus !== 'DRAFT' && saved.documentStatus !== 'REVISION_REQUESTED') {
        throw new Error('현재 상태에서는 결재신청할 수 없습니다.');
      }

      let failedCount = attachments.filter(
        (attachment) => attachment.status === 'failed' || attachment.status === 'unknown',
      ).length;
      for (const attachment of attachments.filter((item) => item.status === 'pending')) {
        const status = await uploadAttachment(attachment, saved.electronicApprovalId);
        if (status !== 'uploaded') failedCount += 1;
      }
      if (failedCount > 0) {
        setSaveError(
          `문서는 저장되었지만 첨부파일 ${failedCount}건의 상태 확인이 필요합니다.`,
        );
        if (submit) return;
      } else if (submit) {
        const latestRequest = buildDraftRequest();
        if (!latestRequest) {
          setSaveError('결재신청에 필요한 문서 내용을 확인할 수 없습니다.');
          return;
        }
        await submitDocumentApproval(saved.electronicApprovalId, latestRequest);
        showSuccess(activeDocumentKind === '업무연락'
          ? '업무연락이 발송되었습니다.' : '문서가 결재신청되었습니다.');
        savingRef.current = false;
        setIsSaving(false);
        closeComposer();
      } else {
        showSuccess('문서가 임시저장되었습니다.');
      }
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : '문서 저장에 실패했습니다.',
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [
    attachments,
    activeDocumentKind,
    approvalStages.length,
    buildDraftRequest,
    closeComposer,
    composerTitle,
    editor,
    imageSaveLifecycle,
    referenceUserIds.length,
    showSuccess,
    uploadAttachment,
  ]);

  const saveDraft = useCallback(() => persistDocument(false), [persistDocument]);
  const submitDraft = useCallback(() => persistDocument(true), [persistDocument]);

  const retryFailedAttachment = useCallback(
    async (clientId: string) => {
      const attachment = attachments.find((item) => item.clientId === clientId);
      const approvalId = draftIdRef.current;
      if (
        savingRef.current ||
        !attachment ||
        attachment.status !== 'failed' ||
        approvalId === null
      ) {
        return;
      }
      if (!attachment.file) {
        setSaveError('첨부파일 데이터를 확인할 수 없습니다.');
        return;
      }
      savingRef.current = true;
      setIsSaving(true);
      setSaveError('');
      try {
        const status = await uploadAttachment(attachment, approvalId);
        const unresolvedCount = attachments.filter(
          (item) =>
            item.clientId !== clientId &&
            (item.status === 'pending' ||
              item.status === 'failed' ||
              item.status === 'unknown'),
        ).length;
        if (status !== 'uploaded') {
          setSaveError(
            `문서는 저장되었지만 첨부파일 ${unresolvedCount + 1}건의 상태 확인이 필요합니다.`,
          );
        } else if (unresolvedCount > 0) {
          setSaveError(
            `문서는 저장되었지만 첨부파일 ${unresolvedCount}건의 상태 확인이 필요합니다.`,
          );
        }
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [attachments, uploadAttachment],
  );

  const reconcileUnknownAttachment = useCallback(
    async (clientId: string) => {
      const attachment = attachments.find((item) => item.clientId === clientId);
      const approvalId = draftIdRef.current;
      if (
        savingRef.current ||
        !attachment ||
        attachment.status !== 'unknown' ||
        approvalId === null
      ) {
        return;
      }
      if (!attachment.file) {
        setSaveError('첨부파일 데이터를 확인할 수 없습니다.');
        return;
      }
      const attachmentFile = attachment.file;
      savingRef.current = true;
      setIsSaving(true);
      setSaveError('');
      try {
        const files = await listDocumentDraftAttachments(approvalId);
        const uploadedIds = new Set(
          attachments
            .filter((item) => item.status === 'uploaded' && item.fileId !== undefined)
            .map((item) => item.fileId),
        );
        const matches = files.filter(
          (file) =>
            file.fileName === attachmentFile.name &&
            file.fileSize === attachmentFile.size &&
            !uploadedIds.has(file.fileId),
        );
        if (matches.length === 1) {
          setAttachments((current) =>
            current.map((item) =>
              item.clientId === clientId
                ? { ...item, status: 'uploaded', fileId: matches[0].fileId, error: undefined }
                : item,
            ),
          );
          const unresolvedCount = attachments.filter(
            (item) =>
              item.clientId !== clientId &&
              (item.status === 'pending' ||
                item.status === 'failed' ||
                item.status === 'unknown'),
          ).length;
          if (unresolvedCount > 0) {
            setSaveError(
              `문서는 저장되었지만 첨부파일 ${unresolvedCount}건의 상태 확인이 필요합니다.`,
            );
          } else {
            showSuccess('첨부파일 업로드가 확인되었습니다.');
          }
        } else {
          setSaveError('파일 목록에서 업로드 여부를 확인하지 못했습니다.');
          setAttachments((current) =>
            current.map((item) =>
              item.clientId === clientId
                ? { ...item, error: '파일 목록에서 업로드 여부를 확인하지 못했습니다.' }
                : item,
            ),
          );
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : '첨부 상태 조회에 실패했습니다.';
        setSaveError(message);
        setAttachments((current) =>
          current.map((item) =>
            item.clientId === clientId
              ? {
                  ...item,
                  error: message,
                }
              : item,
          ),
        );
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [attachments, showSuccess],
  );

  const removeAttachment = useCallback(
    async (clientId: string) => {
      const attachment = attachments.find((item) => item.clientId === clientId);
      if (!attachment || savingRef.current || attachment.status === 'unknown') return;
      if (attachment.status !== 'uploaded') {
        setAttachments((current) => current.filter((item) => item.clientId !== clientId));
        return;
      }
      const approvalId = draftIdRef.current;
      if (approvalId === null || attachment.fileId === undefined) return;
      savingRef.current = true;
      setIsSaving(true);
      try {
        await deleteDocumentDraftAttachment(approvalId, attachment.fileId);
        setAttachments((current) => current.filter((item) => item.clientId !== clientId));
        const unresolvedCount = attachments.filter(
          (item) =>
            item.clientId !== clientId &&
            (item.status === 'pending' ||
              item.status === 'failed' ||
              item.status === 'unknown'),
        ).length;
        setSaveError(
          unresolvedCount > 0
            ? `문서는 저장되었지만 첨부파일 ${unresolvedCount}건의 상태 확인이 필요합니다.`
            : '',
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : '첨부파일 삭제에 실패했습니다.';
        setSaveError(message);
        setAttachments((current) =>
          current.map((item) =>
            item.clientId === clientId
              ? { ...item, error: message }
              : item,
          ),
        );
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [attachments],
  );

  return {
    activeDocumentKind,
    requestDocumentKindChange,
    confirmDocumentKindChange,
    cancelDocumentKindChange,
    documentKindConfirmOpen: pendingDocumentKind !== null,
    referenceUserOptions,
    composerTitle,
    setComposerTitle,
    draftDate,
    drafterName,
    categoryItems,
    availableForms,
    userOptions,
    selectedCategoryId,
    selectedFormId,
    handleFormChange,
    handleCategoryChange,
    templateError,
    templateLoading,
    templateReplaceConfirmOpen,
    cancelTemplateReplacement,
    confirmTemplateReplacement,
    approvalStages,
    selectedApprovalUserIds,
    referenceUserIds,
    addApproval,
    addAgreement,
    removeApprovalUser,
    replaceApprovalLine,
    handleApprovalUserChange,
    handleReferenceUserChange,
    loadError,
    isLoading,
    attachments,
    electronicApprovalId,
    isSaving,
    saveError,
    saveDraft,
    submitDraft,
    uploadImage: imageSaveLifecycle.uploadImage,
    onOrphanedImageUpload: imageSaveLifecycle.onOrphanedImageUpload,
    onUploadingChange: imageSaveLifecycle.onUploadingChange,
    onImageUploadError: imageSaveLifecycle.onImageUploadError,
    uploadingCount: imageSaveLifecycle.uploadingCount,
    retryFailedAttachment,
    reconcileUnknownAttachment,
    removeAttachment,
    canSaveDraft:
      !isLoading &&
      !templateLoading &&
      !isSaving &&
      imageSaveLifecycle.uploadingCount === 0 &&
      Boolean(composerTitle.trim()) &&
      Boolean(editor) &&
      !loadError &&
      (activeDocumentKind === '업무연락' || approvalStages.length > 0),
    canSubmitDraft:
      !isLoading &&
      !templateLoading &&
      !isSaving &&
      imageSaveLifecycle.uploadingCount === 0 &&
      Boolean(composerTitle.trim()) &&
      Boolean(editor) &&
      !loadError &&
      (activeDocumentKind === '업무연락'
        ? referenceUserIds.length > 0
        : approvalStages.some((stage, index) => index > 0 && stage.users.length > 0)),
    attachmentInputRef,
    editor,
    handleEditorReady,
    handleAttachmentSelect,
    closeComposer,
    editorSurfaceBackground,
    fieldSurfaceBackground,
  };
}
