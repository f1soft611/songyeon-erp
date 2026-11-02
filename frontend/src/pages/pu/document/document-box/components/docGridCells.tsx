import { Box, Chip } from '@mui/material';
import type { DocShare } from '../types/documentBox.types';

// 문서함 표들이 같이 쓰는 칸 모양
export const MONO = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 11.5 };
export const ROW_BTN = { minWidth: 0, px: 1, py: 0.1, fontSize: 12, whiteSpace: 'nowrap' } as const;
export const smallChip = (label: string) => <Chip size="small" label={label} sx={{ height: 18, fontSize: 10.5, ml: 0.75 }} />;

export const until = (s: DocShare) => s.expiresAt || <Box component="span" sx={{ color: 'text.disabled' }}>기한 없음</Box>;
export const noteCell = (s: DocShare) => s.note || <Box component="span" sx={{ color: 'text.disabled' }}>-</Box>;
