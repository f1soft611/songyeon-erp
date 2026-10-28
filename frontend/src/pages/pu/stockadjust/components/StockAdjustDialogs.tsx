import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography,
} from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { readExcelValues } from '../../../../shared/utils/excelFile';
import { fetchLots, fetchStock } from '../../../lg/stock/services/productStock.service';
import { lotText, type LotRecord, type StockRow } from '../../../lg/stock/utils/productStock';
import { editSchedule, fetchMaterials, moveMaterial, uploadStock, type Target } from '../services/stockAdjust.service';
import { formatMoney, formatQty, materialUploadMessage, toUploadRows, type MaterialStock, type StockSchedule } from '../utils/stockAdjust';
import { ExcelDropZone } from './ExcelDropZone';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type Message = { text: string; ok: boolean | null } | null;
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: 34, minRowHeight: 34, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;
const severity = (message: Message) => (message?.ok == null ? 'info' : message.ok ? 'success' : 'error');

// 재고조사 엑셀 올리기 창(송연 #stock-upload-overlay). 창고를 엑셀 칸이 아니라 여기서 한 번 고른다 —
// 파일 하나가 통째로 한 창고 것이라 줄마다 적게 하면 한 줄만 빠뜨려도 그 원재료만 엉뚱한 창고로 간다.
// 창은 닫지 않는다(계량창고를 올리고 이어서 자재창고를 올리는 일이 흔하다).
export function MaterialUploadDialog({ open, warehouses, onClose, onUploaded }: {
  open: boolean;
  warehouses: string[];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [warehouse, setWarehouse] = useState('');
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    // 방금 고른 창고가 아직 있으면 그대로 둔다(이어서 올리는 중일 수 있다)
    setWarehouse((current) => (current && warehouses.includes(current) ? current : warehouses[0] ?? ''));
  }, [open, warehouses]);

  const upload = async (file: File) => {
    setBusy(true);
    setMessage({ text: '올리는 중...', ok: null });
    try {
      let rows: string[][];
      try {
        rows = toUploadRows(await readExcelValues(file));
      } catch {
        throw new Error('엑셀 파일을 읽을 수 없습니다');
      }
      const result = await uploadStock('materials', rows, warehouse);
      setMessage({ text: materialUploadMessage(warehouse, result), ok: true });
      onUploaded();
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '업로드에 실패했어요'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="stock-upload-title">
      <DialogTitle id="stock-upload-title" sx={{ fontSize: 16, fontWeight: 700 }}>재고조사 엑셀 올리기</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          원재료마스터 화면에서 엑셀을 내려받아 <b>재고수량</b> 칸에 세어본 수량을 적어 올려주세요.<br />
          올린다고 바로 반영되지는 않아요. 아래 목록에 쌓였다가 <b>확정</b>을 눌러야 재고가 바뀝니다.
        </Typography>
        <TextField select size="small" margin="none" label="어느 창고를 세셨나요? *" value={warehouse} onChange={(event) => setWarehouse(event.target.value)}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
          {warehouses.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
          <MenuItem value="">창고 구분 없이</MenuItem>
        </TextField>
        <ExcelDropZone label="재고조사 엑셀" disabled={busy} onFile={(file) => void upload(file)} />
        {message && <Alert severity={severity(message)}>{message.text}</Alert>}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>닫기</Button></DialogActions>
    </Dialog>
  );
}

// 대기 재고조정 수량 고치기(송연 #schedule-edit-overlay). 엑셀에서 가져온 값은 그대로 두고, 고친 값을 따로 적는다.
export function ScheduleEditDialog({ target, row, onClose, onSaved }: {
  target: Target;
  row: StockSchedule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState('');
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    if (!row) return;
    setValue(String(row.editedQty != null ? row.editedQty : row.newStockQty ?? ''));
    setMessage(null);
  }, [row]);

  const save = async () => {
    if (!row) return;
    try {
      await editSchedule(target, row.id, value);
      setMessage({ text: '저장되었습니다', ok: true });
      onSaved();
      setTimeout(onClose, 500);
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '저장 실패'), ok: false });
    }
  };

  return (
    <Dialog open={row != null} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="schedule-edit-title">
      <DialogTitle id="schedule-edit-title" sx={{ fontSize: 16, fontWeight: 700 }}>{row ? `${row.name || ''} (${row.code})` : ''}</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <TextField size="small" margin="none" label="엑셀에서 가져온 데이터" value={formatQty(row?.newStockQty)} slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }} />
        <TextField size="small" margin="none" type="number" label="입력데이터 — 잘못된 값이면 여기서 고쳐주세요" value={value}
          onChange={(event) => setValue(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        {message && <Alert severity={severity(message)}>{message.text}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" onClick={() => void save()}>저장</Button>
      </DialogActions>
    </Dialog>
  );
}

// 원재료 재고수정(송연 #movement-overlay). 입고·출고로 더하고 빼거나, 적용재고로 그 값에 바로 맞춘다.
function MovementDialog({ material, onClose, onSaved }: { material: MaterialStock | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ inQty: '', outQty: '', setQty: '', note: '' });
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    if (!material) return;
    setForm({ inQty: '', outQty: '', setQty: '', note: '' });
    setMessage(null);
  }, [material]);

  const save = async () => {
    if (!material) return;
    try {
      await moveMaterial(material.code, { inQty: form.inQty || '0', outQty: form.outQty || '0', setQty: form.setQty, note: form.note.trim() });
      setMessage({ text: '저장되었습니다', ok: true });
      onSaved();
      setTimeout(onClose, 500);
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '저장 실패'), ok: false });
    }
  };

  const field = (key: keyof typeof form, label: string, placeholder: string, type = 'number') => (
    <TextField size="small" margin="none" type={type} label={label} placeholder={placeholder} value={form[key]}
      onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
  );

  return (
    <Dialog open={material != null} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="movement-title">
      <DialogTitle id="movement-title" sx={{ fontSize: 16, fontWeight: 700 }}>{material ? `재고수정 — ${material.name || ''} (${material.code})` : ''}</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {field('inQty', '입고', '0')}
        {field('outQty', '출고', '0')}
        {field('setQty', '적용재고 — 계산 없이 이 값으로 재고를 바로 바꿔요 (입고/출고 대신 사용)', '입력 시 입고/출고는 무시돼요')}
        {field('note', '비고 — 출고는 사유를 꼭 적어주세요', '예: 파손 폐기, 타 라인 이동 등', 'text')}
        {message && <Alert severity={severity(message)}>{message.text}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" onClick={() => void save()}>저장</Button>
      </DialogActions>
    </Dialog>
  );
}

