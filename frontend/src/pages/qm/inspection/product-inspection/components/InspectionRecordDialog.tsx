import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { shipText } from '../utils/productInspection';

export type InspectionRecordTarget = {
  lotNo: string;
  productName: string;
  netWeight?: string;
  madeOn?: string;
  qty?: string;
  shippedOn?: string;
  shipState?: string;
  shelfLife?: string;
};

type InspectionRecordDialogProps = {
  target: InspectionRecordTarget | null;
  onClose: () => void;
};

const headSx = { fontSize: 12, fontWeight: 700, color: 'text.secondary', py: 0.75 };

// 제품 검사 창(송연 #qs-modal · qsRender). 2026-11-06 모양만: 검사항목 · 측정값 · 저장 · 결재는 서버 연결 때 붙인다
export function InspectionRecordDialog({ target, onClose }: InspectionRecordDialogProps) {
  const auto: [string, string | undefined][] = target
    ? [
        ['제품명', target.productName],
        ['내용량', target.netWeight],
        ['제조일자', target.madeOn],
        ['생산량', target.qty],
        ['출고일', shipText(target.shippedOn, target.shipState)],
        ['소비기한', target.shelfLife],
      ]
    : [];

  return (
    <Dialog open={target != null} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="qi-record-title">
      <DialogTitle id="qi-record-title" sx={{ fontSize: 15, fontWeight: 700, pb: 0.5 }}>제품 검사</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{target ? `로트 ${target.lotNo} · ${target.productName}` : ''}</Typography>
        {/* 저절로 채워진 것. 고칠 수 없다 */}
        <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
            {auto.map(([label, value]) => (
              <Box key={label} sx={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
                <Typography component="span" sx={{ fontSize: 11.5, color: 'text.secondary' }}>{label}</Typography>
                <span>{value || ''}</span>
              </Box>
            ))}
          </Box>
          <Typography sx={{ mt: 1, fontSize: 11.5, color: 'text.secondary' }}>제품등록·생산확정·출하에서 저절로 온 것입니다</Typography>
        </Box>
        <Table size="small" aria-label="검사항목">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headSx, width: '24%' }}>검사항목</TableCell>
              <TableCell sx={{ ...headSx, width: '34%' }}>규격</TableCell>
              <TableCell sx={{ ...headSx, width: '22%' }}>측정값</TableCell>
              <TableCell sx={{ ...headSx, width: '20%' }}>판정</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ fontSize: 13, color: 'text.secondary', py: 2 }}>검사항목이 없습니다</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>아직 결재에 올리지 않았습니다</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="outlined" disabled>임시저장</Button>
        <Button variant="contained" disabled>결재 올리기</Button>
      </DialogActions>
    </Dialog>
  );
}
