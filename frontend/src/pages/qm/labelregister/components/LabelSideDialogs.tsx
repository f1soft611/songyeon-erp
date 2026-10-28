import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { getLabelCompanyInfo, getLabelVersion, listLabelMarks } from '../../../../shared/components/LabelPrintDialog/label.service';
import type { LabelCompanyInfo, LabelInfo, LabelMark } from '../../../../shared/components/LabelPrintDialog/label.types';
import {
  addField, addMark, deleteField, deleteMark, fetchFields, fetchLabelProducts, fetchSourceProducts, saveCompanyInfo,
} from '../services/labelRegister.service';
import type { LabelField, LabelProductRow, LabelSourceProduct } from '../utils/labelRegister';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type Msg = { text: string; ok: boolean } | null;
const MsgLine = ({ msg }: { msg: Msg }) =>
  msg ? <Typography role="status" sx={{ fontSize: 12.5, color: msg.ok ? 'success.main' : 'error.main' }}>{msg.text}</Typography> : null;
const metaSx = { color: 'text.secondary', fontSize: 12 };
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: 36, minRowHeight: 36, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;
const smallBtn = { minWidth: 0, px: 1, py: 0, fontSize: 12 } as const;

// ===== 회사 고정정보 (송연 label-company-overlay) =====
// 모든 제품 라벨에 똑같이 들어가는 정보(영업소 · 상담전화 · 주의사항). 한 번만 입력해두면 된다.
export function LabelCompanyDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: (info: LabelCompanyInfo) => void }) {
  const [info, setInfo] = useState<LabelCompanyInfo>({});
  const [msg, setMsg] = useState<Msg>(null);
  useEffect(() => {
    if (!open) return;
    setMsg(null);
    getLabelCompanyInfo().then(setInfo).catch(() => setInfo({}));
  }, [open]);
  const set = (key: keyof LabelCompanyInfo, value: string) => setInfo((cur) => ({ ...cur, [key]: value }));
  const save = async () => {
    const body: LabelCompanyInfo = {
      returnExchangeLocation: (info.returnExchangeLocation || '').trim(),
      customerServicePhone: (info.customerServicePhone || '').trim(),
      businessName: (info.businessName || '').trim(),
      businessAddress: (info.businessAddress || '').trim(),
      noticeText: info.noticeText || '',
    };
    try {
      await saveCompanyInfo(body);
    } catch (e) {
      setMsg({ text: errorText(e, '저장하지 못했어요'), ok: false });
      return;
    }
    onSaved?.(body);
    onClose();
  };
  const field = (key: keyof LabelCompanyInfo, label: string, placeholder: string) => (
    <TextField size="small" margin="none" fullWidth label={label} placeholder={placeholder} value={info[key] || ''}
      onChange={(e) => set(key, e.target.value)} slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': label } }} />
  );
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="label-company-title">
      <DialogTitle id="label-company-title" sx={{ fontSize: 15, fontWeight: 700 }}>라벨 회사 고정정보</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: '8px !important' }}>
        <Typography sx={metaSx}>모든 제품 라벨에 공통으로 들어가는 정보예요. 한 번만 입력해두면 돼요.</Typography>
        {field('returnExchangeLocation', '반품 및 교환', '예: 본사 및 각 구입처')}
        {field('customerServicePhone', '고객상담실', '예: 031) 663-3225')}
        {field('businessName', '영업소 명칭', '예: 주식회사 송연에스와이')}
        {field('businessAddress', '영업소 소재지', '예: 경기도 평택시 안골길34,미트빌사동 1~2층(도일동)')}
        <TextField size="small" margin="none" fullWidth multiline minRows={5} label="주의사항" value={info.noticeText || ''}
          placeholder={'1.개봉후에는...\n2.본제품은...\n3.본제품은...\n4.부정·불량식품 신고는 국번없이 1399'}
          onChange={(e) => set('noticeText', e.target.value)} slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': '주의사항' } }} />
        <MsgLine msg={msg} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" onClick={() => void save()}>저장</Button>
      </DialogActions>
    </Dialog>
  );
}

