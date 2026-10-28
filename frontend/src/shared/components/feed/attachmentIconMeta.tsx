import type { SvgIconComponent } from '@mui/icons-material';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';

export type AttachmentIconMeta = {
  bg: string;
  color: string;
  label: string;
  icon: SvgIconComponent;
};

const fileTypeStyles: Record<string, Omit<AttachmentIconMeta, 'icon'>> = {
  pdf: { bg: '#fecaca', color: '#991b1b', label: 'PDF' },
  xls: { bg: '#bbf7d0', color: '#166534', label: 'XLS' },
  xlsx: { bg: '#bbf7d0', color: '#166534', label: 'XLSX' },
  doc: { bg: '#bfdbfe', color: '#1d4ed8', label: 'DOC' },
  docx: { bg: '#bfdbfe', color: '#1d4ed8', label: 'DOCX' },
  ppt: { bg: '#fed7aa', color: '#b45309', label: 'PPT' },
  pptx: { bg: '#fed7aa', color: '#b45309', label: 'PPTX' },
  png: { bg: '#ddd6fe', color: '#5b21b6', label: 'PNG' },
  jpg: { bg: '#d1fae5', color: '#065f46', label: 'JPG' },
  jpeg: { bg: '#d1fae5', color: '#065f46', label: 'JPEG' },
  zip: { bg: '#e5e7eb', color: '#374151', label: 'ZIP' },
  hwp: { bg: '#dbeafe', color: '#1d4ed8', label: 'HWP' },
};

export function getAttachmentIconMeta(fileName: string): AttachmentIconMeta {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  const icon =
    extension === 'pdf'
      ? PictureAsPdfOutlinedIcon
      : extension === 'xls' || extension === 'xlsx'
        ? TableChartOutlinedIcon
        : extension === 'doc' || extension === 'docx' || extension === 'hwp'
          ? DescriptionOutlinedIcon
          : extension === 'ppt' || extension === 'pptx'
            ? SlideshowOutlinedIcon
            : extension === 'png' || extension === 'jpg' || extension === 'jpeg'
              ? ImageOutlinedIcon
              : extension === 'zip'
                ? ArchiveOutlinedIcon
                : InsertDriveFileOutlinedIcon;

  return {
    ...(fileTypeStyles[extension] ?? {
      bg: '#e2e8f0',
      color: '#475569',
      label: 'FILE',
    }),
    icon,
  };
}

export function getAttachmentExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || 'file';
}