// 전체 재고 조회(송연 #stock-all-overlay) — 원재료마다 단가 × 재고 = 재고금액, 줄마다 [수정]
export function MaterialAllDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<MaterialStock[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<MaterialStock | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setRows(await fetchMaterials());
    } catch (requestError) {
      setError(errorText(requestError, '불러오지 못했어요'));
    }
  };
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setError('');
    void load();
  }, [open]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((m) => (m.name || '').toLowerCase().includes(q) || (m.code || '').includes(q)) : rows;
  }, [rows, query]);
  const total = shown.reduce((sum, m) => sum + (m.stockQty || 0) * (m.unitPrice || 0), 0);

  const columns = useMemo<F1GridColumn<MaterialStock>[]>(() => [
    { field: 'code', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'name', headerName: '원재료명', flex: 1.4, width: 200, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.name || '' },
    { field: 'spec', headerName: '규격', width: 110, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
    { field: 'unitPrice', headerName: '단가', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatMoney(row.unitPrice) },
    {
      field: 'stockQty', headerName: '재고', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.stockQty),
      getCellStyle: ({ row }) => (row.stockQty != null && row.stockQty < 0 ? { color: '#dc2626', fontWeight: 700 } : undefined),
    },
    {
      field: 'amount' as keyof MaterialStock, headerName: '재고금액', width: 120, headerAlign: 'center', align: 'right',
      // 단가가 없으면 0 — 재고가 음수면 -0 이 되는데 0 으로 보인다(송연 화면은 '-0')
      renderCell: ({ row }) => formatQty((row.stockQty || 0) * (row.unitPrice || 0) || 0), getCellStyle: () => ({ fontWeight: 700 }),
    },
    {
      field: 'action' as keyof MaterialStock, headerName: '', width: 76, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1, py: 0 }} onClick={() => setEditing(row)}>수정</Button>,
    },
  ], []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="stock-all-title">
      <DialogTitle id="stock-all-title" sx={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
        전체 재고 조회
        <Typography component="span" sx={{ ml: 'auto', fontSize: 14 }} aria-label="재고 합계금액">재고 합계금액 <b>{formatMoney(total)}원</b></Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <TextField size="small" margin="none" placeholder="원재료명 · 코드 검색" value={query} onChange={(event) => setQuery(event.target.value)}
          slotProps={{ htmlInput: { 'aria-label': '전체 재고 검색' } }} />
        {error && <Alert severity="error">{error}</Alert>}
        {rows.length > 0 && shown.length === 0 && <Typography variant="body2" color="text.secondary">원재료가 없습니다</Typography>}
        <Box sx={{ height: 420 }}>
          <F1Grid rows={shown} columns={columns} rowKey="code" storageKey="pu-stockadjust-material-all-grid" ariaLabel="F1-GRID 전체 재고" {...gridProps} />
        </Box>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>닫기</Button></DialogActions>
      <MovementDialog material={editing} onClose={() => setEditing(null)} onSaved={() => void load()} />
    </Dialog>
  );
}

