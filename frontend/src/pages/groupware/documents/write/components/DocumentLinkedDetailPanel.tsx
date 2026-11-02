import { PageAreaOverlay } from '../../../../../shared/components/view-mode/PageAreaOverlay';
import { DocumentApprovalDetailFeed } from './DocumentApprovalDetailFeed';
import type { DocumentApprovalDetail } from '../types/documentWrite.types';

type DocumentLinkedDetailPanelProps = {
  documentId: number | null;
  onClose: () => void;
  onOpenDocument: (documentId: number) => void;
  onActionComplete: () => void;
  onEditDocument: (document: DocumentApprovalDetail) => void;
  detailRefreshToken: number;
  allowDocumentChanges: boolean;
};

export function DocumentLinkedDetailPanel({
  documentId,
  onClose,
  onOpenDocument,
  onActionComplete,
  onEditDocument,
  detailRefreshToken,
  allowDocumentChanges,
}: DocumentLinkedDetailPanelProps) {
  if (documentId === null) return null;
  return (
    <PageAreaOverlay onClose={onClose}>
        <DocumentApprovalDetailFeed
          key={documentId}
          open
          electronicApprovalId={documentId}
          onClose={onClose}
          onOpenDocument={onOpenDocument}
          allowDocumentChanges={allowDocumentChanges}
          onActionComplete={onActionComplete}
          onEditDocument={onEditDocument}
          detailRefreshToken={detailRefreshToken}
        />
    </PageAreaOverlay>
  );
}
