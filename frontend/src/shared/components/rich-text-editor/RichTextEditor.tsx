import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  Box,
  Button,
  Divider,
  IconButton,
  MenuItem,
  Popover,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import FormatBoldOutlinedIcon from '@mui/icons-material/FormatBoldOutlined';
import FormatColorTextOutlinedIcon from '@mui/icons-material/FormatColorTextOutlined';
import FormatItalicOutlinedIcon from '@mui/icons-material/FormatItalicOutlined';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import FormatListNumberedOutlinedIcon from '@mui/icons-material/FormatListNumberedOutlined';
import InsertLinkOutlinedIcon from '@mui/icons-material/InsertLinkOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import StrikethroughSOutlinedIcon from '@mui/icons-material/StrikethroughSOutlined';
import FormatUnderlinedOutlinedIcon from '@mui/icons-material/FormatUnderlinedOutlined';
import {
  Color,
  FontFamily,
  FontSize,
  TextStyle,
} from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from '@tiptap/extension-table';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  hasSpreadsheetClipboardContent,
  normalizeClipboardHtmlForEditor,
  normalizeClipboardTextGridForEditor,
  normalizeClipboardTextForEditor,
} from './clipboard';
import { richTextEditorContentStyles } from './editorStyles';
import type {
  RichTextEditorProps,
  RichTextEditorToolbarProps,
} from './richTextEditor.types';
import { calculateImageResize, type ImageResizeDirection } from './imageResize';

const RichTextImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-upload-token': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-upload-token'),
        renderHTML: (attributes) =>
          attributes['data-upload-token']
            ? { 'data-upload-token': attributes['data-upload-token'] }
            : {},
      },
      'data-file-id': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-id'),
        renderHTML: (attributes) =>
          attributes['data-file-id']
            ? { 'data-file-id': attributes['data-file-id'] }
            : {},
      },
      'data-object-key': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-object-key'),
        renderHTML: (attributes) =>
          attributes['data-object-key']
            ? { 'data-object-key': attributes['data-object-key'] }
            : {},
      },
      'data-file-size': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-size'),
        renderHTML: (attributes) =>
          attributes['data-file-size'] != null
            ? { 'data-file-size': String(attributes['data-file-size']) }
            : {},
      },
      'data-mime-type': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-mime-type'),
        renderHTML: (attributes) =>
          attributes['data-mime-type']
            ? { 'data-mime-type': attributes['data-mime-type'] }
            : {},
      },
      'data-upload-state': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-upload-state'),
        renderHTML: (attributes) =>
          attributes['data-upload-state']
            ? { 'data-upload-state': attributes['data-upload-state'] }
            : {},
      },
      'data-editor-upload-id': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-editor-upload-id'),
        renderHTML: (attributes) =>
          attributes['data-editor-upload-id']
            ? { 'data-editor-upload-id': attributes['data-editor-upload-id'] }
            : {},
      },
    };
  },
});

const RichTextTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style'),
        renderHTML: (attributes: { style?: string | null }) =>
          attributes.style ? { style: attributes.style } : {},
      },
    };
  },
});

const RichTextTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style'),
        renderHTML: (attributes: { style?: string | null }) =>
          attributes.style ? { style: attributes.style } : {},
      },
    };
  },
});

export const richTextEditorIconButtonSx = {
  width: 32,
  height: 32,
  flexShrink: 0,
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  p: 0,
  bgcolor: 'background.paper',
  color: 'text.secondary',
  '&:hover': {
    borderColor: 'text.secondary',
    bgcolor: 'action.hover',
  },
} as const;

const textColorSwatches = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
  '#111827',
];

const toolbarIconButtonSx = (active: boolean) => ({
  width: 32,
  height: 32,
  flexShrink: 0,
  border: 0,
  borderRadius: 0.75,
  p: 0,
  color: active ? 'text.primary' : 'text.secondary',
  bgcolor: active ? 'action.selected' : 'transparent',
  '&:hover': {
    bgcolor: active ? 'action.selected' : 'action.hover',
  },
  '&.Mui-focusVisible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: 1,
  },
});

