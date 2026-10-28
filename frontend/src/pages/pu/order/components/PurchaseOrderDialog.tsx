import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { todayDash } from '../../../../shared/utils/excelFile';
import { fetchMaterialOptions } from '../../../co/master/item-master/services/itemMaster.service';
import { fetchVendors } from '../../../co/master/material-master/services/materialMaster.service';
import { registerOrders } from '../services/purchaseOrder.service';
import { formatQty, stagingError, type MaterialOptionLite, type StagingItem } from '../utils/purchaseOrder';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type Message = { text: string; ok: boolean } | null;

// 발주 등록 창 (송연 #po-modal-overlay · 19-purchase.js po-open-btn~po-confirm-btn)
// 거래처를 입력한 상태에서 품목을 '+ 목록에 추가' 하면 그 순간의 거래처가 그 품목에 저장된다.
// 거래처를 바꿔 다른 품목을 계속 추가하면 여러 거래처를 한번에 등록할 수 있다.
// 확정하면 체크한 품목만 넣고, 넣은 품목은 목록에서 빠진다(창은 열린 채로 남는다).
export function PurchaseOrderDialog({ open, onClose, onRegistered }: {
  open: boolean;
  onClose: () => void;
  onRegistered: (orderDate: string) => void;
}) {
  const keyRef = useRef(0);
  const [vendors, setVendors] = useState<string[]>([]);
  const [materials, setMaterials] = useState<MaterialOptionLite[]>([]);
  const [clientName, setClientName] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [qty, setQty] = useState('');
  const [items, setItems] = useState<StagingItem[]>([]);
  const [orderDate, setOrderDate] = useState(() => todayDash());
  const [message, setMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItems([]);
    setClientName('');
    setMaterialName('');
    setQty('');
    setOrderDate(todayDash());
    setMessage(null);
    // 매입 거래처(분류에 '매입')와 원재료 이름. 칸에 직접 쳐도 되지만 목록에 있는 것만 추가된다(2026-10-26)
    fetchVendors().then((list) => setVendors(list.map((vendor) => vendor.name).filter(Boolean))).catch(() => undefined);
    fetchMaterialOptions().then((list) => setMaterials(list.map((m) => ({ code: m.code, name: m.name })))).catch(() => undefined);
  }, [open]);

  const materialNames = useMemo(() => materials.map((material) => material.name), [materials]);

  const addItem = () => {
    const error = stagingError(clientName, materialName, qty, materials, vendors);
    if (error) {
      setMessage({ text: error, ok: false });
      return;
    }
    const material = materials.find((m) => m.name === materialName.trim());
    if (!material) return;
    setMessage(null);
    keyRef.current += 1;
    setItems((current) => [...current, {
      key: keyRef.current, materialCode: material.code, materialName: material.name,
      qty: parseFloat(qty), clientName: clientName.trim(), checked: true,
    }]);
    setMaterialName('');
    setQty('');
  };

  const setChecked = (key: number, checked: boolean) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, checked } : item)));

  const confirm = async () => {
    const chosen = items.filter((item) => item.checked);
    if (!orderDate) {
      setMessage({ text: '발주일을 선택해주세요', ok: false });
      return;
    }
    if (chosen.length === 0) {
      setMessage({ text: '선택된 품목이 없어요', ok: false });
      return;
    }
    setSaving(true);
    try {
      const registered = await registerOrders(orderDate, chosen);
      setMessage({ text: `${registered}건 등록되었습니다`, ok: true });
      setItems((current) => current.filter((item) => !item.checked));
      onRegistered(orderDate);
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '등록 실패'), ok: false });
    } finally {
      setSaving(false);
    }
  };

  const allChecked = items.length > 0 && items.every((item) => item.checked);

  const columns = useMemo<F1GridColumn<StagingItem>[]>(() => [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'checked', headerName: '선택', width: 60, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (
        <Checkbox size="small" checked={row.checked} onChange={(event) => setChecked(row.key, event.target.checked)}
          slotProps={{ input: { 'aria-label': `${row.materialName} 선택` } }} />
      ),
    },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 140, headerAlign: 'center', align: 'left' },
    { field: 'materialName', headerName: '품목', flex: 1.4, width: 180, headerAlign: 'center', align: 'left' },
    { field: 'qty', headerName: '수량', width: 90, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.qty) },
    {
      field: 'materialCode', headerName: '', width: 56, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (
        <IconButton size="small" color="error" aria-label={`${row.materialName} 빼기`}
          onClick={() => setItems((current) => current.filter((item) => item.key !== row.key))}>
          <CloseIcon fontSize="small" />
        </IconButton>
      ),
    },
  ], []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} slotProps={{ paper: { sx: { width: 'min(680px, 96vw)' } } }} aria-labelledby="po-dialog-title">
      <DialogTitle id="po-dialog-title" sx={{ fontSize: 16, fontWeight: 700 }}>발주 등록</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Autocomplete
          freeSolo options={vendors} value={clientName} inputValue={clientName}
          onInputChange={(_event, value) => setClientName(value)}
          renderInput={(params) => <TextField {...params} size="small" margin="none" label="거래처" placeholder="매입 거래처명 입력" />}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
          거래처를 입력한 상태에서 품목을 "+ 목록에 추가"하면, 그 순간의 거래처가 그 품목에 저장돼요.
          거래처를 바꿔서 다른 품목을 계속 추가하면 여러 거래처를 한번에 등록할 수 있어요.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) auto', gap: 1, alignItems: 'center' }}>
          <Autocomplete
            freeSolo options={materialNames} value={materialName} inputValue={materialName}
            onInputChange={(_event, value) => setMaterialName(value)}
            renderInput={(params) => <TextField {...params} size="small" margin="none" label="품목" placeholder="원재료명 입력" />}
          />
          <TextField type="number" size="small" margin="none" label="수량" placeholder="예: 500" value={qty} onChange={(event) => setQty(event.target.value)} />
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addItem}>목록에 추가</Button>
        </Box>
        <FormControlLabel
          control={<Checkbox size="small" checked={allChecked} disabled={items.length === 0}
            onChange={(event) => setItems((current) => current.map((item) => ({ ...item, checked: event.target.checked })))} />}
          label={<Typography variant="body2">전체 선택</Typography>}
          sx={{ m: 0 }}
        />
        {items.length === 0 && <Typography variant="body2" color="text.secondary">추가된 품목이 없습니다</Typography>}
        <Box sx={{ height: 240 }}>
          <F1Grid
            rows={items}
            columns={columns}
            rowKey="key"
            storageKey="pu-po-staging-grid"
            ariaLabel="F1-GRID 발주 등록 품목"
            height="100%"
            maxHeight="100%"
            rowHeight={34}
            minRowHeight={34}
            maxRowHeight={320}
            columnLine
            showCheckbox={false}
            resizableRows={false}
            allowAddRowInContextMenu={false}
            allowDuplicateRowInContextMenu={false}
            allowDeleteRowInContextMenu={false}
          />
        </Box>
        <TextField
          type="date" size="small" margin="none" label="발주일" value={orderDate} onChange={(event) => setOrderDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ maxWidth: 220 }}
        />
        {message && <Alert severity={message.ok ? 'success' : 'error'}>{message.text}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled={saving} onClick={() => void confirm()}>선택 항목 확정</Button>
      </DialogActions>
    </Dialog>
  );
}
