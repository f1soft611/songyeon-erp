import { F1Grid } from '../../../../../shared/components/f1-grid';
import { createDocumentStatusColumns } from '../data/documentStatusColumns';
import type { DocumentStatusRow } from '../types/documentStatus.types';

export { createDocumentStatusColumns } from '../data/documentStatusColumns';

type DocumentStatusGridProps = {
  rows: DocumentStatusRow[];
  loading: boolean;
  onSelectionChange: (rowIds: Array<string | number>) => void;
};

const columns = createDocumentStatusColumns();

export function DocumentStatusGrid({
  rows,
  loading,
  onSelectionChange,
}: DocumentStatusGridProps) {
  return (
    <F1Grid
      ariaLabel="문서현황"
      columns={columns}
      storageKey="documentStatusGrid"
      rowKey="electronicApprovalId"
      rows={rows}
      loading={loading}
      onSelectionChange={onSelectionChange}
      showCheckbox
      selectRowOnContextMenu={false}
      allowAddRowInContextMenu={false}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
      canExportExcel
      height="100%"
      minHeight={320}
    />
  );
}
