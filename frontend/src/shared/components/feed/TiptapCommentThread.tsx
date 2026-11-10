import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItemButton,
  Menu,
  MenuItem,
  Paper,
  Popper,
  Stack,
  Typography,
} from '@mui/material';
import type { ChipProps } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { AttachmentList } from './AttachmentList';
import { ProfileAvatar } from '../ProfileAvatar';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import {
  commentMentionSx,
  filterMentionCandidates,
  resolveSubmittedMentions,
  highlightMentionsInHtml,
  MentionHighlight,
  type MentionCandidate,
} from './commentMentions';

function getFileBadgeMeta(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pdf: { bg: '#fecaca', color: '#991b1b', label: 'PDF' },
    xls: { bg: '#bbf7d0', color: '#166534', label: 'XLS' },
    xlsx: { bg: '#bbf7d0', color: '#166534', label: 'XLSX' },
    doc: { bg: '#bfdbfe', color: '#1d4ed8', label: 'DOC' },
    docx: { bg: '#bfdbfe', color: '#1d4ed8', label: 'DOCX' },
    ppt: { bg: '#fed7aa', color: '#b45309', label: 'PPT' },
    pptx: { bg: '#fed7aa', color: '#b45309', label: 'PPTX' },
    png: { bg: '#ddd6fe', color: '#5b21b6', label: 'PNG' },
    jpg: { bg: '#d1fae5', color: '#065f46', label: 'JPG' },
    jpeg: { bg: '#d1fae5', color: '#065f46', label: 'JPG' },
    zip: { bg: '#e5e7eb', color: '#374151', label: 'ZIP' },
    hwp: { bg: '#dbeafe', color: '#1d4ed8', label: 'HWP' },
  };

  return map[extension] ?? { bg: '#e2e8f0', color: '#475569', label: 'FILE' };
}

export type FeedCommentAttachment = {
  id: string;
  name: string;
  size?: number;
  mimeType?: string;
  previewUrl?: string;
  previewError?: string;
};
export type FeedCommentItem = {
  id: string | number;
  author: string;
  authorProfileImageUrl?: string | null;
  time: string;
  content: string;
  isDeleted?: boolean;
  isSystemEvent?: boolean;
  systemEventBadge?: {
    label: string;
    color: ChipProps['color'];
    variant: ChipProps['variant'];
  };
  isEditable?: boolean;
  attachments?: FeedCommentAttachment[];
  replies?: FeedCommentItem[];
};
export type CommentMentionOption = {
  userId: string;
  name: string;
  departmentName?: string;
};
export type CommentThreadProps = {
  comments?: FeedCommentItem[];
  onSubmitComment?: (
    content: string,
    files: File[],
    mentionedUserIds?: string[],
    mentionAll?: boolean,
  ) => Promise<void> | void;
  onSubmitReply?: (
    commentId: string | number,
    content: string,
    files: File[],
    rootCommentId: string | number,
    mentionedUserIds?: string[],
    mentionAll?: boolean,
  ) => Promise<void> | void;
  onReply?: (commentId: string | number) => void;
  onEditComment?: (
    commentId: string | number,
    content: string,
    files: File[],
  ) => Promise<void> | void;
  onDeleteComment?: (commentId: string | number) => Promise<void> | void;
  onDownloadAttachment?: (
    commentId: string | number,
    attachmentId: string,
    fileName?: string,
  ) => Promise<void> | void;
  onDeleteAttachment?: (
    commentId: string | number,
    attachmentId: string,
  ) => Promise<void> | void;
  onOpenAttachmentImage?: (image: { src: string; alt: string }) => void;
  isDark?: boolean;
  showComposer?: boolean;
  placeholder?: string;
  composerLabel?: string;
  submitLabel?: string;
  expandReplies?: boolean;
  renderContentPreview?: (html: string) => ReactNode;
  mentionOptions?: CommentMentionOption[];
  enableMentions?: boolean;
};

export const sanitizeCommentHtml = sanitizeHtml;
export function isCommentSubmitKey(event: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
}): boolean {
  return event.key === 'Enter' && !event.shiftKey && !event.isComposing;
}

function hasCommentText(html: string): boolean {
  if (typeof DOMParser === 'undefined')
    return html.replace(/<[^>]*>/g, '').trim().length > 0;
  return Boolean(
    new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim(),
  );
}

