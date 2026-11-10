import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

export type ProductSpecTarget = {
  code: string;
  name: string;
  foodTypeName: string;
};

type ProductSpecDialogProps = {
  target: ProductSpecTarget | null;
  onClose: () => void;
};

const headSx = { fontSize: 12, fontWeight: 700, color: 'text.secondary', py: 0.75 };

// 제품별 기준 창(송연 #ps-modal · psRender). 2026-11-06 모양만: 항목 · 저장 · 다른 제품에서 가져오기는 서버 연결 때 붙인다
export function ProductSpecDialog({ target, onClose }: ProductSpecDialogProps) {
  return (
    <Dialog open={target != null} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="qi-spec-title">
      <DialogTitle id="qi-spec-title" sx={{ fontSize: 15, fontWeight: 700, pb: 0.5 }}>제품별 기준</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          {target ? `${target.name} · ${target.code} · 식품유형 ${target.foodTypeName}` : ''}
        </Typography>
        <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: 'action.hover', fontSize: 12, color: 'text.secondary' }}>
          <b>최소</b>와 <b>최대</b>를 넣으면 그 사이가 적합입니다. 한쪽만 넣어도 됩니다. 성적서에 찍히는 규격 문구도 이 값으로 만듭니다.
          둘 다 비우면 식품유형의 기본값을 씁니다.
        </Box>
        <Table size="small" aria-label="제품별 기준 항목">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headSx, width: 150 }}>항목</TableCell>
              <TableCell sx={{ ...headSx, width: 100 }} align="center">최소</TableCell>
              <TableCell sx={{ ...headSx, width: 100 }} align="center">최대</TableCell>
              <TableCell sx={{ ...headSx, width: 150 }}>식품유형 기본값</TableCell>
              <TableCell sx={headSx}>지금 어떻게 판정하나</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ fontSize: 13, color: 'text.secondary', py: 2 }}>검사항목이 없습니다</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.6 }}>
          한쪽만 넣어도 됩니다 — 최대만 넣으면 &apos;그 값 이하&apos;, 최소만 넣으면 &apos;그 값 이상&apos; 입니다.
          <br />
          성상·이물질·표기사항은 제품마다 다르지 않아 여기 없습니다. 검사할 때 적합/부적합으로 고릅니다.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" disabled sx={{ mr: 'auto' }}>다른 제품에서 가져오기</Button>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled>저장</Button>
      </DialogActions>
    </Dialog>
  );
}