// ===== 다른 제품 라벨 가져오기 (송연 label-copy-overlay) =====
// 고른 제품의 라벨 내용을 지금 칸에 채운다. 저장하기 전까지는 바뀌지 않는다. 품목제조보고번호는 가져오지 않는다.
export function LabelCopyDialog({ open, exclude, onClose, onPick }: {
  open: boolean; exclude: string; onClose: () => void; onPick: (version: LabelInfo, fromName: string) => void;
}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<LabelSourceProduct[] | null>(null);
  const [error, setError] = useState('');
  const load = async (query: string) => {
    setRows(null);
    setError('');
    try {
      setRows(await fetchSourceProducts(exclude, query.trim()));
    } catch (e) {
      setRows([]);
      setError(errorText(e, '불러오지 못했어요'));
    }
  };
  useEffect(() => {
    if (!open) return;
    setQ('');
    void load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const pick = async (r: LabelSourceProduct) => {
    try {
      onPick(await getLabelVersion(r.versionId), r.name || '');
    } catch (e) {
      setError(errorText(e, '가져오지 못했어요'));
    }
  };
  const columns = useMemo<F1GridColumn<LabelSourceProduct>[]>(() => [
    { field: 'versionId', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'code', headerName: '제품코드', width: 100, headerAlign: 'center', align: 'center' },
    { field: 'name', headerName: '제품명', flex: 1, width: 180, headerAlign: 'center', align: 'left' },
    { field: 'spec', headerName: '규격단위', width: 110, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
    { field: 'versionLabel', headerName: '', width: 90, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="outlined" sx={smallBtn} onClick={() => void pick(row)}>가져오기</Button> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="label-copy-title">
      <DialogTitle id="label-copy-title" sx={{ fontSize: 15, fontWeight: 700 }}>다른 제품 라벨 가져오기</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography sx={metaSx}>
          고른 제품의 라벨 내용을 지금 칸에 채웁니다. 저장하기 전까지는 바뀌지 않습니다.
          <b> 품목제조보고번호는 가져오지 않습니다</b> — 품목마다 다른 번호라서 잘못 찍히면 안 됩니다.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" margin="none" placeholder="제품명 또는 제품코드" value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void load(q); } }}
            slotProps={{ htmlInput: { 'aria-label': '가져올 제품 찾기' } }} sx={{ flex: 1 }} />
          <Button variant="contained" onClick={() => void load(q)}>조회</Button>
        </Box>
        {rows != null && rows.length === 0 && !error && <Typography sx={metaSx}>라벨이 등록된 다른 제품이 없어요</Typography>}
        {error && <MsgLine msg={{ text: error, ok: false }} />}
        <Box sx={{ height: 320 }}>
          <F1Grid rows={rows ?? []} columns={columns} rowKey="versionId" storageKey="qm-label-copy-grid" ariaLabel="F1-GRID 라벨 가져올 제품" loading={rows == null} {...gridProps} />
        </Box>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>닫기</Button></DialogActions>
    </Dialog>
  );
}

// ===== 제품으로 옮기기 (송연 lreq-move-overlay) =====
// 제품이 1,000개가 넘어서 목록을 통째로 띄우지 않고 찾아서 고른다(20건까지).
export function RequestMoveDialog({ target, onClose, onPick }: {
  target: { id: number; name: string } | null; onClose: () => void; onPick: (product: LabelProductRow) => void;
}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<LabelProductRow[] | null>(null);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    if (!target) return;
    setQ('');
    setRows(null);
  }, [target]);
  const search = async () => {
    if (!q.trim()) {
      setRows(null);
      return;
    }
    const list = await fetchLabelProducts(q.trim()).catch(() => [] as LabelProductRow[]);
    setTotal(list.length);
    setRows(list.slice(0, 20));
  };
  const columns = useMemo<F1GridColumn<LabelProductRow>[]>(() => [
    { field: 'labelState', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'code', headerName: '제품코드', width: 100, headerAlign: 'center', align: 'center' },
    { field: 'name', headerName: '제품명', flex: 1, width: 180, headerAlign: 'center', align: 'left' },
    { field: 'spec', headerName: '규격', width: 100, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
    { field: 'currentVersion', headerName: '', width: 100, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="outlined" sx={smallBtn} onClick={() => onPick(row)}>이 제품으로</Button> },
  ], [onPick]);
  return (
    <Dialog open={target != null} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="lreq-move-title">
      <DialogTitle id="lreq-move-title" sx={{ fontSize: 15, fontWeight: 700 }}>제품으로 옮기기 — {target?.name || ''}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography sx={metaSx}>여기 적어둔 표시사항을 이미 등록된 제품의 라벨로 옮깁니다. 옮기고 나면 이 요청은 잠기고, 이후 수정은 라벨등록에서 합니다.</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" margin="none" placeholder="제품명 또는 제품코드" value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }}
            slotProps={{ htmlInput: { 'aria-label': '옮길 제품 찾기' } }} sx={{ flex: 1 }} />
          <Button variant="contained" onClick={() => void search()}>찾기</Button>
        </Box>
        {rows == null && <Typography sx={metaSx}>제품명이나 제품코드를 적고 찾기를 누르세요</Typography>}
        {rows != null && rows.length === 0 && <Typography sx={metaSx}>그런 제품이 없어요</Typography>}
        {rows != null && rows.length > 0 && (
          <Box sx={{ height: 300 }}>
            <F1Grid rows={rows} columns={columns} rowKey="code" storageKey="qm-label-move-grid" ariaLabel="F1-GRID 옮길 제품" {...gridProps} />
          </Box>
        )}
        {total > 20 && <Typography sx={metaSx}>{total}건 중 20건만 보여줍니다. 더 자세히 적어보세요.</Typography>}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>닫기</Button></DialogActions>
    </Dialog>
  );
}

// ===== 라벨 항목 등록 (송연 lfld-overlay) =====
// '유통전문판매원' 처럼 라벨에 넣을 항목의 이름을 미리 만든다. 양식의 칸에 이 항목을 고르면 라벨등록에 입력칸이 생긴다
// (이름을 매번 손으로 적으면 오타 하나로 입력칸이 안 생겨서 목록에서 고르게 한다).
export function LabelFieldDialog({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: (fields: LabelField[]) => void }) {
  const [fields, setFields] = useState<LabelField[]>([]);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  const load = async () => {
    const list = await fetchFields().catch(() => [] as LabelField[]);
    setFields(list);
    onChanged(list);
  };
  useEffect(() => {
    if (!open) return;
    setName('');
    setMsg(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const add = async () => {
    const n = name.trim();
    if (!n) {
      setMsg({ text: '항목 이름을 넣어주세요', ok: false });
      return;
    }
    try {
      await addField(n);
    } catch (e) {
      setMsg({ text: errorText(e, '추가하지 못했어요'), ok: false });
      return;
    }
    setMsg({ text: `"${n}" 을 만들었어요`, ok: true });
    setName('');
    await load();
  };
  const remove = async (f: LabelField) => {
    try {
      await deleteField(f.id);
    } catch (e) {
      setMsg({ text: errorText(e, '지우지 못했어요'), ok: false });
      return;
    }
    await load();
  };
  const columns: F1GridColumn<LabelField>[] = [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'name', headerName: '항목 이름', flex: 1, width: 200, headerAlign: 'center', align: 'left' },
    { field: 'createdAt', headerName: '', width: 80, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="outlined" color="error" sx={smallBtn} onClick={() => void remove(row)}>삭제</Button> },
  ];
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="lfld-title">
      <DialogTitle id="lfld-title" sx={{ fontSize: 15, fontWeight: 700 }}>라벨 항목 등록</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography sx={metaSx}>라벨에 넣을 항목의 이름을 만들어 둡니다. 내용은 제품마다 라벨등록에서 적습니다.</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" margin="none" placeholder="예: 유통전문판매원" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void add(); } }}
            slotProps={{ htmlInput: { 'aria-label': '새 항목 이름' } }} sx={{ flex: 1 }} />
          <Button variant="contained" onClick={() => void add()}>추가</Button>
        </Box>
        {fields.length === 0 && <Typography sx={metaSx}>아직 등록한 항목이 없어요</Typography>}
        <Box sx={{ height: 260 }}>
          <F1Grid rows={fields} columns={columns} rowKey="id" storageKey="qm-label-field-grid" ariaLabel="F1-GRID 라벨 항목" {...gridProps} />
        </Box>
        <MsgLine msg={msg} />
      </DialogContent>
      <DialogActions><Button onClick={onClose}>닫기</Button></DialogActions>
    </Dialog>
  );
}

// ===== 라벨 마크 등록 (송연 lmk-overlay) =====
// 분리배출마크처럼 라벨에 찍을 그림. 그림은 파일로 두지 않고 내용(data URL)을 그대로 담는다(인쇄 때 빈 채로 찍히지 않게).
export function LabelMarkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [marks, setMarks] = useState<LabelMark[]>([]);
  const [name, setName] = useState('');
  const [width, setWidth] = useState('9');
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const load = async () => setMarks(await listLabelMarks().catch(() => [] as LabelMark[]));
  useEffect(() => {
    if (!open) return;
    setName('');
    setWidth('9');
    setDataUrl(null);
    setMsg(null);
    void load();
  }, [open]);
  const pickFile = (file: File | undefined) => {
    setDataUrl(null);
    if (!file) return;
    if (file.size > 300 * 1024) {
      setMsg({ text: '그림이 너무 큽니다(300KB 이하). 작게 줄여서 넣어주세요.', ok: false });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDataUrl(String(reader.result));
      setMsg(null);
      // 이름을 안 적었으면 파일 이름을 넣어준다
      setName((cur) => cur.trim() || file.name.replace(/\.[^.]+$/, ''));
    };
    reader.readAsDataURL(file);
  };
  const add = async () => {
    const n = name.trim();
    if (!n) {
      setMsg({ text: '마크 이름을 넣어주세요', ok: false });
      return;
    }
    if (!dataUrl) {
      setMsg({ text: '그림 파일을 골라주세요', ok: false });
      return;
    }
    try {
      await addMark({ name: n, dataUrl, widthMm: parseFloat(width) || 9 });
    } catch (e) {
      setMsg({ text: errorText(e, '넣지 못했어요'), ok: false });
      return;
    }
    setMsg({ text: `"${n}" 을 넣었어요`, ok: true });
    setName('');
    setDataUrl(null);
    if (fileRef.current) fileRef.current.value = '';
    await load();
  };
  const remove = async (m: LabelMark) => {
    try {
      await deleteMark(m.id);
    } catch (e) {
      setMsg({ text: errorText(e, '지우지 못했어요'), ok: false });
      return;
    }
    await load();
  };
  const w = parseFloat(width) || 9;
  const columns: F1GridColumn<LabelMark>[] = [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'dataUrl', headerName: '마크', width: 80, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <img src={row.dataUrl} alt="" style={{ maxWidth: 54, maxHeight: 28, background: '#fff' }} /> },
    { field: 'name', headerName: '이름', flex: 1, width: 140, headerAlign: 'center', align: 'left' },
    { field: 'widthMm', headerName: '기본크기', width: 80, headerAlign: 'center', align: 'right', renderCell: ({ row }) => `${row.widthMm || 9}mm` },
    { field: 'action' as keyof LabelMark, headerName: '', width: 80, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="outlined" color="error" sx={smallBtn} onClick={() => void remove(row)}>삭제</Button> },
  ];
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="lmk-title">
      <DialogTitle id="lmk-title" sx={{ fontSize: 15, fontWeight: 700 }}>라벨 마크 등록</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography sx={metaSx}>분리배출마크처럼 라벨에 찍을 그림을 등록합니다. 라벨등록에서 골라 쓰고, 크기도 거기서 정합니다.</Typography>
        <TextField size="small" margin="none" label="마크 이름" placeholder="예: 비닐류, 비닐류+OTHER" value={name} onChange={(e) => setName(e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': '마크 이름' } }} />
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="outlined" component="label">
            그림 파일 고르기
            <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/gif,image/svg+xml" data-testid="lmk-file"
              onChange={(e) => pickFile(e.target.files?.[0])} />
          </Button>
          <TextField size="small" margin="none" type="number" label="기본 가로크기(mm)" value={width} onChange={(e) => setWidth(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': '기본 가로크기(mm)', min: 1, max: 100, step: 0.5 } }} sx={{ width: 160 }} />
        </Box>
        {dataUrl && (
          // 실제 라벨에 들어갈 크기 그대로 보여준다
          <Box aria-label="마크 미리보기" sx={{ p: 1.25, textAlign: 'center', border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
            <img src={dataUrl} alt="" style={{ width: `${w}mm`, background: '#fff' }} />
            <Typography sx={{ ...metaSx, mt: 0.75 }}>실제 인쇄 크기 ({w}mm)</Typography>
          </Box>
        )}
        <Box><Button variant="contained" onClick={() => void add()}>추가</Button></Box>
        <MsgLine msg={msg} />
        {marks.length === 0 && <Typography sx={metaSx}>아직 등록한 마크가 없어요</Typography>}
        <Box sx={{ height: 240 }}>
          <F1Grid rows={marks} columns={columns} rowKey="id" storageKey="qm-label-mark-grid" ariaLabel="F1-GRID 라벨 마크" {...gridProps} />
        </Box>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>닫기</Button></DialogActions>
    </Dialog>
  );
}
