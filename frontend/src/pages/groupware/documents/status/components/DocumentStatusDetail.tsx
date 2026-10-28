import { PageAreaOverlay } from '../../../../../shared/components/view-mode/PageAreaOverlay';
import { DocumentApprovalDetailFeed } from '../../write/components/DocumentApprovalDetailFeed';
import { DocumentComposerDialog } from '../../write/components/DocumentComposerDialog';
import type { DocumentApprovalDetail } from '../../write/types/documentWrite.types';

type DocumentStatusDetailProps = {
  selectedDocumentId: number | null;
  editingDocument: DocumentApprovalDetail | null;
  isComposerOpen: boolean;
  detailRefreshToken: number;
  onClose: () => void;
  onActionComplete: () => void;
  onEditDocument: (document: DocumentApprovalDetail) => void;
  onComposerClose: () => void;
};

export function DocumentStatusDetail({
  selectedDocumentId,
  editingDocument,
  isComposerOpen,
  detailRefreshToken,
  onClose,
  onActionComplete,
  onEditDocument,
  onComposerClose,
}: DocumentStatusDetailProps) {
  return (
    <>
      {selectedDocumentId !== null ? (
        <PageAreaOverlay onClose={onClose}>
          <DocumentApprovalDetailFeed
            open
            electronicApprovalId={selectedDocumentId}
            onClose={onClose}
            onActionComplete={onActionComplete}
            onEditDocument={onEditDocument}
            detailRefreshToken={detailRefreshToken}
          />
        </PageAreaOverlay>
      ) : null}
      <DocumentComposerDialog
        open={isComposerOpen}
        initialDocument={editingDocument}
        onClose={onComposerClose}
      />
    </>
  );
}
