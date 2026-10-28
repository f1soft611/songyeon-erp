import dayjs from 'dayjs';
import { FileView } from '../../../../../shared/components/view-mode/FileView';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { downloadApprovalCommentAttachment, downloadDocumentApprovalAttachment } from '../services/documentApproval.service';
import type { useDocumentFiles } from '../hooks/useDocumentFiles';

type DocumentFileListProps = {
  files: ReturnType<typeof useDocumentFiles>;
  scrollRoot: HTMLElement | null;
  onRefresh: () => void;
  onOpenDocument: (documentId: number) => void;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)) - 1, units.length - 1);
  return `${Number((bytes / 1024 ** (index + 1)).toFixed(1))} ${units[index]}`;
}

export function DocumentFileList({ files, scrollRoot, onRefresh, onOpenDocument }: DocumentFileListProps) {
  const { showError } = useNotification();
  const items = files.items.map((file) => ({
    ...file,
    id: file.fileId,
    name: file.fileName,
    ownerLabel: file.uploadedByName,
    dateLabel: dayjs(file.createdAt).format('YYYY-MM-DD HH:mm'),
    sizeLabel: formatSize(file.fileSize),
    description: `${file.documentTitle} · ${file.commentId === null ? '문서 첨부' : '댓글 첨부'}`,
  }));
  return <FileView
    items={items}
    isLoading={files.isLoading}
    hasNext={files.hasNext}
    error={files.error}
    scrollRoot={scrollRoot}
    onLoadMore={files.loadMore}
    onRetry={files.retry}
    onRefresh={onRefresh}
    onOpenSource={(file) => onOpenDocument(file.electronicApprovalId)}
    onDownload={(file) => {
      const request = file.commentId === null
        ? downloadDocumentApprovalAttachment(file.electronicApprovalId, file.fileId, file.fileName)
        : downloadApprovalCommentAttachment(file.electronicApprovalId, file.commentId, file.fileId, file.fileName);
      void request.catch((error: unknown) => {
        showError(error instanceof Error ? error.message : '첨부파일을 다운로드하지 못했습니다.');
      });
    }}
  />;
}
