import { useMemo } from 'react';
import { F1Grid } from '../../../../../shared/components/f1-grid';
import { createDocumentStatusColumns } from '../data/documentStatusColumns';
import type { DocumentStatusRow } from '../types/documentStatus.types';

export { createDocumentStatusColumns } from '../data/documentStatusColumns';

type DocumentStatusGridProps = {
  rows: DocumentStatusRow[];
  loading: boolean;
  canExportExcel: boolean;
  onOpenDocument: (row: DocumentStatusRow) => void;
};

export function DocumentStatusGrid({
  rows,
  loading,
  canExportExcel,
  onOpenDocument,
}: DocumentStatusGridProps) {
  const columns = useMemo(
    () => createDocumentStatusColumns({ onOpenDocument }),
    [onOpenDocument],
  );

  return (
    <F1Grid
      ariaLabel="문서현황"
      columns={columns}
      storageKey="documentStatusGrid"
      rowKey="electronicApprovalId"
      rows={rows}
      loading={loading}
      showCheckbox={false}
      selectionMode="row"
      selectRowOnContextMenu={false}
      allowAddRowInContextMenu={false}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
      canExportExcel={canExportExcel}
      height="100%"
      minHeight={320}
    />
  );
}
