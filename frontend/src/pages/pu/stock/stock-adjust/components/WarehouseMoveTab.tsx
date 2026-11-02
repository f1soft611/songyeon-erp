import { useMemo } from 'react';
import { Alert, Box, Button, Card, MenuItem, TextField, Typography } from '@mui/material';
import { ConfirmDialog } from '../../../../../shared/components/ConfirmDialog';
import { useWarehouseMove } from '../hooks/useWarehouseMove';
import { whmNum } from '../utils/stockAdjust';
import { WarehouseMoveGrid, createWarehouseMoveColumns } from './WarehouseMoveGrid';

const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', p: 1.5 };

// 창고이동 탭 (송연 #stock-tab-whmove · 30-warehouse-move.js)
// 완포장을 계량실로 가져갈 때 바코드를 찍는다. 한 번 찍으면 한 봉이고, 바코드가 입고 한 건(로트)마다 붙어 있어 어느 입고분을 뜯었는지 남는다.
// 옮겨도 총재고는 안 바뀌고 자리만 바뀐다. 바코드 리더는 다 읽고 엔터를 눌러주므로 엔터로 조회하고, 봉수 칸에서 엔터로 옮긴다.
export function WarehouseMoveTab() {
  const management = useWarehouseMove();
  const { setCancelling, found, cancelling } = management;
  const columns = useMemo(() => createWarehouseMoveColumns({ onCancel: setCancelling }), [setCancelling]);
  const unit = found?.unit || 'kg';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Card sx={cardSx}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          완포장을 계량실로 가져갈 때 바코드를 찍어주세요. <b>한 번 찍으면 한 봉</b>이에요. 옮겨도 총재고는 안 바뀌고, 자재창고에서 계량창고로 자리만 바뀝니다.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            inputRef={management.barcodeRef}
            size="small"
            margin="none"
            placeholder="바코드를 찍으세요 (예: 000311_26090301)"
            value={management.barcode}
            onChange={(event) => management.setBarcode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void management.lookup();
              }
            }}
            slotProps={{ htmlInput: { 'aria-label': '바코드', autoComplete: 'off' } }}
            sx={{ width: 320 }}
          />
          <TextField
            inputRef={management.packsRef}
            size="small"
            margin="none"
            type="number"
            value={management.packs}
            title="옮길 봉수"
            onChange={(event) => management.setPacks(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void management.move();
              }
            }}
            slotProps={{ htmlInput: { 'aria-label': '봉수', min: 1, step: 1 } }}
            sx={{ width: 90 }}
          />
          <Typography variant="body2">봉</Typography>
          {/* 송연은 입고창고가 아닌 창고가 하나뿐일 때만 자동으로 보낸다. 창고가 여럿이면 여기서 고른다 */}
          <TextField
            select
            size="small"
            margin="none"
            value={management.to}
            onChange={(event) => management.setTo(event.target.value)}
            slotProps={{ select: { displayEmpty: true }, htmlInput: { 'aria-label': '어디로' } }}
            sx={{ width: 150 }}
          >
            <MenuItem value="">어디로 (고르기)</MenuItem>
            {management.targets.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={() => void management.move()}>옮기기</Button>
        </Box>
        {found && (
          <Box aria-label="찍은 품목" sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(37, 99, 235, 0.08)', fontSize: 13, lineHeight: 1.7 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 0.5 }}>{found.materialName}</Typography>
            <div>
              한 봉 <b>{whmNum(found.unitWeight)}{unit}</b>
              {found.boxQty && found.boxQty > 1 ? ` · 한 박스 ${found.boxQty}봉` : ''}
              {found.lotDate ? <Box component="span" sx={{ color: 'text.secondary' }}> · {found.lotDate} 입고분</Box> : null}
            </div>
            <div>
              지금 자재창고 <b>{whmNum(found.inMaterialWarehouse)}{unit}</b>
              <Box component="span" sx={{ color: 'text.secondary' }}> / 계량창고 {whmNum(found.inWeighingWarehouse)}{unit}</Box>
            </div>
            {!found.barcode && <Box sx={{ mt: 0.5, color: 'warning.main' }}>바코드가 아니라 품목으로 찾았어요. 어느 입고분인지는 안 남습니다.</Box>}
          </Box>
        )}
        {management.message && <Alert severity={management.message.ok ? 'success' : 'error'} sx={{ mt: 1 }}>{management.message.text}</Alert>}
      </Card>

      <Card sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mr: 'auto' }}>오늘 옮긴 것</Typography>
          <TextField
            type="date"
            size="small"
            margin="none"
            value={management.date}
            onChange={(event) => management.changeDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '옮긴 날' } }}
            sx={{ width: 170 }}
          />
        </Box>
        {management.moves && management.moves.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 날 옮긴 것이 없습니다</Typography>}
        <WarehouseMoveGrid rows={management.moves ?? []} columns={columns} />
      </Card>

      <ConfirmDialog
        open={cancelling != null}
        title="창고이동 취소"
        message={cancelling ? `${cancelling.materialName || ''} 이동기록을 취소할까요?` : ''}
        confirmLabel="취소하기"
        danger
        onCancel={() => setCancelling(null)}
        onConfirm={() => void management.cancel()}
      />
      <ConfirmDialog
        open={management.alertText != null}
        title="창고이동"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
    </Box>
  );
}
