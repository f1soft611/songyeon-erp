import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography,
} from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { cellInputProps } from '../../../../shared/utils/gridCellInput';
import { formatQty, groupByVendor, splitBySupplier, type DraftItem } from '../utils/stockLedger';

type PickRow = DraftItem & { key: string; options: string[] };
type SummaryRow = DraftItem & { key: string; vendorLabel: string };

// 수불대장 발주 등록 창 (송연 #ledger-vendor-overlay · startLedgerOrder~submitLedgerOrders)
// 두 걸음이다. 1단계 — 업체가 여러 곳이거나 아직 없는 품목만 골라준다. 2단계 — 업체별로 묶어 보여주고 한 번 더 확인받는다.
// 발주는 한 번 등록하면 수불대장에서 못 고치고 발주등록에서 지워야 해서, 어느 업체로 몇 건이 나가는지 보고 넘긴다.
export function LedgerVendorDialog({ items, vendors, onClose, onSubmit }: {
  items: DraftItem[] | null;
  vendors: string[];
  onClose: () => void;
  onSubmit: (items: DraftItem[]) => void;
}) {
  const split = useMemo(() => splitBySupplier(items ?? []), [items]);
  const [step, setStep] = useState<'pick' | 'summary'>('pick');
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [ready, setReady] = useState<DraftItem[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!items) return;
    setPicks({});
    setMessage('');
    // 물어볼 것이 없으면 바로 확인 단계로
    if (split.needAsk.length === 0) {
      setReady(split.decided);
      setStep('summary');
    } else {
      setStep('pick');
    }
  }, [items, split]);

  const pickRows = useMemo<PickRow[]>(() => split.needAsk.map((it) => ({
    ...it, key: `${it.materialCode}|${it.orderDate}`,
    // 등록된 납품업체가 있으면 그것만, 없으면 거래처BOM 의 매입처 전체에서 고르게 한다
    options: it.suppliers.length ? it.suppliers : vendors,
  })), [split, vendors]);

  const next = () => {
    const missing = pickRows.filter((row) => !picks[row.key]);
    if (missing.length) {
      setMessage(`${missing.length}건의 업체를 아직 안 골랐어요`);
      return;
    }
    setMessage('');
    setReady(split.decided.concat(pickRows.map((row) => ({ ...row, clientName: picks[row.key] }))));
    setStep('summary');
  };

  const back = () => {
    // 물어볼 것이 애초에 없었으면 되돌아갈 곳도 없다 — 창을 닫는다
    if (split.needAsk.length === 0) onClose();
    else setStep('pick');
  };

  const groups = useMemo(() => groupByVendor(ready), [ready]);
  const summaryRows = useMemo<SummaryRow[]>(() => groups.flatMap((group) => group.dates.flatMap((day) => day.items.map((it) => ({
    ...it,
    key: `${group.name}|${it.materialCode}|${it.orderDate}`,
    vendorLabel: `${group.name}  (${group.dates.length > 1 ? `${group.dates.length}일 · ` : ''}${group.count}건)`,
  })))), [groups]);

  const pickColumns = useMemo<F1GridColumn<PickRow>[]>(() => [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'materialName', headerName: '원재료', flex: 1, width: 200, headerAlign: 'center', align: 'left' },
    { field: 'orderDate', headerName: '발주일', width: 110, headerAlign: 'center', align: 'center' },
    { field: 'qty', headerName: '발주량', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.qty) },
    {
      field: 'options', headerName: '업체', flex: 1, width: 220, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <TextField {...cellInputProps} select size="small" margin="none" fullWidth value={picks[row.key] ?? ''}
          onChange={(event) => setPicks((current) => ({ ...current, [row.key]: event.target.value }))}
          slotProps={{ select: { displayEmpty: true }, htmlInput: { 'aria-label': `${row.materialName} ${row.orderDate} 업체` } }}
          sx={{ '& .MuiInputBase-input': { py: 0.5, fontSize: 13 } }}>
          <MenuItem value="">— 고르세요 —</MenuItem>
          {row.options.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
        </TextField>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [picks]);

  const summaryColumns = useMemo<F1GridColumn<SummaryRow>[]>(() => [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'vendorLabel', headerName: '업체', width: 220, headerAlign: 'center', align: 'left', mergeRows: true, getCellStyle: () => ({ fontWeight: 700 }) },
    { field: 'orderDate', headerName: '발주일', width: 120, headerAlign: 'center', align: 'center', mergeRows: true },
    { field: 'materialName', headerName: '원재료', flex: 1, width: 200, headerAlign: 'center', align: 'left' },
    { field: 'qty', headerName: '발주량', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.qty), getCellStyle: () => ({ fontWeight: 700 }) },
  ], []);

  const gridProps = {
    height: '100%', maxHeight: '100%', columnLine: true, showCheckbox: false, resizableRows: false,
    allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false, maxRowHeight: 320,
  } as const;

  return (
    <Dialog open={items != null} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="ledger-vendor-title">
      <DialogTitle id="ledger-vendor-title" sx={{ fontSize: 16, fontWeight: 700 }}>{step === 'pick' ? '발주할 업체 선택' : '업체별 발주 내용 확인'}</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {step === 'pick' ? (
          <>
            {/* 두 단계의 표가 같은 자리에서 바뀌므로 key 로 새로 그린다(안 그러면 앞 표의 칸 순서가 남는다) */}
            <Typography variant="body2" color="text.secondary">납품업체가 여러 곳이거나 아직 정해지지 않은 원재료입니다. 어느 업체에 발주할지 골라주세요.</Typography>
            <Box sx={{ height: 300 }}>
              <F1Grid key="pick" rows={pickRows} columns={pickColumns} rowKey="key" storageKey="pu-ledger-vendor-pick-grid" ariaLabel="F1-GRID 업체 고르기"
                rowHeight={40} minRowHeight={40} {...gridProps} />
            </Box>
            {message && <Alert severity="error">{message}</Alert>}
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              업체별로 이렇게 나갑니다. 맞으면 발주 등록을 눌러주세요. 등록한 뒤에는 수불대장에서 못 고치고, 발주등록 화면에서 지워야 해요.
            </Typography>
            <Box sx={{ height: 320 }}>
              <F1Grid key="summary" rows={summaryRows} columns={summaryColumns} rowKey="key" storageKey="pu-ledger-vendor-summary-grid" ariaLabel="F1-GRID 업체별 발주"
                rowHeight={34} minRowHeight={34} {...gridProps} />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        {step === 'pick'
          ? <Button variant="contained" onClick={next}>다음 — 업체별로 확인</Button>
          : (
            <>
              <Button variant="outlined" onClick={back}>← 업체 다시 고르기</Button>
              <Button variant="contained" onClick={() => onSubmit(ready)}>발주 등록</Button>
            </>
          )}
      </DialogActions>
    </Dialog>
  );
}
