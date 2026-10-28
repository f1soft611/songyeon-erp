import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import type { Editor } from '@tiptap/react';
import {
  RichTextEditor,
  RichTextEditorToolbar,
  richTextEditorIconButtonSx,
} from '../../../../../shared/components/rich-text-editor/RichTextEditor';
import { useRichTextEditorSaveLifecycle } from '../../../../../shared/components/rich-text-editor/useRichTextEditorSaveLifecycle';
import { apiGetBlob } from '../../../../../shared/services/apiClient';
import {
  deleteNoticeEmbeddedImage,
  uploadNoticeEmbeddedImage,
} from '../services/noticeBoardService';
import {
  getAttachmentExtension,
  getAttachmentIconMeta,
} from '../../../../../shared/components/feed/attachmentIconMeta';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { DateEditor, normalizeDateInput } from '../../../../../shared/components/f1-grid/editing/DateEditor';
import type {
  NoticeComposerDialogProps,
  NoticeComposerDraftAttachment,
} from '../types/community.types';
import { parseClipboardTextGrid } from '../../../../../shared/components/rich-text-editor/clipboard';
export {
  hasSpreadsheetClipboardContent,
  normalizeClipboardHtmlForEditor,
  normalizeClipboardTextForEditor,
} from '../../../../../shared/components/rich-text-editor/clipboard';
export {
  calculateImageResize as calculateNoticeImageResize,
  calculateImageResizeWidth as calculateNoticeImageResizeWidth,
} from '../../../../../shared/components/rich-text-editor/imageResize';

export type {
  NoticeComposerDraftAttachment,
  NoticeComposerEmbeddedImage,
} from '../types/community.types';

const emptyNoticeContent = '<p></p>';

export function serializeNoticeEditorJson(
  editor: { getJSON: () => unknown } | null | undefined,
): string | undefined {
  return editor ? JSON.stringify(editor.getJSON()) : undefined;
}

function summarizeClipboardTables(html: string) {
  if (!html || typeof DOMParser === 'undefined') return [];

  const document = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(document.querySelectorAll('table')).map((table) => {
    const occupiedUntil: number[] = [];
    const rows = Array.from(table.querySelectorAll('tr')).filter(
      (row) => row.closest('table') === table,
    );
    return {
      columns: Array.from(
        table.querySelectorAll(':scope > colgroup > col'),
      ).map((column) => ({
        width: (column as HTMLElement).style.width,
        span: column.getAttribute('span'),
        style: column.getAttribute('style'),
      })),
      rows: rows.map((row, rowIndex) => {
        let columnIndex = 0;
        return Array.from(row.children)
          .filter((cell) => cell.tagName === 'TD' || cell.tagName === 'TH')
          .map((cell) => {
            const colspan = Math.max(
              1,
              Number(cell.getAttribute('colspan')) || 1,
            );
            const rowspan = Math.max(
              1,
              Number(cell.getAttribute('rowspan')) || 1,
            );
            const rangeIsAvailable = (startColumn: number) => {
              for (
                let spanColumn = startColumn;
                spanColumn < startColumn + colspan;
                spanColumn += 1
              ) {
                if ((occupiedUntil[spanColumn] ?? 0) > rowIndex) return false;
              }
              return true;
            };
            while (!rangeIsAvailable(columnIndex)) {
              columnIndex += 1;
            }
            const startColumn = columnIndex;
            for (
              let spanColumn = startColumn;
              spanColumn < startColumn + colspan;
              spanColumn += 1
            ) {
              occupiedUntil[spanColumn] = Math.max(
                occupiedUntil[spanColumn] ?? 0,
                rowIndex + rowspan,
              );
            }
            columnIndex += colspan;
            return {
              column: startColumn,
              colspan,
              rowspan,
              width: cell.getAttribute('width'),
              style: cell.getAttribute('style'),
              text: cell.textContent ?? '',
              html: cell.innerHTML.slice(0, 240),
            };
          });
      }),
    };
  });
}