type LotGridRow = LotRecord & { key: string };

// 전체 제품재고 조회(로트별, 송연 #pstock-all-overlay). '로트보기' 를 누르면 그 제품의 로트를 아래에 보여준다.
export function ProductAllDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<StockRow | null>(null);
  const [lots, setLots] = useState<LotRecord[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setPicked(null);
    setLots(null);
    setError('');
    fetchStock('', '', 'name-asc').then(setRows).catch((requestError) => setError(errorText(requestError, '불러오지 못했어요')));
  }, [open]);

  const showLots = async (row: StockRow) => {
    if (picked?.code === row.code) {
      setPicked(null);
      setLots(null);
      return;
    }
    setPicked(row);
    setLots(null);
    try {
      setLots(await fetchLots(row.code));
    } catch (requestError) {
      setError(errorText(requestError, '불러오지 못했어요'));
    }
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((p) => (p.name || '').toLowerCase().includes(q) || (p.code || '').includes(q)) : rows;
  }, [rows, query]);

  const columns = useMemo<F1GridColumn<StockRow>[]>(() => [
    { field: 'code', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'name', headerName: '품목명', flex: 1.4, width: 220, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.name || '' },
    { field: 'spec', headerName: '규격', width: 120, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
    { field: 'stockQty', headerName: '현재고', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.stockQty), getCellStyle: () => ({ fontWeight: 700 }) },
    {
      field: 'plannedQty', headerName: '', width: 96, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => (
        <Button size="small" variant={picked?.code === row.code ? 'contained' : 'outlined'} sx={{ minWidth: 0, px: 1, py: 0 }} onClick={() => void showLots(row)}>로트보기</Button>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [picked]);

  const lotRows = useMemo<LotGridRow[]>(() => (lots ?? []).map((lot) => ({ ...lot, key: String(lot.lotId) })), [lots]);
  const lotColumns = useMemo<F1GridColumn<LotGridRow>[]>(() => [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'lotNo', headerName: '로트번호', flex: 1, width: 180, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <span>{lotText(row)}{row.status === 'planned' ? <Typography component="span" sx={{ ml: 0.75, fontSize: 11, color: 'warning.main' }}>생산예정</Typography> : null}</span>
      ),
    },
    { field: 'producedQty', headerName: '생산량', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.producedQty) },
    { field: 'shippedQty', headerName: '출하량', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.shippedQty) },
    { field: 'remainingQty', headerName: '잔량', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.remainingQty), getCellStyle: () => ({ fontWeight: 700 }) },
  ], []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="pstock-all-title">
      <DialogTitle id="pstock-all-title" sx={{ fontSize: 16, fontWeight: 700 }}>전체 제품재고 조회 (로트별)</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography variant="body2" color="text.secondary">&quot;로트보기&quot;를 누르면 그 제품의 생산일별 로트 내역이 아래에 나와요.</Typography>
        <TextField size="small" margin="none" placeholder="품목명 · 코드 검색" value={query} onChange={(event) => setQuery(event.target.value)}
          slotProps={{ htmlInput: { 'aria-label': '제품 재고 검색' } }} />
        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ height: picked ? 260 : 420 }}>
          <F1Grid rows={shown} columns={columns} rowKey="code" storageKey="pu-stockadjust-product-all-grid" ariaLabel="F1-GRID 전체 제품재고" {...gridProps} />
        </Box>
        {picked && (
          <>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{picked.name}{picked.spec ? `(${picked.spec})` : ''} 로트</Typography>
            {lots != null && lots.length === 0 && <Typography variant="body2" color="text.secondary">로트 내역이 없습니다</Typography>}
            <Box sx={{ height: 200 }}>
              <F1Grid rows={lotRows} columns={lotColumns} rowKey="key" storageKey="pu-stockadjust-product-lot-grid" ariaLabel="F1-GRID 제품 로트" loading={lots == null} {...gridProps} />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>닫기</Button></DialogActions>
    </Dialog>
  );
}