type EditorProps = {
  initialContent?: string;
  label: string;
  fileInputLabel: string;
  placeholder: string;
  submitLabel: string;
  isDark: boolean;
  onSubmit: (
    content: string,
    files: File[],
    mentionedUserIds?: string[],
    mentionAll?: boolean,
  ) => Promise<void> | void;
  onCancel?: () => void;
  renderContentPreview?: (html: string) => ReactNode;
  mentionOptions?: CommentMentionOption[];
  enableMentions?: boolean;
};
function CommentEditor({
  initialContent = '<p></p>',
  label,
  fileInputLabel,
  placeholder,
  submitLabel,
  isDark,
  onSubmit,
  onCancel,
  renderContentPreview,
  mentionOptions = [],
  enableMentions = false,
}: EditorProps) {
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submitRef = useRef<() => void>(() => undefined);
  const [files, setFiles] = useState<File[]>([]);
  const [previewHtml, setPreviewHtml] = useState(initialContent);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [mentionAll, setMentionAll] = useState(false);
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder }), ...(enableMentions ? [MentionHighlight] : [])],
    content: initialContent || '<p></p>',
    immediatelyRender: false,
    onUpdate: ({ editor: updatedEditor }) => {
      if (renderContentPreview) setPreviewHtml(updatedEditor.getHTML());
      if (enableMentions) {
        const selection = updatedEditor.state.selection.$from;
        const textBeforeCursor = selection.parent.textBetween(0, selection.parentOffset, '\n');
        const match = /(?:^|\s)@([^\s@]*)$/.exec(textBeforeCursor);
        setMentionQuery(match ? match[1] : null);
        setMentionActiveIndex(0);
      }
    },
    onBlur: () => setMentionQuery(null),
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': label,
        'aria-multiline': 'true',
      },
    },
  });
  useEffect(() => {
    if (!editor) return;
    const nextContent = initialContent || '<p></p>';
    if (editor.getHTML() !== nextContent)
      editor.commands.setContent(nextContent);
  }, [editor, initialContent]);
  const submit = async () => {
    if (!editor) return;
    const editorHtml = editor.isEmpty
      ? editor.view.dom.innerHTML
      : editor.getHTML();
    const content = sanitizeCommentHtml(editorHtml);
    if (!hasCommentText(content)) return;
    try {
      if (enableMentions) {
        const mentions = resolveSubmittedMentions(
          editor.getText(), mentionedUserIds, mentionOptions, mentionAll,
        );
        await onSubmit(content, files, mentions.mentionedUserIds, mentions.mentionAll);
      } else {
        await onSubmit(content, files);
      }
      editor.commands.clearContent();
      setFiles([]);
      setMentionedUserIds([]);
      setMentionAll(false);
    } catch {
      // Keep the editor content and selected files when the API rejects.
    }
  };
  submitRef.current = () => {
    void submit();
  };
  const mentionCandidates = enableMentions && mentionQuery !== null
    ? filterMentionCandidates(mentionOptions, mentionQuery)
    : [];
  const mentionOpen = Boolean(editor) && mentionCandidates.length > 0;
  const activeMentionIndex = Math.min(mentionActiveIndex, Math.max(mentionCandidates.length - 1, 0));
  const selectMention = (candidate: MentionCandidate) => {
    if (!editor || mentionQuery === null) return;
    const cursor = editor.state.selection;
    const start = cursor.$from.start() + cursor.$from.parentOffset - mentionQuery.length - 1;
    const text = candidate.kind === 'all' ? '@ALL ' : `@${candidate.name} `;
    editor.chain().focus().deleteRange({ from: start, to: cursor.from }).insertContent(text).run();
    if (candidate.kind === 'all') {
      setMentionAll(true);
    } else {
      setMentionedUserIds((current) => current.includes(candidate.userId)
        ? current : [...current, candidate.userId]);
    }
    setMentionQuery(null);
  };
  return (
    <Box
      sx={{
        mt: 1,
        minWidth: 0,
        border: `1px solid ${isDark ? 'rgba(148,163,184,0.24)' : 'rgba(148,163,184,0.3)'}`,
        borderRadius: 1.5,
        bgcolor: isDark ? 'rgba(15,23,42,0.76)' : '#fff',
        overflow: 'hidden',
      }}
      ref={editorRootRef}
      onKeyDownCapture={(event) => {
        if (!editor || event.target !== editor.view.dom) {
          return;
        }
        if (mentionOpen && !event.nativeEvent.isComposing) {
          const lastIndex = mentionCandidates.length - 1;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setMentionActiveIndex((activeMentionIndex + step + mentionCandidates.length) % mentionCandidates.length);
            return;
          }
          if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            event.stopPropagation();
            selectMention(mentionCandidates[Math.min(activeMentionIndex, lastIndex)]);
            return;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setMentionQuery(null);
            return;
          }
        }
        if (
          !isCommentSubmitKey({
            key: event.key,
            shiftKey: event.shiftKey,
            isComposing: event.nativeEvent.isComposing,
          })
        ) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        submitRef.current();
      }}
    >
      <Box
        sx={{
          minHeight: 42,
          px: 1,
          py: 1,
          '& .ProseMirror': {
            ...commentMentionSx,
            minHeight: 28,
            outline: 'none',
            fontSize: '0.86rem',
            lineHeight: 1.5,
            color: 'text.primary',
            '& p': { m: 0 },
            '& p.is-editor-empty:first-of-type::before': {
              content: 'attr(data-placeholder)',
              color: 'text.disabled',
              float: 'left',
              height: 0,
              pointerEvents: 'none',
            },
          },
        }}
      >
        <EditorContent editor={editor} />
        {renderContentPreview?.(previewHtml)}
      </Box>
      <Popper
        open={mentionOpen}
        anchorEl={() => editorRootRef.current ?? document.body}
        placement="bottom-start"
        sx={{ zIndex: (popperTheme) => popperTheme.zIndex.modal + 1 }}
      >
        <Paper elevation={6} sx={{ mt: 0.5, maxHeight: 280, minWidth: 220, maxWidth: 'calc(100vw - 16px)', overflow: 'auto' }}>
          <List dense role="listbox" aria-label="멘션 대상">
            {mentionCandidates.map((candidate, index) => (
              <ListItemButton
                key={candidate.kind === 'all' ? 'all' : candidate.userId}
                role="option"
                aria-selected={index === activeMentionIndex}
                selected={index === activeMentionIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setMentionActiveIndex(index)}
                onClick={() => selectMention(candidate)}
              >
                {candidate.kind === 'all'
                  ? '@ALL - 문서 접근 사용자 전체'
                  : `${candidate.name}${candidate.departmentName ? ` · ${candidate.departmentName}` : ''}`}
              </ListItemButton>
            ))}
          </List>
        </Paper>
      </Popper>
      {files.length > 0 && (
        <Box sx={{ px: 1, pb: 0.75, display: 'grid', gap: 0.75 }}>
          {files.map((file) => {
            const badge = getFileBadgeMeta(file.name);
            return (
              <Box
                key={`${file.name}-${file.lastModified}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 1.5,
                  border: `1px solid ${
                    isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.18)'
                  }`,
                  bgcolor: isDark ? 'rgba(30,41,59,0.8)' : '#ffffff',
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
                      backgroundColor: badge.bg,
                      color: badge.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {badge.label}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: isDark ? '#e2e8f0' : '#0f172a',
                    }}
                  >
                    {file.name}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
      <Stack
        direction="row"
        sx={{
          px: 0.75,
          py: 0.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 0.5,
          flexWrap: 'nowrap',
          whiteSpace: 'nowrap',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          aria-label={fileInputLabel}
          onChange={(event) => {
            setFiles((current) => [
              ...current,
              ...Array.from(event.target.files ?? []),
            ]);
            event.target.value = '';
          }}
        />
        <IconButton
          size="small"
          aria-label={`${fileInputLabel} 추가`}
          onClick={() => fileInputRef.current?.click()}
        >
          <AttachFileOutlinedIcon fontSize="small" />
        </IconButton>
        <Stack direction="row" spacing={0.5} sx={{ ml: 'auto' }}>
          <Button
            size="small"
            variant="contained"
            aria-label={
              label === '댓글 수정 입력'
                ? '수정'
                : label === '답글 입력'
                  ? '답글 등록'
                  : '등록'
            }
            onClick={() => void submit()}
          >
            {submitLabel}
          </Button>
          {onCancel && (
            <Button size="small" onClick={onCancel}>
              취소
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

type ItemProps = {
  comment: FeedCommentItem;
  depth: number;
  rootCommentId: string | number;
  props: CommentThreadProps;
  replyTargetId: string | number | null;
  setReplyTargetId: (id: string | number | null) => void;
  editingCommentId: string | number | null;
  setEditingCommentId: (id: string | number | null) => void;
};
function CommentItem({
  comment,
  depth,
  rootCommentId,
  props,
  replyTargetId,
  setReplyTargetId,
  editingCommentId,
  setEditingCommentId,
}: ItemProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [showReplies, setShowReplies] = useState(Boolean(props.expandReplies));
  const isDark = Boolean(props.isDark);
  useEffect(() => {
    setShowReplies(Boolean(props.expandReplies));
  }, [props.expandReplies]);
  const isEditing = editingCommentId === comment.id;
  const isReplying = replyTargetId === comment.id;
  const replyParentId = rootCommentId ?? comment.id;
  const isDeleted = comment.isDeleted === true;
  const isSystemEvent = comment.isSystemEvent === true;
  const canEditAttachments = isEditing;
  const replyCount = comment.replies?.length ?? 0;
  const imageAttachments = (comment.attachments ?? []).filter((attachment) =>
    attachment.mimeType?.startsWith('image/'),
  );
  return (
    <Box
      sx={{
        mt: depth ? 0.75 : 1.25,
        pl: depth ? { xs: 1.5, sm: 3 } : 0,
        minWidth: 0,
      }}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0 }}
      >
        <ProfileAvatar
          name={comment.author}
          imageUrl={comment.authorProfileImageUrl}
          fallback={comment.author.slice(0, 2)}
          sx={{
            width: 28,
            height: 28,
            flexShrink: 0,
            fontSize: '0.65rem',
            fontWeight: 700,
            bgcolor: isDark ? '#334155' : '#e2e8f0',
            color: isDark ? '#e2e8f0' : '#334155',
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            sx={{
              mb: 0.5,
              alignItems: 'center',
              gap: 1,
              flexWrap: isSystemEvent ? 'wrap' : 'nowrap',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {comment.author}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {comment.time}
            </Typography>
            {isSystemEvent && (
              comment.systemEventBadge ? (
                <Chip
                  data-testid="system-event-badge"
                  size="small"
                  label={comment.systemEventBadge.label}
                  color={comment.systemEventBadge.color}
                  variant={comment.systemEventBadge.variant}
                  sx={{
                    height: 20,
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              ) : (
                <InfoOutlinedIcon
                  aria-label="시스템 메시지"
                  titleAccess="시스템 메시지"
                  data-testid="system-event-icon"
                  fontSize="small"
                />
              )
            )}
            <Box sx={{ ml: 'auto' }}>
              {/* 2026-11-04 S_ERP 와 같이 내 댓글(isEditable)에만 수정 · 삭제 메뉴. 남의 댓글은 서버도 거절한다 */}
              {comment.isEditable === true && !isDeleted && !isSystemEvent && (
                <>
                  <IconButton
                    size="small"
                    aria-label={`댓글 메뉴 ${comment.author}`}
                    onClick={(event) => setMenuAnchor(event.currentTarget)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                  <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={() => setMenuAnchor(null)}
                  >
                    <MenuItem
                      onClick={() => {
                        setEditingCommentId(comment.id);
                        setMenuAnchor(null);
                      }}
                    >
                      수정
                    </MenuItem>
                    <MenuItem
                      onClick={async () => {
                        setMenuAnchor(null);
                        await props.onDeleteComment?.(comment.id);
                      }}
                    >
                      삭제
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Box>
          </Stack>
          {isSystemEvent ? (
            <Box
              sx={{
                fontSize: '0.9rem',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                color: 'text.secondary',
              }}
            >
              {comment.content}
            </Box>
          ) : (
            isDeleted && (
              <>
                <Box
                  sx={{
                    fontSize: '0.9rem',
                    lineHeight: 1.7,
                    color: 'text.disabled',
                    overflowWrap: 'anywhere',
                  }}
                >
                  [작성자에 의해 삭제 되었습니다.]
                </Box>
                {replyCount > 0 && (
                  <Button
                    size="small"
                    variant="text"
                    aria-expanded={showReplies}
                    endIcon={
                      showReplies ? (
                        <KeyboardArrowUpIcon
                          data-testid="reply-expanded-icon"
                          fontSize="small"
                        />
                      ) : (
                        <KeyboardArrowDownIcon
                          data-testid="reply-collapsed-icon"
                          fontSize="small"
                        />
                      )
                    }
                    onClick={() => setShowReplies((current) => !current)}
                    sx={{
                      mt: 0.5,
                      minWidth: 0,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1.25,
                      border: `1px solid ${
                        isDark
                          ? 'rgba(148,163,184,0.18)'
                          : 'rgba(148,163,184,0.2)'
                      }`,
                      bgcolor: isDark ? 'rgba(30,41,59,0.65)' : '#f8fafc',
                      color: isDark ? '#cbd5e1' : '#475569',
                      fontSize: '0.76rem',
                      fontWeight: 500,
                      textTransform: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.25,
                      lineHeight: 1.2,
                      '& .MuiButton-endIcon': {
                        marginLeft: 0.25,
                      },
                    }}
                  >
                    답글 {replyCount}개
                  </Button>
                )}
              </>
            )
          )}
          {!isEditing && !isDeleted && !isSystemEvent && (
            <>
              <Box
                sx={{
                  fontSize: '0.9rem',
                  lineHeight: 1.7,
                  overflowWrap: 'anywhere',
                  '& p': { m: 0 },
                  '& ul, & ol': { pl: 2.5, my: 0.5 },
                  ...commentMentionSx,
                }}
                dangerouslySetInnerHTML={{
                  __html: props.enableMentions
                    ? highlightMentionsInHtml(sanitizeCommentHtml(comment.content))
                    : sanitizeCommentHtml(comment.content),
                }}
              />
              {props.renderContentPreview?.(comment.content)}
              {imageAttachments.length > 0 && (
                <Box
                  data-testid={`comment-image-previews-${comment.id}`}
                  sx={{ mt: 0.75, maxWidth: '100%' }}
                >
                  {imageAttachments.some((attachment) => attachment.previewUrl) && (
                    <Box
                      sx={{
                        width: '100%',
                        height: 76,
                        overflow: 'hidden',
                        maxWidth: '100%',
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                          height: '100%',
                          width: '100%',
                          overflow: 'hidden',
                          alignItems: 'center',
                        }}
                      >
                        {imageAttachments.map((attachment, index) =>
                          attachment.previewUrl ? (
                            <Box
                              key={attachment.id}
                              component="button"
                              type="button"
                              aria-label={`댓글 이미지 미리보기 ${index + 1}: ${attachment.name}`}
                              onClick={() =>
                                props.onOpenAttachmentImage?.({
                                  src: attachment.previewUrl ?? '',
                                  alt: attachment.name,
                                })
                              }
                              sx={{
                                display: 'block',
                                flexShrink: 0,
                                width: 112,
                                height: 76,
                                p: 0,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'hidden',
                                bgcolor: 'background.paper',
                                cursor: 'pointer',
                              }}
                            >
                              <Box
                                component="img"
                                src={attachment.previewUrl}
                                alt={attachment.name}
                                sx={{
                                  display: 'block',
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            </Box>
                          ) : null,
                        )}
                      </Stack>
                    </Box>
                  )}
                  {imageAttachments.map((attachment) =>
                    attachment.previewError ? (
                      <Typography
                        key={`${attachment.id}-preview-error`}
                        role="alert"
                        color="error"
                        variant="body2"
                        sx={{ mt: 0.5 }}
                      >
                        {attachment.previewError}
                      </Typography>
                    ) : null,
                  )}
                </Box>
              )}
              {comment.attachments && comment.attachments.length > 0 && (
                <Box sx={{ mt: 0.75, maxWidth: '100%' }}>
                  <AttachmentList
                    files={comment.attachments}
                    showImagePreview={false}
                    isDark={isDark}
                    mode={canEditAttachments ? 'edit' : 'view'}
                    showActions
                    onDownload={(attachmentId) => {
                      const attachment = comment.attachments?.find(
                        (item) => String(item.id) === String(attachmentId),
                      );
                      void props.onDownloadAttachment?.(
                        comment.id,
                        attachmentId,
                        attachment?.name,
                      );
                    }}
                    onRemove={(attachmentId) => {
                      void Promise.resolve(
                        props.onDeleteAttachment?.(comment.id, attachmentId),
                      ).catch(() => undefined);
                    }}
                  />
                </Box>
              )}
              <Button
                size="small"
                variant="text"
                startIcon={<SubdirectoryArrowRightIcon fontSize="small" />}
                onClick={() => {
                  props.onReply?.(replyParentId);
                  setReplyTargetId(isReplying ? null : comment.id);
                }}
                sx={{
                  minWidth: 0,
                  pl: 0,
                  mt: 0.5,
                  color: 'text.secondary',
                  fontWeight: 600,
                  '& .MuiButton-startIcon': {
                    marginRight: 0.25,
                  },
                }}
              >
                답글
              </Button>
              {replyCount > 0 && (
                <Button
                  size="small"
                  variant="text"
                  aria-expanded={showReplies}
                  endIcon={
                    showReplies ? (
                      <KeyboardArrowUpIcon
                        data-testid="reply-expanded-icon"
                        fontSize="small"
                      />
                    ) : (
                      <KeyboardArrowDownIcon
                        data-testid="reply-collapsed-icon"
                        fontSize="small"
                      />
                    )
                  }
                  onClick={() => setShowReplies((current) => !current)}
                  sx={{
                    mt: 0.5,
                    minWidth: 0,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1.25,
                    border: `1px solid ${
                      isDark
                        ? 'rgba(148,163,184,0.18)'
                        : 'rgba(148,163,184,0.2)'
                    }`,
                    bgcolor: isDark ? 'rgba(30,41,59,0.65)' : '#f8fafc',
                    color: isDark ? '#cbd5e1' : '#475569',
                    fontSize: '0.76rem',
                    fontWeight: 500,
                    textTransform: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.25,
                    lineHeight: 1.2,
                    '& .MuiButton-endIcon': {
                      marginLeft: 0.25,
                    },
                  }}
                >
                  답글 {replyCount}개
                </Button>
              )}
            </>
          )}
          {isEditing && !isDeleted && !isSystemEvent && (
            <>
              {comment.attachments && comment.attachments.length > 0 && (
                <Box sx={{ mt: 0.75, maxWidth: '100%' }}>
                  <AttachmentList
                    files={comment.attachments}
                    isDark={isDark}
                    mode="edit"
                    showActions
                    onDownload={(attachmentId) => {
                      const attachment = comment.attachments?.find(
                        (item) => String(item.id) === String(attachmentId),
                      );
                      void props.onDownloadAttachment?.(
                        comment.id,
                        attachmentId,
                        attachment?.name,
                      );
                    }}
                    onRemove={(attachmentId) => {
                      void Promise.resolve(
                        props.onDeleteAttachment?.(comment.id, attachmentId),
                      ).catch(() => undefined);
                    }}
                  />
                </Box>
              )}
              <CommentEditor
                initialContent={comment.content}
                renderContentPreview={props.renderContentPreview}
                label="댓글 수정 입력"
                fileInputLabel="댓글 수정 첨부파일 선택"
                placeholder="줄바꿈 Shift+Enter, 입력 Enter"
                submitLabel="수정"
                isDark={isDark}
                enableMentions={false}
                onCancel={() => setEditingCommentId(null)}
                onSubmit={async (content, files) => {
                  await props.onEditComment?.(comment.id, content, files);
                  setEditingCommentId(null);
                }}
              />
            </>
          )}
          {isReplying && !isDeleted && !isSystemEvent && (
            <CommentEditor
              renderContentPreview={props.renderContentPreview}
              label="답글 입력"
              fileInputLabel="답글 첨부파일 선택"
              placeholder="줄바꿈 Shift+Enter, 입력 Enter"
              submitLabel="등록"
              isDark={isDark}
              enableMentions={props.enableMentions}
              mentionOptions={props.mentionOptions}
              onCancel={() => setReplyTargetId(null)}
              onSubmit={async (content, files, mentionedUserIds, mentionAll) => {
                if (props.enableMentions) {
                  await props.onSubmitReply?.(
                    comment.id, content, files, comment.id, mentionedUserIds, mentionAll,
                  );
                } else {
                  await props.onSubmitReply?.(comment.id, content, files, comment.id);
                }
                setShowReplies(true);
                setReplyTargetId(null);
              }}
            />
          )}
          {showReplies && comment.replies && comment.replies.length > 0 && (
            <Box
              sx={{
                mt: 1.25,
                pt: 1,
                borderTop: `1px solid ${
                  isDark
                    ? 'rgba(148, 163, 184, 0.18)'
                    : 'rgba(148, 163, 184, 0.22)'
                }`,
              }}
            >
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  rootCommentId={rootCommentId}
                  props={props}
                  replyTargetId={replyTargetId}
                  setReplyTargetId={setReplyTargetId}
                  editingCommentId={editingCommentId}
                  setEditingCommentId={setEditingCommentId}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function flattenReplies(replies: FeedCommentItem[] = []): FeedCommentItem[] {
  const flattenedById = new Map<string, FeedCommentItem>();

  replies.forEach((reply) => {
    flattenedById.set(String(reply.id), { ...reply, replies: [] });
    flattenReplies(reply.replies).forEach((nestedReply) => {
      flattenedById.set(String(nestedReply.id), nestedReply);
    });
  });

  return Array.from(flattenedById.values());
}

export function TiptapCommentThread({
  comments = [],
  onSubmitComment,
  onSubmitReply,
  onReply,
  onEditComment,
  onDeleteComment,
  onDownloadAttachment,
  onDeleteAttachment,
  onOpenAttachmentImage,
  isDark: isDarkProp,
  showComposer = true,
  placeholder = '줄바꿈 Shift+Enter, 입력 Enter',
  composerLabel = '댓글 입력',
  submitLabel = '등록',
  expandReplies = false,
  renderContentPreview,
  mentionOptions,
  enableMentions,
}: CommentThreadProps) {
  const theme = useTheme();
  const isDark = isDarkProp ?? theme.palette.mode === 'dark';
  const [replyTargetId, setReplyTargetId] = useState<string | number | null>(
    null,
  );
  const [editingCommentId, setEditingCommentId] = useState<
    string | number | null
  >(null);
  const props: CommentThreadProps = {
    comments,
    onSubmitComment,
    onSubmitReply,
    onReply,
    onEditComment,
    onDeleteComment,
    onDownloadAttachment,
    onDeleteAttachment,
    onOpenAttachmentImage,
    isDark,
    showComposer,
    placeholder,
    composerLabel,
    submitLabel,
    expandReplies,
    renderContentPreview,
    mentionOptions,
    enableMentions,
  };
  return (
    <Box sx={{ minWidth: 0 }}>
      {comments.length > 0 && (
        <Box
          sx={{
            mt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            pt: 1.5,
          }}
        >
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={{
                ...comment,
                replies: flattenReplies(comment.replies),
              }}
              depth={0}
              rootCommentId={comment.id}
              props={props}
              replyTargetId={replyTargetId}
              setReplyTargetId={setReplyTargetId}
              editingCommentId={editingCommentId}
              setEditingCommentId={setEditingCommentId}
            />
          ))}
        </Box>
      )}
      {showComposer && (
        <Box
          sx={{
            mt: 2,
            display: 'flex',
            gap: 1,
            alignItems: 'flex-start',
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              flexShrink: 0,
              mt: 1,
              borderRadius: '50%',
              bgcolor: isDark ? '#1e293b' : '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            나
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <CommentEditor
              renderContentPreview={renderContentPreview}
              label={composerLabel}
              fileInputLabel="댓글 첨부파일 선택"
              placeholder={placeholder}
              submitLabel={submitLabel}
              isDark={isDark}
              enableMentions={props.enableMentions}
              mentionOptions={props.mentionOptions}
              onSubmit={async (content, files, mentionedUserIds, mentionAll) => {
                if (props.enableMentions) {
                  await onSubmitComment?.(content, files, mentionedUserIds, mentionAll);
                } else {
                  await onSubmitComment?.(content, files);
                }
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
