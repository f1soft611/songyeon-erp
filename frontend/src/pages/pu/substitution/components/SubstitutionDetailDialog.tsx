import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography,
} from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { substitute, undoSubstitution } from '../services/materialSubstitution.service';
import {
  PICK_MESSAGE, UNDO_MESSAGE, candidatesFor, detailSubText, formatQty, materialLabel,
  type SubstitutionDetail, type SubstitutionLine, type SubstitutionMaterial,
} from '../utils/materialSubstitution';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type Row = SubstitutionLine & { key: string };
type Editing = { code: string; name: string };

const GOLD = 'rgba(245, 158, 11, 0.12)';
const rowButton = { minWidth: 0, px: 1, py: 0 };

// 재료 치환등록 › 상세보기 (송연 #msub-detail-overlay · openMsubDetail~openMsubEditor)
// 목록에서 고른 생산건 하나의 배합만 펼친다. 바꾸려는 줄에서 [🔄 치환] 을 누르면 표 아래에
// '무엇 대신 무엇으로' 칸이 열린다 — 어느 원재료를 바꾸는 중인지 그대로 보이게 한다.
export function SubstitutionDetailDialog({ detail, materials, onClose, onChanged }: {
  detail: SubstitutionDetail | null;
  materials: SubstitutionMaterial[];
  onClose: () => void;
  onChanged: (next: SubstitutionDetail) => void;
}) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [toMaterial, setToMaterial] = useState<SubstitutionMaterial | null>(null);
  const [reason, setReason] = useState('');
  const [alertText, setAlertText] = useState<string | null>(null);
  const [undoing, setUndoing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const scheduleId = detail?.header.id;

  useEffect(() => {
    setEditing(null);
  }, [scheduleId]);

  // 같은 줄을 또 누르면 닫는다
  const toggleEditor = (row: Row) => {
    if (editing?.code === row.originCode) {
      setEditing(null);
      return;
    }
    setEditing({ code: row.originCode, name: row.originName || '' });
    setToMaterial(null);
    setReason('');
  };

  const confirmSubstitute = async () => {
    if (!detail || !editing) return;
    if (!toMaterial) {
      setAlertText(PICK_MESSAGE);
      return;
    }
    setSaving(true);
    try {
      const next = await substitute(detail.header.id, editing.code, toMaterial.code, reason);
      setEditing(null);
      onChanged(next);
    } catch (requestError) {
      setAlertText(errorText(requestError, '바꾸지 못했어요'));
    } finally {
      setSaving(false);
    }
  };

  const confirmUndo = async () => {
    const row = undoing;
    setUndoing(null);
    if (!detail || !row?.subId) return;
    try {
      onChanged(await undoSubstitution(detail.header.id, row.subId));
    } catch (requestError) {
      setAlertText(errorText(requestError, '되돌리지 못했어요'));
    }
  };

  const rows = useMemo<Row[]>(() => (detail?.rows ?? []).map((row) => ({ ...row, key: row.originCode })), [detail]);
  const options = useMemo(() => (editing ? candidatesFor(materials, editing.code) : []), [materials, editing]);

  const columns = useMemo<F1GridColumn<Row>[]>(() => {
    const gold = ({ row }: { row: Row }) => (row.substituted ? { backgroundColor: GOLD } : undefined);
    return [
      { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left', getCellStyle: gold },
      {
        field: 'materialName', headerName: '원재료', flex: 1.6, width: 280, headerAlign: 'center', align: 'left', getCellStyle: gold,
        renderCell: ({ row }) => (row.substituted ? (
          <span>
            <Box component="s" sx={{ color: 'text.secondary' }}>{row.originName}</Box>
            {' → '}
            <b>{row.materialName}</b>
          </span>
        ) : row.materialName),
      },
      { field: 'ratioPercent', headerName: '배합비', width: 100, headerAlign: 'center', align: 'right', getCellStyle: gold, renderCell: ({ row }) => `${formatQty(row.ratioPercent)}%` },
      { field: 'qty', headerName: '투입량(kg)', width: 120, headerAlign: 'center', align: 'right', getCellStyle: gold, renderCell: ({ row }) => formatQty(row.qty) },
      { field: 'reason', headerName: '바꾼 이유', flex: 1, width: 180, headerAlign: 'center', align: 'left', getCellStyle: gold, renderCell: ({ row }) => (row.substituted ? row.reason || '' : '') },
      {
        field: 'originCode', headerName: '', width: 110, headerAlign: 'center', align: 'center', pinned: 'right', getCellStyle: gold,
        renderCell: ({ row }) => (row.substituted
          ? <Button size="small" variant="outlined" color="error" sx={rowButton} onClick={() => setUndoing(row)}>되돌리기</Button>
          : (
            <Button size="small" variant={editing?.code === row.originCode ? 'contained' : 'outlined'} sx={rowButton} onClick={() => toggleEditor(row)}>
              🔄 치환
            </Button>
          )),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  return (
    <Dialog open={detail != null} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="msub-detail-title">
      <DialogTitle id="msub-detail-title" sx={{ fontSize: 16, fontWeight: 700, pb: 0.5 }}>{detail?.header.productName}</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography variant="body2" color="text.secondary" aria-label="생산건 정보">{detail ? detailSubText(detail.header) : ''}</Typography>
        {detail && rows.length === 0 && <Typography variant="body2" color="text.secondary">이 품목은 제품BOM에 배합이 없어요</Typography>}
        <Box sx={{ height: 300 }}>
          <F1Grid
            rows={rows} columns={columns} rowKey="key" storageKey="pu-msub-detail-grid" ariaLabel="F1-GRID 치환 상세"
            height="100%" maxHeight="100%" rowHeight={36} minRowHeight={36} maxRowHeight={320} columnLine showCheckbox={false}
            resizableRows={false} allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false}
          />
        </Box>
        {editing && (
          <Box aria-label="바꿔 쓰기" sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', p: 1.25, borderRadius: 1, bgcolor: 'action.hover' }}>
            <b>{editing.name}</b>
            <Typography component="span" variant="body2" color="text.secondary">대신</Typography>
            <Autocomplete
              options={options}
              value={toMaterial}
              onChange={(_event, value) => setToMaterial(value)}
              getOptionLabel={materialLabel}
              isOptionEqualToValue={(option, value) => option.code === value.code}
              renderOption={(props, option) => {
                const { key, ...rest } = props as typeof props & { key: string };
                return (
                  <Box component="li" key={key} {...rest} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <span>{materialLabel(option)}</span>
                    <Typography component="span" variant="caption" color="text.secondary">재고 {formatQty(Number(option.stockQty) || 0)}</Typography>
                  </Box>
                );
              }}
              sx={{ width: 300 }}
              renderInput={(params) => <TextField {...params} size="small" margin="none" placeholder="대신 쓸 원재료" autoFocus slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, 'aria-label': '대신 쓸 원재료' } }} />}
            />
            <TextField
              size="small" margin="none" placeholder="바꾼 이유 (예: 국내산 미입고)" value={reason} onChange={(event) => setReason(event.target.value)}
              slotProps={{ htmlInput: { 'aria-label': '바꾼 이유' } }} sx={{ width: 220 }}
            />
            <Button variant="contained" disabled={saving} onClick={() => void confirmSubstitute()}>바꿔 쓰기</Button>
            <Button variant="outlined" onClick={() => setEditing(null)}>취소</Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
      <ConfirmDialog open={alertText != null} title="재료 치환등록" message={alertText ?? ''} alertOnly
        onCancel={() => setAlertText(null)} onConfirm={() => setAlertText(null)} />
      <ConfirmDialog open={undoing != null} title="치환 되돌리기" message={UNDO_MESSAGE} confirmLabel="되돌리기" danger
        onCancel={() => setUndoing(null)} onConfirm={() => void confirmUndo()} />
    </Dialog>
  );
}
