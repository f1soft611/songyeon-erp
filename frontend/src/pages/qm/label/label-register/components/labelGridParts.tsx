import type { KeyboardEvent } from 'react';
import { Chip } from '@mui/material';
import type { LabelState } from '../utils/labelRegister';

// 라벨관리 화면 3개(라벨등록 · 표시사항 요청 · 라벨양식)가 같이 쓰는 표 조각. 2026-11-05 라벨등록 탭을 화면으로 나누며 뺐다

const STATE_COLOR: Record<LabelState, 'success' | 'warning' | 'default'> = { done: 'success', partial: 'warning', none: 'default' };
export const stateChip = (state: LabelState, text: string) => (
  <Chip size="small" color={STATE_COLOR[state]} variant={state === 'none' ? 'outlined' : 'filled'} label={text} sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
);
export const smallBtn = { minWidth: 0, px: 1, py: 0, fontSize: 12, whiteSpace: 'nowrap' } as const;

// 세 표 모두 줄 추가 · 삭제 기능이 없다(오른쪽 클릭 [행 추가] · [행 삭제] 없음)
export const LABEL_GRID_PROPS = {
  height: '100%', maxHeight: '100%', rowHeight: 38, minRowHeight: 38, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;

// F1-Grid 는 고른 줄을 Delete 키로 표에서 뺀다. 지우는 기능이 없는 표라 표를 감싼 곳에서 막는다
export const blockDeleteKey = (event: KeyboardEvent<HTMLElement>) => {
  if (event.key === 'Delete') {
    event.preventDefault();
    event.stopPropagation();
  }
};

export const LABEL_CARD_SX = {
  borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5,
} as const;

export const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  width: '100%',
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

export const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
