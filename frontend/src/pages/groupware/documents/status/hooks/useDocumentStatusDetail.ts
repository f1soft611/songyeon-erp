import { useCallback, useState } from 'react';
import type { DocumentApprovalDetail } from '../../write/types/documentWrite.types';
import type { DocumentStatusRow } from '../types/documentStatus.types';

export function useDocumentStatusDetail() {
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [editingDocument, setEditingDocument] = useState<DocumentApprovalDetail | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [detailRefreshToken, setDetailRefreshToken] = useState(0);

  const handleOpenDocument = useCallback((row: DocumentStatusRow) => {
    const parsedId = Number(row.electronicApprovalId);
    setSelectedDocumentId(
      Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null,
    );
  }, []);

  const closeDetail = useCallback(() => setSelectedDocumentId(null), []);
  const refreshDetail = useCallback(() => {
    setDetailRefreshToken((current) => current + 1);
  }, []);

  const handleEditDocument = useCallback((document: DocumentApprovalDetail) => {
    setEditingDocument(document);
    setIsComposerOpen(true);
  }, []);

  const closeComposer = useCallback(() => {
    setIsComposerOpen(false);
    setEditingDocument(null);
  }, []);

  return {
    selectedDocumentId,
    editingDocument,
    isComposerOpen,
    detailRefreshToken,
    handleOpenDocument,
    closeDetail,
    refreshDetail,
    handleEditDocument,
    closeComposer,
  };
}
