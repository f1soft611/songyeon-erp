import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Link, Typography,
} from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import {
  deleteAttachment, downloadAttachment, uploadAttachments, type AttachmentFile,
} from '../../../../shared/services/attachment.service';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { fetchReceivingDetail } from '../services/receiving.service';
import { formatQty, type Receiving, type ReceivingDetail } from '../utils/receiving';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type Message = { text: string; ok: boolean | null } | null;

const panelSx = { border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.75, py: 1.5 };

function RowTitle({ row }: { row: Receiving }) {
  return (
    <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>
      {row.receiveDate} · {row.clientName || '-'} · {formatQty(row.qty)}{' '}
      <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary', fontFamily: 'monospace', fontSize: 11 }}>{row.barcode || ''}</Box>
    </Typography>
  );
}

// 파일을 끌어다 놓거나 눌러서 고르는 칸(송연 recv-up-drop · attachFileDrop)
function DropZone({ label, onFiles }: { label: string; onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <>
      <Box
        role="button" tabIndex={0} aria-label={label}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }}
        onDragOver={(event) => { event.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          const files = Array.from(event.dataTransfer.files || []);
          if (files.length) onFiles(files);
        }}
        sx={{
          border: '1.5px dashed', borderColor: over ? 'primary.main' : 'divider', borderRadius: 2, p: 1.75, textAlign: 'center',
          fontSize: 12, color: 'text.secondary', cursor: 'pointer', bgcolor: over ? 'action.hover' : 'transparent',
        }}
      >
        여기로 파일을 끌어다 놓거나 눌러서 찾아보세요
      </Box>
      <input
        ref={inputRef} type="file" multiple hidden data-testid={`${label}-input`}
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = ''; // 같은 파일을 다시 골라도 change 가 뜨도록 비워둔다
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
}

