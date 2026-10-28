import { Box, Skeleton } from '@mui/material';

type PageLoadingSkeletonProps = {
  rows?: number;
};

type GridColumnLike = {
  field: string | number | symbol;
  headerName?: string;
  flex?: number;
  minWidth?: number;
};

type GridLoadingSkeletonProps = {
  columns: GridColumnLike[];
  rows?: number;
  showHeader?: boolean;
  gridTemplateColumns?: string;
  showCheckbox?: boolean;
  checkboxWidth?: number;
  rowHeight?: number;
  headerHeight?: number;
};

export function PageLoadingSkeleton({ rows = 6 }: PageLoadingSkeletonProps) {
  return (
    <Box
      data-testid="page-loading-skeleton"
      sx={{
        display: 'grid',
        gap: 1.5,
        p: 3,
        width: '100%',
      }}
    >
      <Skeleton variant="rectangular" height={52} sx={{ borderRadius: 2 }} />
      {Array.from({ length: rows - 1 }).map((_, index) => (
        <Skeleton
          key={`page-loading-skeleton-row-${index}`}
          variant="text"
          height={28}
          sx={{ borderRadius: 1 }}
        />
      ))}
    </Box>
  );
}

export function GridLoadingSkeleton({
  columns,
  rows = 6,
  showHeader = true,
  gridTemplateColumns,
  showCheckbox = true,
  checkboxWidth = 44,
  rowHeight = 32,
  headerHeight = 32,
}: GridLoadingSkeletonProps) {
  const resolvedGridTemplateColumns =
    gridTemplateColumns ??
    [
      ...(showCheckbox ? [`${checkboxWidth}px`] : []),
      ...Array.from({ length: columns.length }, () => 'minmax(0, 1fr)'),
    ].join(' ');

  const checkboxColumnPlaceholder = showCheckbox ? (
    <Box
      key="grid-loading-checkbox-placeholder"
      data-testid="grid-loading-checkbox-skeleton"
      sx={{
        gridColumn: 1,
        width: '100%',
        minWidth: `${checkboxWidth}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: rowHeight,
        height: rowHeight,
      }}
    >
      <Skeleton variant="circular" width={16} height={16} />
    </Box>
  ) : null;

  return (
    <Box
      data-testid="grid-loading-skeleton"
      sx={{
        display: 'grid',
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        height: 'auto',
        gap: 0,
      }}
    >
      {showHeader ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: resolvedGridTemplateColumns,
            width: '100%',
            minWidth: 0,
            gap: 0,
            alignItems: 'center',
            px: 0,
            py: 0,
            borderBottom: '1px solid rgba(148,163,184,0.25)',
            minHeight: headerHeight,
            height: headerHeight,
          }}
        >
          {checkboxColumnPlaceholder}
          {columns.map((column, index) => {
            const columnLabel = String(column.headerName ?? column.field ?? '');
            return (
              <Box
                key={`grid-loading-header-${String(column.field)}-${index}`}
                sx={{
                  gridColumn: showCheckbox ? index + 2 : index + 1,
                  minHeight: headerHeight,
                  height: headerHeight,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'text.secondary',
                }}
              >
                {columnLabel}
              </Box>
            );
          })}
        </Box>
      ) : null}
      {Array.from({ length: rows }).map((_, index) => (
        <Box
          key={`grid-loading-row-${index}`}
          data-testid="grid-loading-row-skeleton"
          sx={{
            display: 'grid',
            gridTemplateColumns: resolvedGridTemplateColumns,
            width: '100%',
            minWidth: 0,
            gap: 0,
            alignItems: 'center',
            minHeight: rowHeight,
            height: rowHeight,
          }}
        >
          {checkboxColumnPlaceholder}
          {columns.map((column, columnIndex) => (
            <Skeleton
              key={`grid-loading-cell-${String(column.field)}-${index}-${columnIndex}`}
              variant="rectangular"
              height={Math.max(16, rowHeight - 10)}
              sx={{
                gridColumn: showCheckbox ? columnIndex + 2 : columnIndex + 1,
                width: '100%',
                borderRadius: 1,
                boxSizing: 'border-box',
                alignSelf: 'center',
              }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}
