import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import { useTheme } from '@mui/material/styles';
import { useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Divider,
} from '@mui/material';
import {
  RichTextEditor,
  RichTextEditorToolbar,
  richTextEditorIconButtonSx,
} from '../../../../../shared/components/rich-text-editor/RichTextEditor';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { AppSaveButton } from '../../../../../shared/components/AppSaveButton';
import { AppLoadingSpinner } from '../../../../../shared/components/AppLoadingSpinner';
import { richTextContentStyles } from '../../../../../shared/components/rich-text-editor/contentStyles';
import { UnsavedChangesConfirmDialog } from '../../../../../shared/components/UnsavedChangesConfirmDialog';
import { AttachmentList } from '../../../../../shared/components/feed/AttachmentList';
import type {
  ApprovalLineTemplateEabusNo,
  DocumentApprovalDetail,
  DocumentKind,
} from '../types/documentWrite.types';
import { useDocumentComposer } from '../hooks/useDocumentComposer';
import { DocumentApprovalFields } from './DocumentApprovalFields';
import { DocumentApprovalSettingsDialog } from './DocumentApprovalSettingsDialog';
import { DocumentMetadataFields } from './DocumentMetadataFields';
import { DocumentReferenceField } from './DocumentReferenceField';
import { DocumentLinkPreviews } from './DocumentLinkPreviews';

const DOCUMENT_CODE_BY_KIND: Record<DocumentKind, ApprovalLineTemplateEabusNo> =
  {
    기안서: '001',
    업무연락: '008',
    지출결의서: '004',
    근태신청: '031',
  };

type DocumentComposerDialogProps = {
  open: boolean;
  onClose: () => void;
  initialDocument?: DocumentApprovalDetail | null;
  onOpenDocument?: (documentId: number) => void;
  linkedDetail?: ReactNode;
  onCloseLinkedDocument?: () => void;
};

