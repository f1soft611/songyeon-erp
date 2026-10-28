import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import ViewStreamOutlinedIcon from '@mui/icons-material/ViewStreamOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import type { CommonViewMode } from './commonViewTypes';

type ViewModeToggleProps = {
  mode: CommonViewMode;
  onChange: (mode: CommonViewMode) => void;
  ariaLabel?: string;
  enableFileView?: boolean;
};

export function ViewModeToggle({
  mode,
  onChange,
  ariaLabel = '보기 방식',
  enableFileView = false,
}: ViewModeToggleProps) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={mode}
      aria-label={ariaLabel}
      onChange={(_, nextMode: CommonViewMode | null) => {
        if (nextMode) {
          onChange(nextMode);
        }
      }}
    >
      <ToggleButton value="feed" aria-label="피드형 보기">
        <ViewStreamOutlinedIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton value="list" aria-label="리스트형 보기">
        <ViewListOutlinedIcon fontSize="small" />
      </ToggleButton>
      {enableFileView && (
        <ToggleButton value="file" aria-label="파일형 보기">
          <FolderOutlinedIcon fontSize="small" />
        </ToggleButton>
      )}
    </ToggleButtonGroup>
  );
}
