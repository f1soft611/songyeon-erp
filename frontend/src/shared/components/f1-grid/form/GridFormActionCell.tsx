import EditIcon from '@mui/icons-material/Edit';
import { Box, IconButton, Tooltip } from '@mui/material';
import type { MouseEvent } from 'react';
import type { F1GridRowId } from '../types/grid.types';

export type GridFormActionCellProps = {
  rowId: F1GridRowId;
  rowIndex: number;
  stripeRowIndex?: number;
  columnIndex: number;
  isLastRow: boolean;
  stripeRows?: boolean;
  pinnedShadow?: boolean;
  onEdit: () => void;
};

export function GridFormActionCell({
  rowId,
  rowIndex,
  stripeRowIndex = rowIndex,
  columnIndex,
  isLastRow,
  stripeRows = true,
  pinnedShadow = true,
  onEdit,
}: GridFormActionCellProps) {
  const stopPropagation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };
  const isStripedRow = stripeRows && stripeRowIndex % 2 === 1;

  return (
    <Box
      role="gridcell"
      onClick={stopPropagation}
      onContextMenu={stopPropagation}
      onDoubleClick={stopPropagation}
      onMouseDown={stopPropagation}
      sx={{
        alignItems: 'center',
        alignSelf: 'stretch',
        backgroundColor: 'background.paper',
        backgroundImage: isStripedRow
          ? 'linear-gradient(90deg, rgba(148, 163, 184, 0.04), rgba(148, 163, 184, 0.04))'
          : undefined,
        backgroundRepeat: isStripedRow ? 'no-repeat' : undefined,
        backgroundSize: isStripedRow ? '100% 100%' : undefined,
        borderBottom: isLastRow ? 1 : 0,
        borderBottomColor: 'divider',
        borderColor: 'divider',
        borderLeft: 1,
        borderLeftColor: 'divider',
        borderTop: 1,
        borderTopColor: 'divider',
        boxShadow: pinnedShadow
          ? '-2px 0 4px -2px rgba(0, 0, 0, 0.32)'
          : undefined,
        boxSizing: 'border-box',
        display: 'flex',
        gridColumn: columnIndex,
        gridRow: rowIndex + 1,
        height: '100%',
        justifyContent: 'center',
        minHeight: 0,
        isolation: 'isolate',
        position: 'sticky',
        right: 0,
        width: 48,
        minWidth: 48,
        maxWidth: 48,
        zIndex: 4,
      }}
    >
      <Tooltip title="정보 수정">
        <IconButton
          aria-label={`${rowId} 행 정보 수정`}
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
