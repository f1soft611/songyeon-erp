import { Box, Typography } from '@mui/material';
import type { LabelBomRow } from './label.types';

// 라벨 창 맨 왼쪽의 배합표(보기 전용). 라벨의 '원재료명 및 함량' 을 이걸 보고 적는다.
// 제품BOM 에서 온 것이든, 확정 전이라 레시피에서 온 것이든 모양은 같다({원재료명, 함량 0.05 같은 소수}).
// 한 칸의 폭과 한 칸에 넣을 줄 수 — 26줄이 넘으면 칸을 나눠 옆으로 붙여 스크롤 없이 한눈에 보이게 한다.
const BOM_COL_WIDTH = 270;
const BOM_ROWS_PER_COL = 26;

export type LabelBomState = { kind: 'loading' } | { kind: 'error' } | { kind: 'rows'; rows: LabelBomRow[] };

const metaSx = { color: 'text.secondary', fontSize: 12.5 };
const softBox = { border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' };

export function LabelBomPanel({ bom, title }: { bom: LabelBomState; title: string }) {
  const bomRows = bom.kind === 'rows' ? bom.rows : [];
  const bomColumns = bomRows.length ? Math.ceil(bomRows.length / BOM_ROWS_PER_COL) : 1;
  const bomPerCol = bomRows.length ? Math.ceil(bomRows.length / bomColumns) : 0;
  const bomSum = bomRows.reduce((sum, row) => sum + (row.ratioPercent || 0), 0);
  return (
    <Box sx={{ flex: '0 0 auto', maxWidth: '100%', width: bomRows.length ? bomColumns * BOM_COL_WIDTH + (bomColumns - 1) * 10 + 14 : BOM_COL_WIDTH }}>
      <Typography sx={{ ...metaSx, mb: 1 }}>{title}</Typography>
      <Box aria-label="제품BOM 원재료" sx={{ ...softBox, maxHeight: '64vh', overflow: 'auto', p: 0.75 }}>
        {bom.kind === 'loading' && <Typography sx={{ ...metaSx, p: 1.5, textAlign: 'center' }}>불러오는 중...</Typography>}
        {bom.kind === 'error' && <Typography sx={{ ...metaSx, p: 1.5, textAlign: 'center' }}>배합표를 불러오지 못했어요</Typography>}
        {bom.kind === 'rows' && bomRows.length === 0 && <Typography sx={{ ...metaSx, p: 1.5, textAlign: 'center' }}>등록된 원재료가 없어요</Typography>}
        {bomRows.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
            {Array.from({ length: bomColumns }, (_, c) => (
              <Box
                key={c}
                sx={{
                  display: 'grid', flex: 1, minWidth: 0, gridTemplateColumns: '1fr 62px', fontSize: 12,
                  borderTop: '1px solid', borderLeft: '1px solid', borderColor: 'divider',
                  '& > div': { minWidth: 0, px: 0.75, py: 0.5, borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', lineHeight: 1.45, wordBreak: 'break-all' },
                  '& > div.h': { position: 'sticky', top: 0, zIndex: 1, bgcolor: 'action.selected', fontWeight: 700, textAlign: 'center' },
                  '& > div.num': { textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
                }}
              >
                <div className="h">원재료명</div>
                <div className="h">함량</div>
                {bomRows.slice(c * bomPerCol, (c + 1) * bomPerCol).flatMap((row, i) => [
                  <div key={`n${i}`}>{row.materialName}</div>,
                  <div key={`r${i}`} className="num">{row.ratioPercent != null ? `${(row.ratioPercent * 100).toFixed(2)}%` : '-'}</div>,
                ])}
              </Box>
            ))}
          </Box>
        )}
      </Box>
      <Typography sx={{ ...metaSx, mt: 0.75, textAlign: 'right' }}>
        {bomRows.length ? `${bomRows.length}가지 · 합계 ${(bomSum * 100).toFixed(2)}%` : ''}
      </Typography>
    </Box>
  );
}
