import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { CommonViewMode } from './commonViewTypes';
import { ViewModeToggle } from './ViewModeToggle';

type PinnedViewToolbarProps = {
  pinnedCount: number;
  mode: CommonViewMode;
  onChange: (mode: CommonViewMode) => void;
  countLabel?: string;
  modeLabel?: string;
  filterAction?: ReactNode;
  enableFileView?: boolean;
};

export function PinnedViewToolbar({
  pinnedCount,
  mode,
  onChange,
  countLabel = '고정',
  modeLabel = '보기 방식',
  filterAction,
  enableFileView = false,
}: PinnedViewToolbarProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        mb: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flexWrap: 'wrap' }}>
        {mode !== 'file' && <Typography variant="subtitle2" color="text.secondary">
          {countLabel} {pinnedCount}건
        </Typography>}
        {filterAction}
      </Box>
      <ViewModeToggle mode={mode} onChange={onChange} ariaLabel={modeLabel} enableFileView={enableFileView} />
    </Box>
  );
}
