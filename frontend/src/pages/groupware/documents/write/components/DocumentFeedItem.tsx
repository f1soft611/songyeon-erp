import { Stack } from '@mui/material';
import { DocumentApprovalDetailFeed } from './DocumentApprovalDetailFeed';
import type {
  DocumentApprovalDetail,
  DocumentFeedWriteItem,
} from '../types/documentWrite.types';

type DocumentFeedItemProps = {
  item: DocumentFeedWriteItem;
  employeeId: string;
  pinPending: boolean;
  detailRefreshToken: number;
  onTogglePin: (
    electronicApprovalId: number,
    pinned: boolean,
    title: string,
  ) => void;
  onActionComplete: () => void;
  onEditDocument: (detail: DocumentApprovalDetail) => void;
  onOpenDocument?: (documentId: number) => void;
};

export function DocumentFeedItem({
  item,
  employeeId,
  pinPending,
  detailRefreshToken,
  onTogglePin,
  onActionComplete,
  onEditDocument,
  onOpenDocument,
}: DocumentFeedItemProps) {
  return (
    <Stack spacing={1}>
      <DocumentApprovalDetailFeed
        key={item.id}
        presentation="feed"
        feedItem={item}
        employeeId={employeeId}
        open
        electronicApprovalId={item.id}
        onActionComplete={onActionComplete}
        onEditDocument={onEditDocument}
        onOpenDocument={onOpenDocument}
        detailRefreshToken={detailRefreshToken}
        pinPending={pinPending}
        onTogglePin={onTogglePin}
      />
    </Stack>
  );
}
