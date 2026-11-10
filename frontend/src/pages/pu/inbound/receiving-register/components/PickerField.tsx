import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';

// 칸 안 🔍 → 팝업에서 고른다(발주등록 창과 같은 모양). 칸에 직접 치지 않는다.
// 2026-11-05 입고 등록 · 반품 등록 창이 같이 쓴다
export function PickerField({ label, value, onOpen }: { label: string; value: MasterPickerOption | null; onOpen: () => void }) {
  return (
    <TextField
      size="small"
      margin="none"
      label={label}
      value={value ? `${value.code} · ${value.name}` : ''}
      slotProps={{
        htmlInput: { readOnly: true },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={`${label} 선택`}>
                <IconButton aria-label={`${label} 선택`} edge="end" size="small" sx={{ p: 0.75 }} onClick={onOpen}>
                  <SearchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