export function RichTextEditor({
  content = '<p></p>',
  onEditorReady,
  onContentChange,
  onClipboardPaste,
  readOnly = false,
  placeholder = '본문을 입력하세요.',
  ariaLabel = '본문',
  className,
  scrollMode = 'editor',
  contentSx,
  uploadImage,
  onOrphanedImageUpload,
  onUploadingChange,
  onImageUploadError,
}: RichTextEditorProps) {
  const uploadImageRef = useRef(uploadImage);
  const orphanUploadRef = useRef(onOrphanedImageUpload);
  const uploadingChangeRef = useRef(onUploadingChange);
  const uploadErrorRef = useRef(onImageUploadError);
  const clipboardPasteRef = useRef(onClipboardPaste);
  const uploadingCount = useRef(0);
  const editorRef = useRef<Editor | null>(null);
  const objectUrls = useRef(new Map<string, string>());

  useEffect(() => {
    uploadImageRef.current = uploadImage;
    orphanUploadRef.current = onOrphanedImageUpload;
    uploadingChangeRef.current = onUploadingChange;
    uploadErrorRef.current = onImageUploadError;
    clipboardPasteRef.current = onClipboardPaste;
  }, [
    uploadImage,
    onOrphanedImageUpload,
    onUploadingChange,
    onImageUploadError,
    onClipboardPaste,
  ]);

  const updateUploadingCount = (delta: number) => {
    uploadingCount.current = Math.max(0, uploadingCount.current + delta);
    uploadingChangeRef.current?.(uploadingCount.current);
  };

  const findImagePosition = (currentEditor: Editor, uploadId: string) => {
    let found = -1;
    currentEditor.state.doc.descendants((node, position) => {
      if (
        node.type.name === 'image' &&
        node.attrs['data-editor-upload-id'] === uploadId
      ) {
        found = position;
        return false;
      }
      return found < 0;
    });
    return found;
  };

  const releaseDetachedObjectUrls = (currentEditor: Editor) => {
    const activeSources = new Set<string>();
    currentEditor.state.doc.descendants((node) => {
      if (node.type.name === 'image' && typeof node.attrs.src === 'string') {
        activeSources.add(node.attrs.src);
      }
      return true;
    });
    for (const [uploadId, objectUrl] of objectUrls.current) {
      if (!activeSources.has(objectUrl)) {
        URL.revokeObjectURL(objectUrl);
        objectUrls.current.delete(uploadId);
      }
    }
  };

  const handleImagePaste = async (file: File, uploadId: string) => {
    const currentEditor = editorRef.current;
    const objectUrl = objectUrls.current.get(uploadId);
    const uploadAdapter = uploadImageRef.current;
    if (!currentEditor || !objectUrl || !uploadAdapter) return;

    updateUploadingCount(1);
    try {
      const uploaded = await uploadAdapter(file);
      const position = findImagePosition(currentEditor, uploadId);
      if (position < 0) {
        await orphanUploadRef.current?.(uploaded);
        return;
      }

      const node = currentEditor.state.doc.nodeAt(position);
      if (!node) return;
      const attributes = {
        ...node.attrs,
        src: uploaded.src ?? node.attrs.src,
        alt: uploaded.alt ?? node.attrs.alt ?? file.name,
        'data-upload-token': uploaded.uploadToken ?? null,
        'data-file-id': uploaded.fileId ?? null,
        'data-object-key': uploaded.objectKey ?? null,
        'data-file-size': uploaded.fileSize ?? null,
        'data-mime-type': uploaded.mimeType ?? null,
        'data-upload-state': null,
        'data-editor-upload-id': null,
      };
      currentEditor.view.dispatch(
        currentEditor.state.tr.setNodeMarkup(position, undefined, attributes),
      );
      if (uploaded.src) {
        URL.revokeObjectURL(objectUrl);
        objectUrls.current.delete(uploadId);
      }
      uploadErrorRef.current?.('');
    } catch {
      const position = findImagePosition(currentEditor, uploadId);
      const node =
        position >= 0 ? currentEditor.state.doc.nodeAt(position) : null;
      if (node) {
        currentEditor.view.dispatch(
          currentEditor.state.tr.delete(position, position + node.nodeSize),
        );
      }
      uploadErrorRef.current?.('본문 이미지 업로드에 실패했습니다.');
    } finally {
      updateUploadingCount(-1);
      releaseDetachedObjectUrls(currentEditor);
    }
  };

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          link: { openOnClick: false, autolink: true },
        }),
        RichTextImage.configure({ inline: false, allowBase64: false }),
        TextStyle,
        FontFamily,
        FontSize,
        Color,
        Table.configure({
          resizable: true,
          handleWidth: 6,
          cellMinWidth: 16,
          lastColumnResizable: true,
          renderWrapper: true,
        }),
        TableRow,
        RichTextTableHeader,
        RichTextTableCell,
        Placeholder.configure({
          placeholder,
          emptyEditorClass: 'is-editor-empty',
        }),
      ],
      content,
      editable: !readOnly,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          role: 'textbox',
          'aria-label': ariaLabel,
          'aria-multiline': 'true',
          spellcheck: 'true',
        },
        transformPastedHTML: (html) => normalizeClipboardHtmlForEditor(html),
        transformPastedText: normalizeClipboardTextForEditor,
        handlePaste: (view, event) => {
          const data = event.clipboardData;
          const getNormalizedClipboard = () => {
            if (!data) return '';
            const html = data.getData('text/html') ?? '';
            const plainText = data.getData('text/plain') ?? '';
            return html.trim()
              ? normalizeClipboardHtmlForEditor(html, plainText)
              : normalizeClipboardTextGridForEditor(plainText);
          };
          const reportPaste = () => {
            if (!data) return;
            clipboardPasteRef.current?.(data, getNormalizedClipboard());
          };
          if (hasSpreadsheetClipboardContent(data)) {
            const normalizedClipboard = getNormalizedClipboard();
            if (data) {
              clipboardPasteRef.current?.(data, normalizedClipboard);
            }
            event.preventDefault();
            if (!readOnly && normalizedClipboard) {
              editorRef.current?.commands.insertContent(normalizedClipboard);
            }
            return true;
          }
          const files = Array.from(event.clipboardData?.items ?? [])
            .filter(
              (item) => item.kind === 'file' && item.type.startsWith('image/'),
            )
            .map((item) => item.getAsFile())
            .filter((file): file is File => Boolean(file));
          if (files.length === 0) {
            reportPaste();
            return false;
          }

          event.preventDefault();
          const uploadAdapter = uploadImageRef.current;
          if (!uploadAdapter || readOnly) return true;
          files.forEach((file) => {
            const uploadId = `editor-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`;
            const objectUrl = URL.createObjectURL(file);
            objectUrls.current.set(uploadId, objectUrl);
            const image = view.state.schema.nodes.image.create({
              src: objectUrl,
              alt: file.name,
              'data-editor-upload-id': uploadId,
              'data-upload-state': 'uploading',
            });
            view.dispatch(
              view.state.tr.replaceSelectionWith(image).scrollIntoView(),
            );
            void handleImagePaste(file, uploadId);
          });
          return true;
        },
      },
      onUpdate: ({ editor: updatedEditor }) => {
        releaseDetachedObjectUrls(updatedEditor);
        onContentChange?.(updatedEditor);
      },
    },
    [],
  );

  useEffect(() => {
    editorRef.current = editor;
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  useEffect(
    () => () => {
      objectUrls.current.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      objectUrls.current.clear();
      if (uploadingCount.current > 0) {
        uploadingCount.current = 0;
        uploadingChangeRef.current?.(0);
      }
    },
    [],
  );

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || readOnly) return;

    const overlay = document.createElement('div');
    overlay.className = 'rich-text-image-resize-overlay';
    overlay.setAttribute('role', 'group');
    overlay.setAttribute('aria-label', '이미지 크기 조절 영역');
    Object.assign(overlay.style, {
      display: 'none',
      position: 'fixed',
      zIndex: '1400',
      pointerEvents: 'none',
      boxSizing: 'border-box',
      border: '1px solid #2563eb',
      touchAction: 'none',
    });
    const directions: ImageResizeDirection[] = [
      'nw',
      'n',
      'ne',
      'e',
      'se',
      's',
      'sw',
      'w',
    ];
    const handles = directions.map((direction) => {
      const handle = document.createElement('span');
      handle.className = `rich-text-image-resize-handle rich-text-image-resize-handle-${direction}`;
      handle.dataset.direction = direction;
      handle.setAttribute('aria-label', `${direction} 방향 이미지 크기 조절`);
      Object.assign(handle.style, {
        position: 'absolute',
        width: '10px',
        height: '10px',
        border: '1px solid #1d4ed8',
        borderRadius: '2px',
        backgroundColor: '#ffffff',
        pointerEvents: 'auto',
        touchAction: 'none',
        transform: 'translate(-50%, -50%)',
      });
      return handle;
    });
    handles.forEach((handle) => overlay.appendChild(handle));
    document.body.appendChild(overlay);

    let selectedImage: HTMLImageElement | null = null;
    let selectedImagePosition = -1;
    const syncOverlay = () => {
      const selectedNode = editor.view.dom.querySelector(
        'img.ProseMirror-selectednode',
      );
      selectedImage =
        selectedNode instanceof HTMLImageElement ? selectedNode : null;
      selectedImagePosition = selectedImage
        ? editor.view.posAtDOM(selectedImage, 0)
        : -1;
      if (!selectedImage) {
        overlay.style.display = 'none';
        return;
      }

      const imageRect = selectedImage.getBoundingClientRect();
      const editorRect = editor.view.dom.getBoundingClientRect();
      const clipTop = Math.max(0, editorRect.top - imageRect.top);
      const clipRight = Math.max(0, imageRect.right - editorRect.right);
      const clipBottom = Math.max(0, imageRect.bottom - editorRect.bottom);
      const clipLeft = Math.max(0, editorRect.left - imageRect.left);
      overlay.style.display = 'block';
      overlay.style.left = `${imageRect.left}px`;
      overlay.style.top = `${imageRect.top}px`;
      overlay.style.width = `${imageRect.width}px`;
      overlay.style.height = `${imageRect.height}px`;
      overlay.style.clipPath = `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px)`;

      const positions: Record<ImageResizeDirection, [string, string]> = {
        nw: ['0%', '0%'],
        n: ['50%', '0%'],
        ne: ['100%', '0%'],
        e: ['100%', '50%'],
        se: ['100%', '100%'],
        s: ['50%', '100%'],
        sw: ['0%', '100%'],
        w: ['0%', '50%'],
      };
      handles.forEach((handle) => {
        const direction = handle.dataset.direction as ImageResizeDirection;
        const [left, top] = positions[direction];
        handle.style.left = left;
        handle.style.top = top;
        handle.style.cursor = `${direction}-resize`;
      });
    };
    const handleImagePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const image = target?.closest('img');
      if (!image || !editor.view.dom.contains(image)) return;
      const position = editor.view.posAtDOM(image, 0);
      if (!Number.isFinite(position)) return;
      editor.commands.setNodeSelection(position);
      syncOverlay();
    };
    const handleResizePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const direction = target?.dataset.direction as
        | ImageResizeDirection
        | undefined;
      if (!direction || !selectedImage || selectedImagePosition < 0) return;

      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const startRect = selectedImage.getBoundingClientRect();
      const startWidth = startRect.width || 320;
      const startHeight = startRect.height || 200;
      const handlePointerMove = (moveEvent: PointerEvent) => {
        const size = calculateImageResize(
          startWidth,
          startHeight,
          moveEvent.clientX - startX,
          moveEvent.clientY - startY,
          direction,
        );
        editor
          .chain()
          .focus()
          .setNodeSelection(selectedImagePosition)
          .updateAttributes('image', {
            width: `${size.width}px`,
            height: `${size.height}px`,
          })
          .run();
        syncOverlay();
      };
      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    };

    editor.view.dom.addEventListener('mousedown', handleImagePointerDown);
    editor.on('selectionUpdate', syncOverlay);
    editor.on('update', syncOverlay);
    overlay.addEventListener('pointerdown', handleResizePointerDown);
    window.addEventListener('resize', syncOverlay);
    window.addEventListener('scroll', syncOverlay, true);
    editor.view.dom.addEventListener('scroll', syncOverlay, true);
    syncOverlay();

    return () => {
      editor.view.dom.removeEventListener('mousedown', handleImagePointerDown);
      editor.off('selectionUpdate', syncOverlay);
      editor.off('update', syncOverlay);
      overlay.removeEventListener('pointerdown', handleResizePointerDown);
      window.removeEventListener('resize', syncOverlay);
      window.removeEventListener('scroll', syncOverlay, true);
      editor.view.dom.removeEventListener('scroll', syncOverlay, true);
      overlay.remove();
    };
  }, [editor, readOnly]);

  return (
    <Box
      className={className}
      sx={[
        {
          display: 'flex',
          flex: '1 1 0%',
          flexDirection: 'column',
          width: '100%',
          minWidth: 0,
          minHeight: 0,
          height: '100%',
          overflow: 'hidden',
        },
        richTextEditorContentStyles,
        contentSx ? { '& .ProseMirror': contentSx } : {},
        scrollMode === 'container'
          ? {
              display: 'block',
              flex: 'none',
              height: 'auto',
              overflow: 'visible',
              '& .rich-text-editor-content': {
                display: 'block',
                flex: 'none',
                height: 'auto',
                overflow: 'visible',
              },
              '& .rich-text-editor-content > .ProseMirror': {
                flex: 'none',
                minHeight: 180,
                maxHeight: 'none',
                overflowX: 'visible',
                overflowY: 'visible',
                overflow: 'visible',
              },
            }
          : {},
      ]}
    >
      <EditorContent editor={editor} className="rich-text-editor-content" />
    </Box>
  );
}

