import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

export const richTextEditorContentStyles: SystemStyleObject<Theme> = {
  '& .rich-text-editor-content': {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 0%',
    width: '100%',
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    overflow: 'hidden',
  },
  '& .rich-text-editor-content > .ProseMirror': {
    flex: '1 1 0%',
    minHeight: 0,
    maxHeight: '100%',
    overflowX: 'auto',
    overflowY: 'auto',
  },
  '& .ProseMirror': {
    fontSize: '0.95rem',
    lineHeight: 1.7,
    width: '100%',
    minWidth: 0,
    minHeight: 180,
    overflow: 'auto',
    outline: 'none',
    boxSizing: 'border-box',
    '& p': {
      margin: 0,
      fontSize: '16px',
      fontWeight: 400,
      whiteSpace: 'pre-wrap',
    },
    '& table p': {
      fontSize: 'inherit',
      lineHeight: 'normal',
    },
    '& h1': {
      margin: '0.25em 0',
      fontSize: '24px',
      fontWeight: 700,
      lineHeight: 1.35,
    },
    '& h2': {
      margin: '0.25em 0',
      fontSize: '20px',
      fontWeight: 700,
      lineHeight: 1.4,
    },
    '& h3': {
      margin: '0.25em 0',
      fontSize: '18px',
      fontWeight: 600,
      lineHeight: 1.45,
    },
    '& p:empty': {
      minHeight: '1.7em',
    },
    '& ul, & ol': {
      margin: '8px 0 8px 18px',
      paddingLeft: '18px',
    },
    '& blockquote': {
      margin: '8px 0',
      paddingLeft: '12px',
      borderLeft: '3px solid rgba(59,130,246,0.42)',
    },
    '& table': {
      width: 'max-content',
      minWidth: 'max-content',
      maxWidth: 'none',
      borderCollapse: 'collapse',
      tableLayout: 'auto',
      margin: '8px 0',
    },
    '& th, & td': {
      minWidth: 0,
      border: '1px solid #1f2937',
      boxSizing: 'border-box',
      position: 'relative',
      verticalAlign: 'top',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    },
    '& th': {
      fontWeight: 700,
    },
    '& .tableWrapper': {
      width: '100%',
      maxWidth: '100%',
      overflowX: 'auto',
      margin: '8px 0',
    },
    '& .column-resize-handle': {
      position: 'absolute',
      top: 0,
      right: -3,
      bottom: 0,
      width: 6,
      zIndex: 10,
      cursor: 'col-resize',
      backgroundColor: 'rgba(37, 99, 235, 0.45)',
      pointerEvents: 'none',
    },
    '&.resize-cursor': {
      cursor: 'col-resize',
    },
    '& img': {
      maxWidth: '100%',
      height: 'auto',
      display: 'block',
      cursor: 'pointer',
      margin: '8px 0',
      transition: 'outline 0.15s ease, box-shadow 0.15s ease',
    },
    '& img.ProseMirror-selectednode': {
      outline: '2px solid rgba(59,130,246,0.9)',
      boxShadow: '0 0 0 2px rgba(96,165,250,0.35)',
    },
  },
};