export function DocumentComposerDialog({
  open,
  onClose,
  initialDocument = null,
  onOpenDocument,
  linkedDetail,
  onCloseLinkedDocument,
}: DocumentComposerDialogProps) {
  const theme = useTheme();
  const [approvalSettingsOpen, setApprovalSettingsOpen] = useState(false);
  const [approvalSettingsSession, setApprovalSettingsSession] = useState(0);
  const [approvalSettingsMode, setApprovalSettingsMode] = useState<
    'approval' | 'reference'
  >('approval');
  const {
    activeDocumentKind,
    requestDocumentKindChange,
    documentKindConfirmOpen,
    confirmDocumentKindChange,
    cancelDocumentKindChange,
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
    uploadImage,
    onOrphanedImageUpload,
    onUploadingChange,
    onImageUploadError,
    uploadingCount,
    retryFailedAttachment,
    reconcileUnknownAttachment,
    removeAttachment,
    canSaveDraft,
    canSubmitDraft,
    attachmentInputRef,
    editor,
    handleEditorReady,
    handleAttachmentSelect,
    closeComposer: resetComposer,
    editorSurfaceBackground,
    fieldSurfaceBackground,
  } = useDocumentComposer(open, onClose, initialDocument);
  const closeComposer = () => {
    if (linkedDetail && onCloseLinkedDocument) {
      onCloseLinkedDocument();
      return;
    }
    setApprovalSettingsOpen(false);
    resetComposer();
  };
  const openApprovalSettings = () => {
    setApprovalSettingsSession((current) => current + 1);
    setApprovalSettingsMode('approval');
    setApprovalSettingsOpen(true);
  };
  const openReferenceSettings = () => {
    setApprovalSettingsSession((current) => current + 1);
    setApprovalSettingsMode('reference');
    setApprovalSettingsOpen(true);
  };
  const panelBorder = theme.palette.divider;
  const isComposerLoading = isLoading || templateLoading;
  const editorTextColor = theme.palette.text.primary;
  const editorPlaceholderColor = theme.palette.text.disabled;
  const tabChangeDisabled = isComposerLoading || isSaving || uploadingCount > 0;

  const composerFooterStart = (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <RichTextEditorToolbar
        editor={isComposerLoading ? null : editor}
        panelTestId="document-composer-toolbar-popup"
      />
      <IconButton
        size="small"
        aria-label="첨부 링크"
        onClick={() => attachmentInputRef.current?.click()}
        disabled={isComposerLoading || isSaving}
        sx={richTextEditorIconButtonSx}
      >
        <AttachFileOutlinedIcon fontSize="small" />
      </IconButton>
      <input
        ref={attachmentInputRef}
        type="file"
        multiple
        hidden
        onChange={handleAttachmentSelect}
        disabled={isComposerLoading || isSaving}
        aria-label="첨부 파일 선택"
      />
    </Box>
  );

  return (
    <>
      <CommonDialog
        open={open}
        onClose={closeComposer}
        title="문서 작성"
        description={
          electronicApprovalId === null
            ? undefined
            : `임시저장 문서 ID: ${electronicApprovalId}`
        }
        size="lg"
        bodyMode="fill"
        overlay={linkedDetail}
        footerStart={composerFooterStart}
        actions={
          <>
            <AppSaveButton
              variant="contained"
              color="success"
              saving={isSaving}
              savingLabel="처리 중..."
              onClick={() => void submitDraft()}
              disabled={!canSubmitDraft}
              sx={{
                borderRadius: 1.5,
                fontWeight: 700,
                minWidth: { xs: 96, sm: 112 },
                px: { xs: 2, sm: 2.5 },
                boxShadow: 'none',
              }}
            >
              {activeDocumentKind === '업무연락' ? '발송' : '결재신청'}
            </AppSaveButton>
            <AppSaveButton
              variant="contained"
              saving={isSaving}
              savingLabel="저장 중..."
              onClick={() => void saveDraft()}
              disabled={!canSaveDraft}
              sx={{
                borderRadius: 1.5,
                fontWeight: 700,
                minWidth: { xs: 80, sm: 96 },
                px: { xs: 2, sm: 2.5 },
                boxShadow: 'none',
              }}
            >
              {uploadingCount > 0
                ? '이미지 업로드 중...'
                : '저장'}
            </AppSaveButton>
            <Button
              variant="text"
              color="primary"
              onClick={closeComposer}
              sx={{
                borderRadius: 1.5,
                fontWeight: 600,
                minWidth: { xs: 56, sm: 64 },
                px: { xs: 1.5, sm: 2 },
              }}
            >
              닫기
            </Button>
          </>
        }
        dialogProps={{ 'data-testid': 'document-composer-dialog-root' }}
      >
        <Box
          data-testid="document-composer-layout"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            height: '100%',
            minHeight: 0,
            minWidth: 0,
          }}
        >
          {saveError && <Alert severity="error">{saveError}</Alert>}
          {loadError && <Alert severity="error">{loadError}</Alert>}
          {templateError && <Alert severity="error">{templateError}</Alert>}
          <Tabs
            value={activeDocumentKind}
            onChange={(_, value: DocumentKind) => requestDocumentKindChange(value)}
            aria-label="결재문서 구분"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              flexShrink: 0,
              mb: 0,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Tab value="기안서" label="기안서" disabled={tabChangeDisabled} />
            <Tab
              value="업무연락"
              label="업무연락"
              disabled={tabChangeDisabled}
            />
            <Tab value="지출결의서" label="지출결의서" disabled />
            <Tab value="근태신청" label="근태신청" disabled />
          </Tabs>
          {isComposerLoading && (
            <Box
              data-testid="document-composer-loading"
              sx={{
                display: 'flex',
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppLoadingSpinner size={40} aria-label="문서 정보 불러오는 중" />
            </Box>
          )}
          <Box sx={{ display: isComposerLoading ? 'none' : 'contents' }}>
            <DocumentMetadataFields
              draftDate={draftDate}
              drafterName={drafterName}
              categoryItems={categoryItems}
              availableForms={availableForms}
              selectedCategoryId={selectedCategoryId}
              selectedFormId={selectedFormId}
              disabled={isLoading || templateLoading || isSaving}
              onCategoryChange={handleCategoryChange}
              onFormChange={handleFormChange}
            />

            <Divider />

            {activeDocumentKind === '기안서' ? (
              <DocumentApprovalFields
                userOptions={userOptions}
                selectedApprovalUserIds={selectedApprovalUserIds}
                referenceUserIds={referenceUserIds}
                approvalStages={approvalStages}
                approvalSettingsDisabled={isLoading}
                onApprovalUserChange={handleApprovalUserChange}
                onReferenceUserChange={handleReferenceUserChange}
                onAddApproval={addApproval}
                onAddAgreement={addAgreement}
                onOpenApprovalSettings={openApprovalSettings}
                onRemoveApprovalUser={removeApprovalUser}
              />
            ) : (
              <DocumentReferenceField
                userOptions={referenceUserOptions}
                referenceUserIds={referenceUserIds}
                onChange={handleReferenceUserChange}
                onOpenSettings={openReferenceSettings}
                settingsDisabled={tabChangeDisabled}
              />
            )}

            <Divider />
            <TextField
              value={composerTitle}
              onChange={(event) => setComposerTitle(event.target.value)}
              fullWidth
              size="small"
              margin="none"
              placeholder="제목을 입력하세요."
              slotProps={{ input: { 'aria-label': '제목' } }}
              sx={{
                flexShrink: 0,
                '& .MuiOutlinedInput-root': {
                  bgcolor: fieldSurfaceBackground,
                  borderRadius: 1.5,
                  border: 'none',
                  '& fieldset': { border: 'none' },
                },
                '& .MuiInputBase-root': {
                  bgcolor: fieldSurfaceBackground,
                  borderRadius: 1.5,
                },
                '& .MuiInputBase-input::placeholder': {
                  color: theme.palette.text.disabled,
                  opacity: 1,
                },
                '& .MuiInputBase-input': {
                  fontSize: '1.25rem',
                  lineHeight: 1.4,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                },
              }}
            />
            <Box
              data-testid="document-composer-editor-panel"
              sx={{
                display: 'flex',
                flex: '1 0 auto',
                flexDirection: 'column',
                minHeight: 200,
                width: '100%',
                minWidth: 0,
                bgcolor: editorSurfaceBackground,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flex: '1 0 auto',
                  flexDirection: 'column',
                  width: '100%',
                  minHeight: 0,
                  minWidth: 0,
                  borderTop: `1px solid ${panelBorder}`,
                  // borderBottom: `1px solid ${panelBorder}`,
                }}
              >
                <Box
                  sx={{
                    minHeight: 180,
                    display: 'flex',
                    flex: '1 0 auto',
                    width: '100%',
                    minWidth: 0,
                    bgcolor: editorSurfaceBackground,
                    '& .document-composer-editor': {
                      flex: '1 0 auto',
                      width: '100%',
                      minWidth: 0,
                      minHeight: 180,
                      height: 'auto',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'visible',
                    },
                    '& .document-composer-editor .rich-text-editor-content': {
                      flex: '1 0 auto',
                      minHeight: 180,
                      height: 'auto',
                      overflow: 'visible',
                    },
                    '& .document-composer-editor .ProseMirror': {
                      ...richTextContentStyles,
                      display: 'block',
                      width: '100%',
                      minWidth: 0,
                      flex: '1 0 auto',
                      minHeight: 180,
                      maxHeight: 'none',
                      overflowY: 'visible',
                      overflowX: 'auto',
                      outline: 'none',
                      px: 2,
                      py: 1.5,
                      color: editorTextColor,
                      fontWeight: 400,
                      bgcolor: editorSurfaceBackground,
                      boxSizing: 'border-box',
                      '& p.is-editor-empty:first-of-type::before': {
                        content: 'attr(data-placeholder)',
                        color: editorPlaceholderColor,
                        float: 'left',
                        height: 0,
                        pointerEvents: 'none',
                      },
                      '& > :first-of-type': { marginTop: 0 },
                      '& > :last-child': { marginBottom: 0 },
                    },
                    '& .document-composer-editor .rich-text-editor-content > .ProseMirror':
                      {
                        flex: '1 0 auto',
                        minHeight: 180,
                        maxHeight: 'none',
                        overflowY: 'visible',
                      },
                  }}
                >
                  <RichTextEditor
                    renderContentPreview={(html) => (
                      <DocumentLinkPreviews html={html} onOpenDocument={onOpenDocument} />
                    )}
                    onEditorReady={handleEditorReady}
                    className="document-composer-editor"
                    readOnly={isComposerLoading || isSaving}
                    uploadImage={uploadImage}
                    onOrphanedImageUpload={onOrphanedImageUpload}
                    onUploadingChange={onUploadingChange}
                    onImageUploadError={onImageUploadError}
                    contentSx={{
                      ...richTextContentStyles,
                      display: 'block',
                      width: '100%',
                      minWidth: 0,
                      minHeight: 180,
                      maxHeight: 'none',
                      overflowY: 'visible',
                      overflowX: 'auto',
                      outline: 'none',
                      px: 2,
                      py: 1.5,
                      color: editorTextColor,
                      fontWeight: 400,
                      bgcolor: editorSurfaceBackground,
                      boxSizing: 'border-box',
                    }}
                  />
                </Box>
                {attachments.length > 0 && (
                  <Box
                    data-testid="document-composer-attachments"
                    sx={{
                      display: 'grid',
                      gap: 1,
                      borderTop: `1px solid ${panelBorder}`,
                      p: 1.5,
                      bgcolor: editorSurfaceBackground,
                    }}
                  >
                    {attachments.map((attachment) => {
                      const statusPresentation = ({
                        uploaded: { label: '완료', color: 'success' },
                        pending: { label: '대기', color: 'default' },
                        failed: { label: '실패', color: 'error' },
                        unknown: { label: '확인 필요', color: 'warning' },
                      } as const)[attachment.status];

                      return (
                        <Box
                          key={attachment.clientId}
                          data-testid={`document-composer-attachment-${attachment.status}`}
                          sx={{ minWidth: 0 }}
                        >
                          <AttachmentList
                            files={[
                              {
                                id: attachment.clientId,
                                name:
                                  attachment.file?.name ??
                                  attachment.fileName ??
                                  '이름 없는 첨부파일',
                                size:
                                  attachment.file?.size ?? attachment.fileSize,
                                mimeType:
                                  attachment.file?.type ?? attachment.mimeType,
                              },
                            ]}
                            mode="edit"
                            isDark={theme.palette.mode === 'dark'}
                            showActions={
                              attachment.status !== 'unknown' && !isSaving
                            }
                            onRemove={removeAttachment}
                            testId={`document-composer-attachment-list-${attachment.clientId}`}
                            statusBadge={
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  flexShrink: 0,
                                }}
                              >
                                <Chip
                                  label={statusPresentation.label}
                                  color={statusPresentation.color}
                                  size="small"
                                  data-testid="document-composer-attachment-status"
                                  sx={{
                                    height: 22,
                                    '& .MuiChip-label': { px: 0.75 },
                                  }}
                                />
                                {attachment.status === 'failed' && (
                                  <Button
                                    size="small"
                                    disabled={isSaving}
                                    onClick={() =>
                                      void retryFailedAttachment(
                                        attachment.clientId,
                                      )
                                    }
                                    sx={{ minWidth: 0, px: 0.75 }}
                                  >
                                    재시도
                                  </Button>
                                )}
                                {attachment.status === 'unknown' && (
                                  <Button
                                    size="small"
                                    disabled={isSaving}
                                    onClick={() =>
                                      void reconcileUnknownAttachment(
                                        attachment.clientId,
                                      )
                                    }
                                    sx={{ minWidth: 0, px: 0.75 }}
                                  >
                                    상태 확인
                                  </Button>
                                )}
                              </Box>
                            }
                          />
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
        <UnsavedChangesConfirmDialog
          open={documentKindConfirmOpen}
          title="문서 유형 변경"
          description="다른 문서 유형으로 이동하시겠습니까? 결재선과 참조자는 초기화되며, 제목과 본문은 유지됩니다."
          cancelLabel="취소"
          continueLabel="이동"
          onCancel={cancelDocumentKindChange}
          onContinue={confirmDocumentKindChange}
        />
        <UnsavedChangesConfirmDialog
          open={templateReplaceConfirmOpen}
          title="작성 중인 본문 교체"
          description="선택한 기안양식의 본문으로 현재 내용을 바꾸시겠습니까?"
          cancelLabel="취소"
          continueLabel="교체"
          onCancel={cancelTemplateReplacement}
          onContinue={confirmTemplateReplacement}
        />
      </CommonDialog>
      <DocumentApprovalSettingsDialog
        key={approvalSettingsSession}
        open={approvalSettingsOpen}
        mode={approvalSettingsMode}
        documentCode={DOCUMENT_CODE_BY_KIND[activeDocumentKind]}
        userOptions={userOptions}
        userOptionsError={
          userOptions.length === 0 && !isLoading
            ? loadError || undefined
            : undefined
        }
        approvalStages={approvalStages}
        referenceUserIds={referenceUserIds}
        onClose={() => setApprovalSettingsOpen(false)}
        onApply={replaceApprovalLine}
      />
    </>
  );
}