// 서류 등록 창(올리기 · 지우기). 서류는 '그 품목' 이 아니라 '그 입고 건' 에 붙는다 —
// 나중에 어느 납품분의 시험성적서였는지 되짚어야 해서 입고 건마다 자리를 만든다.
// 지우는 것은 이 창에서만, 받는 것은 서류보기 창에서만(내려받으려다 지우는 일을 막는다).
export function DocUploadDialog({ open, materialName, rows, onClose, onChanged }: {
  open: boolean;
  materialName: string;
  rows: Receiving[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [message, setMessage] = useState<Message>(null);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [askDelete, setAskDelete] = useState<AttachmentFile | null>(null);

  useEffect(() => {
    if (open) setMessage(null);
  }, [open]);

  const upload = async (row: Receiving, files: File[]) => {
    setMessage({ text: '올리는 중...', ok: null });
    try {
      const result = await uploadAttachments('receiving', row.id, files);
      setMessage({ text: `${result.saved}개 올렸어요${result.errors.length ? ` (${result.errors.length}개 실패)` : ''}`, ok: true });
      if (result.errors.length) setAlertText(`올리지 못한 파일:\n${result.errors.join('\n')}`);
      await onChanged();
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '올리지 못했어요'), ok: false });
    }
  };

  const remove = async (file: AttachmentFile) => {
    try {
      await deleteAttachment(file.id);
      await onChanged();
    } catch {
      setAlertText('서류를 지우지 못했어요');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="recv-doc-upload-title">
      <DialogTitle id="recv-doc-upload-title" sx={{ fontSize: 16, fontWeight: 700 }}>{materialName} — 서류 등록</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography variant="body2" color="text.secondary">
          서류는 <b>입고 건마다</b> 붙습니다. 나중에 어느 납품분의 성적서였는지 되짚어야 하기 때문이에요.
        </Typography>
        {rows.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>이 기간에 입고 건이 없어 서류를 붙일 수 없어요</Typography>}
        {rows.map((row) => (
          <Box key={row.id} sx={panelSx}>
            <RowTitle row={row} />
            <DropZone label={`${row.receiveDate} ${row.clientName || ''} 서류 올리기`} onFiles={(files) => void upload(row, files)} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
              {(row.files || []).length === 0
                ? <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>붙여둔 서류 없음</Typography>
                : (row.files || []).map((file) => (
                  <Chip key={file.id} size="small" variant="outlined" label={`📎 ${file.origName}`}
                    onDelete={() => setAskDelete(file)}
                    deleteIcon={<Box component="span" aria-label={`${file.origName} 지우기`}>지우기</Box>}
                    sx={{ '& .MuiChip-deleteIcon': { fontSize: 11, fontWeight: 700, color: 'error.main', width: 'auto', height: 'auto', mr: 0.75, '&:hover': { color: 'error.dark' } } }} />
                ))}
            </Box>
          </Box>
        ))}
        {message && <Alert severity={message.ok == null ? 'info' : message.ok ? 'success' : 'error'}>{message.text}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
      <ConfirmDialog open={alertText != null} title="서류 등록" message={alertText ?? ''} alertOnly
        onCancel={() => setAlertText(null)} onConfirm={() => setAlertText(null)} />
      <ConfirmDialog open={askDelete != null} title="서류 지우기" message={askDelete ? `"${askDelete.origName}" 서류를 지울까요?` : ''}
        confirmLabel="지우기" danger
        onCancel={() => setAskDelete(null)} onConfirm={() => { const file = askDelete; setAskDelete(null); if (file) void remove(file); }} />
    </Dialog>
  );
}

// 서류 보기 창(내려받기만 — 지우기 단추가 없어서 잘못 누를 일이 없다)
export function DocViewDialog({ open, materialName, rows, onClose }: {
  open: boolean;
  materialName: string;
  rows: Receiving[];
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const withFiles = rows.filter((row) => (row.files || []).length);
  useEffect(() => {
    if (open) setError(null);
  }, [open]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="recv-doc-view-title">
      <DialogTitle id="recv-doc-view-title" sx={{ fontSize: 16, fontWeight: 700 }}>{materialName} — 서류 보기</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography variant="body2" color="text.secondary">
          파일 이름을 누르면 내려받습니다. 지우려면 <b>서류등록</b> 창에서 지워주세요.
        </Typography>
        {withFiles.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>붙여둔 서류가 없습니다</Typography>}
        {withFiles.map((row) => (
          <Box key={row.id} sx={panelSx}>
            <RowTitle row={row} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {(row.files || []).map((file) => (
                <Link key={file.id} component="button" type="button" underline="always" sx={{ fontSize: 12.5, textAlign: 'left' }}
                  onClick={() => downloadAttachment(file).catch((requestError) => setError(errorText(requestError, '내려받지 못했어요')))}>
                  📎 {file.origName}
                </Link>
              ))}
            </Box>
          </Box>
        ))}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}

type DetailRow = ReceivingDetail['rows'][number] & { key: number };

// 입고 상세(그 기간의 입고 줄 + 총 입고량 · 총 생산사용량)
export function DocDetailDialog({ target, start, end, clientQ, onClose }: {
  target: { code: string; name: string } | null;
  start: string;
  end: string;
  clientQ: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ReceivingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setDetail(null);
    setError(null);
    fetchReceivingDetail(target.code, start, end, clientQ)
      .then(setDetail)
      .catch((requestError) => setError(errorText(requestError, '조회에 실패했어요')));
  }, [target, start, end, clientQ]);

  const rows = useMemo<DetailRow[]>(() => (detail?.rows ?? []).map((row, index) => ({ ...row, key: index + 1 })), [detail]);
  const columns = useMemo<F1GridColumn<DetailRow>[]>(() => [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'date', headerName: '입고일', width: 120, headerAlign: 'center', align: 'center' },
    { field: 'materialName', headerName: '원재료명', flex: 1, width: 180, headerAlign: 'center', align: 'left' },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 140, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    { field: 'qty', headerName: '수량', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.qty) },
  ], []);

  const box = (label: string, value: number | undefined) => (
    <Box sx={{ ...panelSx, flex: 1 }}>
      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{formatQty(value ?? 0)}</Typography>
    </Box>
  );

  return (
    <Dialog open={target != null} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="recv-doc-detail-title">
      <DialogTitle id="recv-doc-detail-title" sx={{ fontSize: 16, fontWeight: 700 }}>
        {target ? `${target.name} — 입고 상세 (${start} ~ ${end})` : ''}
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box sx={{ display: 'flex', gap: 1.25 }}>
          {box('이 기간 총 입고량', detail?.totalReceived)}
          {box('이 기간 총 생산사용량', detail?.totalUsed)}
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {!error && detail == null && <Typography variant="body2" color="text.secondary">불러오는 중...</Typography>}
        {detail != null && rows.length === 0 && <Typography variant="body2" color="text.secondary">내역이 없습니다</Typography>}
        <Box sx={{ height: 320 }}>
          <F1Grid rows={rows} columns={columns} rowKey="key" storageKey="pu-recv-doc-detail-grid" ariaLabel="F1-GRID 입고 상세"
            height="100%" maxHeight="100%" rowHeight={34} minRowHeight={34} maxRowHeight={320} columnLine showCheckbox={false}
            resizableRows={false} allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}
