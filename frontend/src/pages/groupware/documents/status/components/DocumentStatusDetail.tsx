import { PageAreaOverlay } from '../../../../../shared/components/view-mode/PageAreaOverlay';
import { useState } from 'react';
import { DocumentApprovalDetailFeed } from '../../write/components/DocumentApprovalDetailFeed';
import { DocumentComposerDialog } from '../../write/components/DocumentComposerDialog';
import { DocumentLinkedDetailPanel } from '../../write/components/DocumentLinkedDetailPanel';
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
  const [linkedDocumentId, setLinkedDocumentId] = useState<number | null>(null);
  const linkedDetail = (
    <DocumentLinkedDetailPanel
      documentId={linkedDocumentId}
      onClose={() => setLinkedDocumentId(null)}
      onOpenDocument={setLinkedDocumentId}
      allowDocumentChanges={!isComposerOpen}
      onActionComplete={onActionComplete}
      onEditDocument={(document) => {
        setLinkedDocumentId(null);
        onEditDocument(document);
      }}
      detailRefreshToken={detailRefreshToken}
    />
  );
  return (
    <>
      {selectedDocumentId !== null ? (
        <PageAreaOverlay onClose={() => {
          if (linkedDocumentId === null) onClose();
        }}>
          <DocumentApprovalDetailFeed
            key={selectedDocumentId}
            onOpenDocument={setLinkedDocumentId}
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
        linkedDetail={isComposerOpen && linkedDocumentId !== null ? linkedDetail : null}
        onCloseLinkedDocument={() => setLinkedDocumentId(null)}
        onOpenDocument={setLinkedDocumentId}
        open={isComposerOpen}
        initialDocument={editingDocument}
        onClose={() => {
          setLinkedDocumentId(null);
          onComposerClose();
        }}
      />
      {!isComposerOpen && linkedDetail}
    </>
  );
}