export function NoticeComposerDialog({
  open,
  isDark,
  onClose,
  onSubmit,
  defaultTitle = '',
  noticeGubunOptions = [],
  defaultNoticeGubunCode = '',
  defaultLoginPopupYn = 'N',
  defaultPopupEndDate = '',
  defaultBody,
  defaultAttachments = [],
}: NoticeComposerDialogProps) {
  const theme = useTheme();
  const resolvedDark = Boolean(isDark) || theme.palette.mode === 'dark';
  const panelBorder = resolvedDark
    ? 'rgba(148, 163, 184, 0.2)'
    : 'rgba(148, 163, 184, 0.22)';
  const editorSurfaceBackground = resolvedDark ? '#0f172a' : '#ffffff';
  const fieldSurfaceBackground = resolvedDark
    ? '#1e293b'
    : editorSurfaceBackground;
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const pasteDebugEnabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('noticePasteDebug') === '1';
  const [title, setTitle] = useState(defaultTitle);
  const [noticeGubunCode, setNoticeGubunCode] = useState(
    defaultNoticeGubunCode,
  );
  const [noticeGubunError, setNoticeGubunError] = useState(false);
  const [loginPopup, setLoginPopup] = useState(defaultLoginPopupYn === 'Y');
  const [popupEndDate, setPopupEndDate] = useState(defaultPopupEndDate ?? '');
  const [popupDateError, setPopupDateError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [editorIsEmpty, setEditorIsEmpty] = useState(true);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [pasteDebugLog, setPasteDebugLog] = useState<string[]>(() =>
    pasteDebugEnabled ? ['[notice-paste] 진단 모드가 활성화되었습니다.'] : [],
  );
  const [attachments, setAttachments] =
    useState<NoticeComposerDraftAttachment[]>(defaultAttachments);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(defaultTitle);
    setNoticeGubunCode(defaultNoticeGubunCode);
    setNoticeGubunError(false);
    setLoginPopup(defaultLoginPopupYn === 'Y');
    setPopupEndDate(defaultPopupEndDate ?? '');
    setPopupDateError(false);
    setAttachments(defaultAttachments);
    setImageUploadError(null);
    setPasteDebugLog(
      pasteDebugEnabled ? ['[notice-paste] 진단 모드가 활성화되었습니다.'] : [],
    );
  }, [open, pasteDebugEnabled]);

  useEffect(() => {
    if (!editor || !open) {
      return;
    }

    const nextContent =
      defaultBody && defaultBody.trim() ? defaultBody : emptyNoticeContent;
    editor.commands.clearContent();
    editor.commands.setContent(nextContent);
  }, [editor, open, defaultBody]);

  useEffect(() => {
    if (!editor || !open) {
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];
    const resolveEditorImages = async () => {
      const images = Array.from(
        editor.view.dom.querySelectorAll<HTMLImageElement>('img'),
      ).filter((image) =>
        (image.getAttribute('src') ?? '').includes(
          '/api/v1/groupware/boards/notice/posts/',
        ),
      );

      await Promise.all(
        images.map(async (image) => {
          const source = image.getAttribute('src');
          if (!source) {
            return;
          }
          try {
            const objectUrl = URL.createObjectURL(await apiGetBlob(source));
            objectUrls.push(objectUrl);
            if (!cancelled) {
              image.src = objectUrl;
            }
          } catch {
            setImageUploadError('본문 이미지를 불러오지 못했습니다.');
          }
        }),
      );
    };

    void resolveEditorImages();
    return () => {
      cancelled = true;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [editor, open, defaultBody]);

  useEffect(() => {
    if (!editor || open) {
      return;
    }

    editor.commands.setTextSelection(1);
    editor.commands.blur();
  }, [editor, open]);

  const handleAttachmentSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length === 0) {
      return;
    }

    const mapped: NoticeComposerDraftAttachment[] = nextFiles.map((file) => {
      const fileName = file.name || '첨부파일';
      const extension = fileName.includes('.')
        ? fileName.split('.').pop()?.toUpperCase() || 'FILE'
        : 'FILE';

      return {
        id: `${fileName}-${file.size}-${file.lastModified}`,
        name: fileName,
        size: file.size,
        extension,
        file,
      };
    });

    setAttachments((current) => [...current, ...mapped]);
    event.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((file) => file.id !== id));
  };

  const handleClipboardDebug = (data: DataTransfer, normalizedHtml: string) => {
    const html = data.getData('text/html') ?? '';
    const text = data.getData('text/plain') ?? '';
    const sourceCells = summarizeClipboardTables(html);
    const normalizedCells = summarizeClipboardTables(normalizedHtml);
    setPasteDebugLog((current) => [
      ...current,
      `[paste] types=${Array.from(data.types).join(', ')}`,
      `[paste] htmlLength=${html.length}, textLength=${text.length}`,
      `[paste] text=${JSON.stringify(text)}`,
      `[paste] plainGrid=${JSON.stringify(parseClipboardTextGrid(text))}`,
      `[paste] sourceCells=${JSON.stringify(sourceCells)}`,
      `[normalized] length=${normalizedHtml.length}`,
      `[normalized] cells=${JSON.stringify(normalizedCells)}`,
    ]);
    window.setTimeout(() => {
      const editorElement = document.querySelector(
        '.notice-composer-editor .ProseMirror',
      );
      setPasteDebugLog((current) => [
        ...current,
        `[after 300ms] text=${editorElement?.textContent ?? '(editor not found)'}`,
        `[after 300ms] html=${editorElement?.innerHTML ?? '(editor not found)'}`,
      ]);
    }, 300);
  };

  const uploadEmbeddedImage = async (file: File) => {
    const uploaded = await uploadNoticeEmbeddedImage(file);
    setImageUploadError(null);
    return {
      src: uploaded.imageUrl,
      alt: uploaded.fileName,
      fileName: uploaded.fileName,
      uploadToken: uploaded.uploadToken,
      fileId: uploaded.fileId == null ? null : String(uploaded.fileId),
      objectKey: uploaded.objectKey,
      fileSize: uploaded.fileSize,
      mimeType: uploaded.mimeType,
    };
  };

  const deleteTemporaryImage = (image: {
    uploadToken: string;
    fileName: string;
  }) => deleteNoticeEmbeddedImage(image.uploadToken, image.fileName);

  const editorSaveLifecycle = useRichTextEditorSaveLifecycle({
    editor,
    uploadImage: uploadEmbeddedImage,
    deleteTemporaryImage,
    onImageUploadError: (message) => setImageUploadError(message || null),
  });

  const handleSubmit = async () => {
    if (!noticeGubunCode.trim()) {
      setNoticeGubunError(true);
      return;
    }
    if (saving || closing) return;
    const normalizedPopupEndDate = normalizeDateInput(popupEndDate);
    if (loginPopup && !normalizedPopupEndDate) {
      setPopupDateError(true);
      return;
    }
    if (editorSaveLifecycle.uploadingCount > 0) {
      setImageUploadError('본문 이미지 업로드가 끝난 뒤 저장해 주세요.');
      return;
    }

    const snapshot = editorSaveLifecycle.getSnapshot();
    const body = snapshot.html || defaultBody || emptyNoticeContent;
    const bodyText = body
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const currentAttachmentIds = new Set(
      attachments.map((attachment) => String(attachment.id)),
    );
    const removedAttachmentIds = defaultAttachments
      .filter(
        (attachment) =>
          attachment.boardFileId != null &&
          !currentAttachmentIds.has(String(attachment.id)),
      )
      .map((attachment) => attachment.boardFileId as number | string);

    if (onSubmit) {
      setSaving(true);
      try {
        await onSubmit({
          title,
          noticeGubunCode,
          loginPopupYn: loginPopup ? 'Y' : 'N',
          popupEndDate: loginPopup ? normalizedPopupEndDate : null,
          body,
          bodyJson: JSON.stringify(snapshot.json),
          bodyText,
          attachments,
          removedAttachmentIds,
          embeddedImages: snapshot.referencedImages.map((image) => ({
            uploadToken: String(image.uploadToken),
            fileId: image.fileId ?? null,
            objectKey: String(image.objectKey ?? ''),
            imageUrl: String(image.src ?? ''),
            fileName: image.fileName,
            fileSize: Number(image.fileSize ?? 0) || 0,
            mimeType: String(image.mimeType ?? ''),
            width: image.width ?? null,
          })),
          temporaryImages: snapshot.temporaryImages,
        });
        editorSaveLifecycle.completeSave();
      } catch {
        return;
      } finally {
        setSaving(false);
      }
    }

    if (onSubmit) {
      onClose();
    } else {
      handleCloseRequest();
    }
  };

  const handleCloseRequest = () => {
    if (saving || closing) return;
    if (editorSaveLifecycle.uploadingCount > 0) {
      setImageUploadError('본문 이미지 업로드가 끝난 뒤 닫아 주세요.');
      return;
    }
    setClosing(true);
    void editorSaveLifecycle.cleanupTemporaryImages().finally(() => {
      setClosing(false);
      onClose();
    });
  };

  const footerStart = (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <RichTextEditorToolbar
        editor={editor}
        panelTestId="notice-toolbar-popup"
      />

      <IconButton
        size="small"
        aria-label="첨부 링크"
        onClick={() => attachmentInputRef.current?.click()}
        sx={richTextEditorIconButtonSx}
      >
        <AttachFileOutlinedIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  const actions = (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        disabled={
          saving ||
          closing ||
          editorSaveLifecycle.uploadingCount > 0 ||
          (title.trim().length === 0 && editorIsEmpty)
        }
        startIcon={
          saving ? (
            <CircularProgress
              size={16}
              color="inherit"
              aria-label="공지 저장 중"
            />
          ) : undefined
        }
        sx={{
          borderRadius: 1.5,
          fontWeight: 700,
          minWidth: 96,
          px: 2.5,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        }}
      >
        {saving ? '저장 중…' : '저장'}
      </Button>
      <Button
        variant="text"
        color="primary"
        onClick={handleCloseRequest}
        disabled={saving || closing || editorSaveLifecycle.uploadingCount > 0}
        sx={{
          borderRadius: 1.5,
          fontWeight: 600,
          px: 2,
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.06),
          },
        }}
      >
        취소
      </Button>
    </>
  );

  return (
    <CommonDialog
      open={open}
      onClose={handleCloseRequest}
      title="새 공지 작성"
      size="md"
      bodyMode="fill"
      footerStart={footerStart}
      actions={actions}
      dialogProps={{
        'data-testid': 'notice-composer-dialog-root',
        'data-theme-mode': resolvedDark ? 'dark' : 'light',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          height: '100%',
          minHeight: 0,
        }}
      >
        <TextField
          select
          label="구분"
          value={noticeGubunCode}
          onChange={(event) => {
            setNoticeGubunCode(event.target.value);
            setNoticeGubunError(false);
          }}
          required
          fullWidth
          size="small"
          margin="none"
          error={noticeGubunError}
          helperText={noticeGubunError ? '구분을 선택해 주세요.' : undefined}
          disabled={noticeGubunOptions.length === 0}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: fieldSurfaceBackground,
              borderRadius: 1.5,
              '&.Mui-error fieldset': {
                border: `1px solid ${theme.palette.error.main}`,
              },
            },
            '& .MuiInputBase-root': {
              bgcolor: fieldSurfaceBackground,
              borderRadius: 1.5,
            },
            '& .MuiFormLabel-root': {
              color: theme.palette.text.secondary,
              fontSize: '0.82rem',
              fontWeight: 600,
            },
          }}
        >
          {noticeGubunOptions.map((option) => (
            <MenuItem key={option.code} value={option.code}>
              {option.name}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: 1.25,
          flexShrink: 0,
          alignItems: 'start',
        }}>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, px: 1.25, minHeight: 40, display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              label="로그인 시 팝업"
              control={<Checkbox checked={loginPopup} disabled={saving || closing}
                onChange={(event) => { setLoginPopup(event.target.checked); setPopupDateError(false); }} />}
              sx={{ my: 0 }}
            />
          </Box>
          <Box component="fieldset" disabled={!loginPopup || saving || closing}
            sx={{ border: 0, p: 0, m: 0, minWidth: 0, opacity: loginPopup ? 1 : 0.6 }}>
            <DateEditor label="팝업 종료일" variant="outlined" autoFocus={false}
              value={popupEndDate} error={popupDateError}
              helperText={popupDateError
                ? (popupEndDate ? '올바른 팝업 종료일을 입력해 주세요.' : '팝업 종료일을 입력해 주세요.')
                : '종료일 당일까지 팝업을 표시합니다.'}
              onChange={(value) => { setPopupEndDate(value); setPopupDateError(false); }}
              onBlur={() => {
                const normalized = normalizeDateInput(popupEndDate);
                if (normalized) setPopupEndDate(normalized);
              }}
            />
          </Box>
        </Box>
        <TextField
          label="제목"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          fullWidth
          margin="none"
          placeholder="제목을 입력하세요."
          slotProps={{
            input: {
              'aria-label': '제목',
              sx: {
                fontSize: '1.25rem',
                lineHeight: 1.4,
                fontWeight: 700,
                letterSpacing: '-0.02em',
              },
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: fieldSurfaceBackground,
              borderRadius: 1.5,
            },
            '& .MuiInputBase-root': {
              bgcolor: fieldSurfaceBackground,
              borderRadius: 1.5,
            },
            '& .MuiInputBase-input::placeholder': {
              color: theme.palette.text.disabled,
              opacity: 1,
            },
            '& .MuiFormLabel-root': {
              color: theme.palette.text.secondary,
            },
          }}
        />

        {pasteDebugEnabled && (
          <Box
            data-testid="notice-paste-debug-panel"
            sx={{
              mt: 1,
              px: 1.25,
              py: 1,
              maxHeight: 180,
              overflow: 'auto',
              border: '1px solid #60a5fa',
              borderRadius: 1,
              bgcolor: '#111827',
              color: '#e5e7eb',
              fontFamily: 'monospace',
              fontSize: 11,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {pasteDebugLog.join('\n')}
          </Box>
        )}

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            minWidth: 0,
            backgroundColor: editorSurfaceBackground,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              width: '100%',
              minWidth: 0,
              borderTop: `1px solid ${panelBorder}`,
              borderBottom: `1px solid ${panelBorder}`,
            }}
          >
            <Box
              sx={{
                flex: 1,
                minHeight: 180,
                display: 'flex',
                width: '100%',
                minWidth: 0,
                overflow: 'hidden',
                backgroundColor: editorSurfaceBackground,
                '& .notice-composer-editor': {
                  flex: 1,
                  width: '100%',
                  minWidth: 0,
                  minHeight: 0,
                  height: '100%',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                },
                '& .notice-composer-editor .ProseMirror': {
                  display: 'block',
                  width: '100%',
                  minWidth: 0,
                  flex: 1,
                  minHeight: 180,
                  maxHeight: '100%',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  outline: 'none',
                  px: 2,
                  py: 1.5,
                  color: theme.palette.text.primary,
                  backgroundColor: editorSurfaceBackground,
                  boxSizing: 'border-box',
                  '& p.is-editor-empty:first-of-type::before': {
                    content: 'attr(data-placeholder)',
                    color: theme.palette.text.disabled,
                    float: 'left',
                    height: 0,
                    pointerEvents: 'none',
                  },
                },
              }}
            >
              <RichTextEditor
                content={
                  defaultBody && defaultBody.trim()
                    ? defaultBody
                    : emptyNoticeContent
                }
                onEditorReady={setEditor}
                onContentChange={(currentEditor) =>
                  setEditorIsEmpty(currentEditor.isEmpty)
                }
                onClipboardPaste={
                  pasteDebugEnabled ? handleClipboardDebug : undefined
                }
                uploadImage={editorSaveLifecycle.uploadImage}
                onOrphanedImageUpload={
                  editorSaveLifecycle.onOrphanedImageUpload
                }
                onUploadingChange={editorSaveLifecycle.onUploadingChange}
                onImageUploadError={editorSaveLifecycle.onImageUploadError}
                className="notice-composer-editor"
                contentSx={{
                  display: 'block',
                  width: '100%',
                  minWidth: 0,
                  flex: 1,
                  minHeight: 180,
                  maxHeight: '100%',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  outline: 'none',
                  px: 2,
                  py: 1.5,
                  color: theme.palette.text.primary,
                  backgroundColor: editorSurfaceBackground,
                  boxSizing: 'border-box',
                  '& p.is-editor-empty:first-of-type::before': {
                    content: 'attr(data-placeholder)',
                    color: theme.palette.text.disabled,
                    float: 'left',
                    height: 0,
                    pointerEvents: 'none',
                  },
                }}
              />
              {imageUploadError && (
                <Typography
                  role="alert"
                  variant="caption"
                  sx={{ px: 2, pb: 1, color: 'error.main' }}
                >
                  {imageUploadError}
                </Typography>
              )}
            </Box>

            {attachments.length > 0 && (
              <Box
                data-testid="notice-attachments-list"
                sx={{
                  borderTop: `1px solid ${panelBorder}`,
                  pt: 1.25,
                  pb: 1,
                  px: 2,
                  backgroundColor: editorSurfaceBackground,
                }}
              >
                <Box sx={{ display: 'grid', gap: 1 }}>
                  {attachments.map((file, index) => {
                    const iconMeta = getAttachmentIconMeta(file.name);

                    return (
                      <Box
                        key={`${file.id}-${index}`}
                        data-file-card="true"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderRadius: 1.5,
                          border: `1px solid ${panelBorder}`,
                          bgcolor: resolvedDark
                            ? 'rgba(30,41,59,0.8)'
                            : '#ffffff',
                          px: 1.25,
                          py: 0.9,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: 1,
                              backgroundColor: iconMeta.bg,
                              color: iconMeta.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                            data-testid={`attachment-icon-${getAttachmentExtension(file.name)}`}
                          >
                            <iconMeta.icon
                              fontSize="small"
                              aria-label={`${iconMeta.label} 파일 아이콘`}
                            />
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: theme.palette.text.primary,
                            }}
                          >
                            {file.name}
                          </Typography>
                        </Box>

                        <IconButton
                          size="small"
                          aria-label="첨부 파일 삭제"
                          title={file.name}
                          onClick={() => removeAttachment(file.id)}
                          sx={{
                            minWidth: 0,
                            width: 32,
                            height: 32,
                            p: 0,
                            borderRadius: 1.5,
                            borderColor: resolvedDark
                              ? 'rgba(148,163,184,0.28)'
                              : 'rgba(148,163,184,0.25)',
                            color: resolvedDark ? '#e2e8f0' : '#475569',
                            backgroundColor: resolvedDark
                              ? 'rgba(15, 23, 42, 0.7)'
                              : '#f8fafc',
                            '&:hover': {
                              borderColor: resolvedDark
                                ? 'rgba(96,165,250,0.5)'
                                : 'rgba(59,130,246,0.35)',
                              backgroundColor: resolvedDark
                                ? 'rgba(30,41,59,0.9)'
                                : '#f1f5f9',
                            },
                          }}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <input
        ref={attachmentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.txt,.csv,.zip,image/*"
        hidden
        onChange={handleAttachmentSelect}
        aria-label="첨부 파일 선택"
      />
    </CommonDialog>
  );
}