export function RichTextEditorToolbar({
  editor,
  panelTestId = 'rich-text-editor-toolbar',
}: RichTextEditorToolbarProps) {
  const [open, setOpen] = useState(false);
  const [linkAnchor, setLinkAnchor] = useState<HTMLElement | null>(null);
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  const [linkText, setLinkText] = useState('');
  const [linkValue, setLinkValue] = useState('');
  const [linkError, setLinkError] = useState('');
  const [textColor, setTextColor] = useState('#000000');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [, refreshToolbar] = useReducer((revision: number) => revision + 1, 0);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editor) return;
    const handleEditorTransaction = () => refreshToolbar();
    editor.on('transaction', handleEditorTransaction);
    return () => {
      editor.off('transaction', handleEditorTransaction);
    };
  }, [editor]);

  const paragraphValue =
    !editor || editor.isActive('paragraph')
      ? 'paragraph'
      : editor.isActive('heading', { level: 1 })
        ? 'heading-1'
        : editor.isActive('heading', { level: 2 })
          ? 'heading-2'
          : editor.isActive('heading', { level: 3 })
            ? 'heading-3'
            : 'paragraph';

  const handleParagraphChange = (value: string) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === 'paragraph') {
      chain.setParagraph().run();
      return;
    }
    const level = Number(value.slice(-1)) as 1 | 2 | 3;
    chain.setHeading({ level }).run();
  };

  const openColorPalette = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!editor) return;
    setTextColor(String(editor.getAttributes('textStyle').color ?? '#000000'));
    setColorAnchor(event.currentTarget);
  };

  const applyTextColor = (color: string | null) => {
    if (!editor) return;
    if (color) {
      setTextColor(color);
      setRecentColors((current) =>
        [
          color,
          ...current.filter((recentColor) => recentColor !== color),
        ].slice(0, 6),
      );
      editor.chain().focus().setColor(color).run();
    } else {
      setTextColor('#000000');
      editor.chain().focus().unsetColor().run();
    }
    setColorAnchor(null);
  };

  const renderColorSwatch = (color: string, isRecent = false) => (
    <IconButton
      key={`${isRecent ? 'recent' : 'preset'}-${color}`}
      size="small"
      aria-label={`${isRecent ? '최근 색상' : '색상'} ${color}`}
      aria-pressed={textColor === color}
      onClick={() => applyTextColor(color)}
      sx={{
        width: 20,
        height: 20,
        p: 0,
        borderRadius: 0.5,
        border: 1,
        borderColor: textColor === color ? 'text.primary' : 'divider',
      }}
    >
      <Box
        sx={{
          width: 14,
          height: 14,
          bgcolor: color,
          borderRadius: 0.25,
        }}
      />
    </IconButton>
  );

  const openLinkEditor = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().extendMarkRange('link').run();
    }
    const { from, to } = editor.state.selection;
    setLinkText(editor.state.doc.textBetween(from, to));
    setLinkValue(String(editor.getAttributes('link').href ?? ''));
    setLinkError('');
    setLinkAnchor(event.currentTarget);
  };

  const applyLink = () => {
    if (!editor) return;
    const rawValue = linkValue.trim();
    const href = /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i.test(rawValue)
      ? rawValue
      : /^[a-z\d.-]+\.[a-z]{2,}(?::\d+)?(?:\/.*)?$/i.test(rawValue)
        ? `https://${rawValue}`
        : '';
    if (!href) {
      setLinkError('유효한 링크 주소를 입력해 주세요.');
      return;
    }
    const text = linkText.trim();
    if (!text) {
      setLinkError('표시 텍스트를 입력해 주세요.');
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'text',
        text,
        marks: [{ type: 'link', attrs: { href } }],
      })
      .run();
    setLinkAnchor(null);
  };

  const removeLink = () => {
    editor?.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkAnchor(null);
  };

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!open || !toolbar) return;

    const handleWheel = (event: WheelEvent) => {
      if (
        toolbar.scrollWidth <= toolbar.clientWidth ||
        Math.abs(event.deltaX) >= Math.abs(event.deltaY)
      ) {
        return;
      }
      event.preventDefault();
      toolbar.scrollLeft = Math.max(
        0,
        Math.min(
          toolbar.scrollWidth - toolbar.clientWidth,
          toolbar.scrollLeft + event.deltaY,
        ),
      );
    };

    toolbar.addEventListener('wheel', handleWheel, { passive: false });
    return () => toolbar.removeEventListener('wheel', handleWheel);
  }, [editor, open]);

  return (
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Tooltip title="툴바 열기">
        <span>
          <IconButton
            size="small"
            aria-label="툴바 열기"
            aria-expanded={open}
            disabled={!editor}
            onClick={() => setOpen((current) => !current)}
            sx={toolbarIconButtonSx(open)}
          >
            <FormatBoldOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      {open && editor && (
        <Box
          ref={toolbarRef}
          data-testid={panelTestId}
          sx={{
            position: 'absolute',
            left: 0,
            bottom: 'calc(100% + 8px)',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            p: 0.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1.5,
            bgcolor: 'background.paper',
            maxWidth: 'min(520px, calc(100vw - 64px))',
            overflowX: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(100, 116, 139, 0.65) transparent',
            '&::-webkit-scrollbar': {
              height: 6,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(100, 116, 139, 0.65)',
              borderRadius: 3,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
          }}
        >
          <Select
            size="small"
            variant="standard"
            value={paragraphValue}
            inputProps={{ 'aria-label': '문단' }}
            onChange={(event) =>
              handleParagraphChange(String(event.target.value))
            }
            sx={{
              width: 88,
              flexShrink: 0,
              px: 1,
              fontSize: '0.875rem',
              '&:before, &:after': { display: 'none' },
              '& .MuiSelect-select': { py: 0.75, pr: '24px !important' },
            }}
          >
            <MenuItem value="paragraph">본문</MenuItem>
            <MenuItem value="heading-1">제목 1</MenuItem>
            <MenuItem value="heading-2">제목 2</MenuItem>
            <MenuItem value="heading-3">부제목</MenuItem>
          </Select>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
          <Tooltip title="굵게">
            <IconButton
              size="small"
              aria-label="굵게"
              aria-pressed={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
              sx={toolbarIconButtonSx(editor.isActive('bold'))}
            >
              <FormatBoldOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="기울임">
            <IconButton
              size="small"
              aria-label="기울임"
              aria-pressed={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              sx={toolbarIconButtonSx(editor.isActive('italic'))}
            >
              <FormatItalicOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="밑줄">
            <IconButton
              size="small"
              aria-label="밑줄"
              aria-pressed={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              sx={toolbarIconButtonSx(editor.isActive('underline'))}
            >
              <FormatUnderlinedOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="취소선">
            <IconButton
              size="small"
              aria-label="취소선"
              aria-pressed={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              sx={toolbarIconButtonSx(editor.isActive('strike'))}
            >
              <StrikethroughSOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="글자 색상">
            <IconButton
              size="small"
              aria-label="글자 색상"
              aria-pressed={Boolean(editor.getAttributes('textStyle').color)}
              onClick={openColorPalette}
              sx={{
                ...toolbarIconButtonSx(
                  Boolean(editor.getAttributes('textStyle').color),
                ),
                position: 'relative',
              }}
            >
              <FormatColorTextOutlinedIcon fontSize="small" />
              <Box
                sx={{
                  position: 'absolute',
                  left: 9,
                  right: 9,
                  bottom: 5,
                  height: 2,
                  bgcolor: textColor,
                }}
              />
            </IconButton>
          </Tooltip>
          <Popover
            open={Boolean(colorAnchor)}
            anchorEl={colorAnchor}
            onClose={() => setColorAnchor(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            slotProps={{
              paper: {
                sx: { width: 176, p: 1, border: 1, borderColor: 'divider' },
              },
            }}
          >
            <Button
              size="small"
              fullWidth
              onClick={() => applyTextColor(null)}
              sx={{ justifyContent: 'flex-start', mb: 0.75 }}
              startIcon={
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    bgcolor: 'text.primary',
                    border: 1,
                    borderColor: 'divider',
                  }}
                />
              }
            >
              기본 색상
            </Button>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 0.5,
              }}
              data-testid="rich-text-editor-color-swatches"
            >
              {textColorSwatches.map((color) => renderColorSwatch(color))}
            </Box>
            {recentColors.length > 0 && (
              <>
                <Divider sx={{ my: 0.75 }} />
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}
                >
                  최근 색상
                </Typography>
                <Box
                  data-testid="rich-text-editor-recent-colors"
                  role="group"
                  aria-label="최근 색상"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: 0.5,
                  }}
                >
                  {recentColors.map((color) => renderColorSwatch(color, true))}
                </Box>
              </>
            )}
          </Popover>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
          <Tooltip title="표 삽입">
            <IconButton
              size="small"
              aria-label="표 삽입"
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: false })
                  .run()
              }
              sx={toolbarIconButtonSx(false)}
            >
              <TableChartOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="링크">
            <IconButton
              size="small"
              aria-label="링크"
              aria-pressed={editor.isActive('link')}
              onClick={openLinkEditor}
              sx={toolbarIconButtonSx(editor.isActive('link'))}
            >
              <InsertLinkOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
          <Tooltip title="번호 목록">
            <IconButton
              size="small"
              aria-label="번호 목록"
              aria-pressed={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              sx={toolbarIconButtonSx(editor.isActive('orderedList'))}
            >
              <FormatListNumberedOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="글머리 기호">
            <IconButton
              size="small"
              aria-label="글머리 기호"
              aria-pressed={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              sx={toolbarIconButtonSx(editor.isActive('bulletList'))}
            >
              <FormatListBulletedOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Popover
            open={Boolean(linkAnchor)}
            anchorEl={linkAnchor}
            onClose={() => setLinkAnchor(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            slotProps={{
              paper: {
                sx: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  p: 1.5,
                  width: 300,
                  maxWidth: 'calc(100vw - 32px)',
                },
              },
            }}
          >
            <TextField
              autoFocus
              size="small"
              fullWidth
              label="표시 텍스트"
              value={linkText}
              error={Boolean(linkError) && !linkText.trim()}
              helperText={
                Boolean(linkError) && !linkText.trim() ? linkError : undefined
              }
              onChange={(event) => {
                setLinkText(event.target.value);
                setLinkError('');
              }}
            />
            <TextField
              size="small"
              fullWidth
              label="URL"
              value={linkValue}
              error={Boolean(linkError) && Boolean(linkText.trim())}
              helperText={
                Boolean(linkError) && Boolean(linkText.trim())
                  ? linkError
                  : undefined
              }
              onChange={(event) => {
                setLinkValue(event.target.value);
                if (linkError) setLinkError('');
              }}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 0.5,
                width: '100%',
              }}
            >
              {editor.isActive('link') && (
                <Button size="small" onClick={removeLink}>
                  링크 제거
                </Button>
              )}
              <Box sx={{ flex: 1 }} />
              <Button size="small" onClick={() => setLinkAnchor(null)}>
                취소
              </Button>
              <Button size="small" variant="contained" onClick={applyLink}>
                확인
              </Button>
            </Box>
          </Popover>
        </Box>
      )}
    </Box>
  );
}
