import { useMemo } from 'react';
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, InputAdornment, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { MasterPickerDialog } from '../../../../../shared/components/master-picker/MasterPickerDialog';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import { useOrderRegisterDialog } from '../hooks/useOrderRegisterDialog';
import { OrderStagingGrid, createOrderStagingColumns } from './OrderStagingGrid';

type OrderRegisterDialogProps = {
  open: boolean;
  onClose: () => void;
  onRegistered: (orderDate: string) => void;
};

// 칸 안 🔍 → 팝업에서 고른다(제품 창의 거래처 칸과 같은 모양). 칸에 직접 치지 않는다
function PickerField({ label, value, onOpen }: { label: string; value: MasterPickerOption | null; onOpen: () => void }) {
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

// 발주 등록 창 (송연 #po-modal-overlay)
// 거래처를 고른 상태에서 품목을 '+ 목록에 추가' 하면 그 순간의 거래처가 그 품목에 저장된다.
// 거래처를 바꿔 다른 품목을 계속 추가하면 여러 거래처를 한번에 등록할 수 있다.
// 확정하면 체크한 품목만 넣고, 넣은 품목은 목록에서 빠진다(창은 열린 채로 남는다).
export function OrderRegisterDialog({ open, onClose, onRegistered }: OrderRegisterDialogProps) {
  const dialog = useOrderRegisterDialog(open, onRegistered);
  const { checkItem, removeItem, items, message } = dialog;
  const columns = useMemo(() => createOrderStagingColumns({ onCheck: checkItem, onRemove: removeItem }), [checkItem, removeItem]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} slotProps={{ paper: { sx: { width: 'min(680px, 96vw)' } } }} aria-labelledby="po-dialog-title">
      <DialogTitle id="po-dialog-title" sx={{ fontSize: 16, fontWeight: 700 }}>발주 등록</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <PickerField label="거래처" value={dialog.client} onOpen={() => dialog.setClientPickerOpen(true)} />
        <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
          거래처를 고른 상태에서 품목을 "+ 목록에 추가"하면, 그 순간의 거래처가 그 품목에 저장돼요.
          거래처를 바꿔서 다른 품목을 계속 추가하면 여러 거래처를 한번에 등록할 수 있어요.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) auto', gap: 1, alignItems: 'center' }}>
          <PickerField label="품목" value={dialog.material} onOpen={() => dialog.setMaterialPickerOpen(true)} />
          <TextField
            type="number"
            size="small"
            margin="none"
            label="수량"
            placeholder="예: 500"
            value={dialog.qty}
            onChange={(event) => dialog.setQty(event.target.value)}
          />
          <Button variant="outlined" startIcon={<AddIcon />} onClick={dialog.addItem}>목록에 추가</Button>
        </Box>
        <FormControlLabel
          control={<Checkbox size="small" checked={dialog.allChecked} disabled={items.length === 0} onChange={(event) => dialog.checkAll(event.target.checked)} />}
          label={<Typography variant="body2">전체 선택</Typography>}
          sx={{ m: 0 }}
        />
        {items.length === 0 && <Typography variant="body2" color="text.secondary">추가된 품목이 없습니다</Typography>}
        <OrderStagingGrid rows={items} columns={columns} gridRef={dialog.gridRef} onDeleteBlocked={dialog.blockDelete} />
        <TextField
          type="date"
          size="small"
          margin="none"
          label="발주일"
          value={dialog.orderDate}
          onChange={(event) => dialog.setOrderDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: 220 }}
        />
        {message && <Alert severity={message.ok ? 'success' : 'error'}>{message.text}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled={dialog.saving} onClick={() => void dialog.confirm()}>선택 항목 확정</Button>
      </DialogActions>
      <MasterPickerDialog
        label="거래처"
        open={dialog.clientPickerOpen}
        search={dialog.searchClients}
        onClose={() => dialog.setClientPickerOpen(false)}
        onChange={dialog.setClient}
      />
      <MasterPickerDialog
        label="원재료"
        open={dialog.materialPickerOpen}
        search={dialog.searchMaterials}
        onClose={() => dialog.setMaterialPickerOpen(false)}
        onChange={dialog.setMaterial}
      />
    </Dialog>
  );
}
