import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { fetchBom, fetchProductBomRows } from '../../../co/master/item-master/services/itemMaster.service';
import type { ProductBomRow } from '../../../co/master/item-master/types/itemMaster.types';
import { fetchDrafts, fetchSalesReps, fetchStageLogs, fetchVersion, saveRecipeClient } from '../services/recipe.service';
import { rowsFromBom, type RecipeBomRow, type RecipeDraft, type RecipeSalesRep, type RecipeStageLog } from '../utils/recipe';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const smallBtn = { minWidth: 0, px: 1, py: 0, fontSize: 12, whiteSpace: 'nowrap' } as const;
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: 36, minRowHeight: 36, maxRowHeight: 200, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;

// ===== 업체 폴더 추가 · 영업담당자 지정 (송연 openRecipeClientModal) =====
// clientName 을 주면 '담당자 바꾸기', 안 주면 '새 폴더 만들기'. 담당자만 바꾸는 자리에서 업체명이 바뀌면 다른 폴더가 되므로 이름은 잠근다
export type RecipeClientTarget = { clientName: string | null; salesEmpId: string | null };
export function RecipeClientDialog({ target, onClose, onSaved }: {
  target: RecipeClientTarget | null;
  onClose: () => void;
  onSaved: (clientName: string, editing: boolean) => void;
}) {
  const editing = Boolean(target?.clientName);
  const [name, setName] = useState('');
  const [emp, setEmp] = useState('');
  const [reps, setReps] = useState<RecipeSalesRep[]>([]);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setName(target.clientName || '');
    setEmp(target.salesEmpId ?? '');
    setMsg('');
    fetchSalesReps().then(setReps).catch(() => setReps([]));
  }, [target]);

  const save = async () => {
    const n = name.trim();
    if (!n) {
      setMsg('업체명을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      await saveRecipeClient(n, emp || null);
      onSaved(n, editing);
    } catch (requestError) {
      setMsg(errorText(requestError, '저장에 실패했어요'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{editing ? '영업담당자 지정' : '업체 폴더 추가'}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth size="small" margin="dense" label="업체명" value={name} autoFocus={!editing}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void save(); } }}
          slotProps={{ htmlInput: { readOnly: editing, 'aria-label': '업체명' } }}
        />
        <TextField
          select fullWidth size="small" margin="dense" label="영업담당자" value={emp} onChange={(event) => setEmp(event.target.value)}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        >
          <MenuItem value="">나중에 정하기</MenuItem>
          {reps.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}{r.department ? ` (${r.department})` : ''}</MenuItem>)}
        </TextField>
        {msg && <Typography role="alert" sx={{ mt: 1, fontSize: 12.5, color: 'error.main' }}>{msg}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled={saving} onClick={() => void save()}>{editing ? '저장' : '폴더 만들고 열기'}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ===== 기존 레시피 가져오기 (송연 recipe-import) =====
// 등록된 제품BOM 이나 작성중인 다른 레시피의 최신 버전 배합표를 새 레시피에 채운다. 레시피명이 비어 있으면 그 이름도 가져온다
type ImportProductRow = ProductBomRow;
type ImportDraftRow = RecipeDraft & { key: string };
export function RecipeImportDialog({ open, currentDraftId, onClose, onImported }: {
  open: boolean;
  currentDraftId: number | null;
  onClose: () => void;
  onImported: (rows: RecipeBomRow[], name: string) => void;
}) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<ProductBomRow[] | null>(null);
  const [drafts, setDrafts] = useState<RecipeDraft[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setQ('');
      setQuery('');
      setError('');
    }
  }, [open]);

  // 송연: 글자를 칠 때마다가 아니라 잠깐 멈추면 찾는다
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(q.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setProducts(null);
    setDrafts(null);
    fetchProductBomRows(false)
      .then((rows) => { if (alive) setProducts(rows.filter((p) => p.materialCount > 0)); })
      .catch(() => { if (alive) setProducts([]); });
    fetchDrafts(query ? { q: query } : {})
      .then((rows) => { if (alive) setDrafts(rows); })
      .catch(() => { if (alive) setDrafts([]); });
    return () => { alive = false; };
  }, [open, query]);

  const shownProducts = useMemo(() => {
    if (!products) return [];
    const k = query.toLowerCase();
    const hit = k ? products.filter((p) => (p.name || '').toLowerCase().includes(k) || (p.clientName || '').toLowerCase().includes(k)) : products;
    return hit.slice(0, 30);
  }, [products, query]);
  const shownDrafts = useMemo<ImportDraftRow[]>(
    () => (drafts || []).filter((d) => d.id !== currentDraftId).slice(0, 30).map((d) => ({ ...d, key: `d${d.id}` })),
    [drafts, currentDraftId],
  );

  const importProduct = async (p: ProductBomRow) => {
    try {
      const bom = await fetchBom(p.code);
      onImported(rowsFromBom(bom.map((b) => ({ materialName: b.materialName, ratio: b.ratio, unitPrice: b.unitPricePerKg, materialCode: b.materialCode }))), p.name);
    } catch (requestError) {
      setError(errorText(requestError, '가져오지 못했어요'));
    }
  };
  const importDraft = async (d: RecipeDraft) => {
    if (!d.latestVersionId) return;
    try {
      const { bom } = await fetchVersion(d.latestVersionId);
      // 송연 fillRecipeBomFromList: 가져올 때는 배합비율을 중량 자리에 둔다
      onImported(rowsFromBom(bom.map((b) => ({ materialName: b.materialName, ratio: b.ratioPercent, unitPrice: b.unitPricePerKg, materialCode: b.materialCode }))), d.name || '');
    } catch (requestError) {
      setError(errorText(requestError, '가져오지 못했어요'));
    }
  };

  const productColumns: F1GridColumn<ImportProductRow>[] = [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'name', headerName: '제품명', flex: 1, width: 220, headerAlign: 'center', align: 'left' },
    { field: 'spec', headerName: '규격', width: 110, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
    { field: 'clientName', headerName: '거래처', width: 140, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    {
      field: 'code', headerName: '', width: 90, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="contained" sx={smallBtn} onClick={() => void importProduct(row)}>가져오기</Button>,
    },
  ];
  const draftColumns: F1GridColumn<ImportDraftRow>[] = [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'name', headerName: '레시피명', flex: 1, width: 220, headerAlign: 'center', align: 'left' },
    { field: 'clientName', headerName: '업체명', width: 140, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    { field: 'spec', headerName: '규격', width: 110, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
    {
      field: 'id', headerName: '', width: 90, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="contained" sx={smallBtn} disabled={!row.latestVersionId} onClick={() => void importDraft(row)}>가져오기</Button>,
    },
  ];

  const emptyLine = (list: unknown[] | null, shown: unknown[]) =>
    list == null ? '불러오는 중...' : shown.length === 0 ? '검색결과가 없습니다' : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>기존 레시피 가져오기</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth size="small" margin="dense" placeholder="제품명·레시피명·업체명으로 찾기" value={q} onChange={(event) => setQ(event.target.value)}
          slotProps={{ htmlInput: { 'aria-label': '가져올 레시피 찾기' } }}
        />
        {error && <Typography role="alert" sx={{ fontSize: 12.5, color: 'error.main' }}>{error}</Typography>}
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, mt: 1.5, mb: 0.5 }}>등록된 제품BOM</Typography>
        {emptyLine(products, shownProducts) && <Typography variant="body2" color="text.secondary">{emptyLine(products, shownProducts)}</Typography>}
        <Box sx={{ height: 220 }}>
          <F1Grid rows={shownProducts} columns={productColumns} rowKey="id" storageKey="rd-recipe-import-product-grid" ariaLabel="F1-GRID 가져올 제품BOM" {...gridProps} />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, mt: 1.5, mb: 0.5 }}>작성중인 레시피</Typography>
        {emptyLine(drafts, shownDrafts) && <Typography variant="body2" color="text.secondary">{emptyLine(drafts, shownDrafts)}</Typography>}
        <Box sx={{ height: 220 }}>
          <F1Grid rows={shownDrafts} columns={draftColumns} rowKey="key" storageKey="rd-recipe-import-draft-grid" ariaLabel="F1-GRID 가져올 작성중 레시피" {...gridProps} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}

// ===== 공유로그 (송연 openRecipeStageLogModal) =====
type StageLogRow = RecipeStageLog & { key: string };
export function RecipeStageLogDialog({ target, onClose }: { target: { id: number; name: string } | null; onClose: () => void }) {
  const [logs, setLogs] = useState<StageLogRow[] | null>(null);

  useEffect(() => {
    if (!target) return;
    let alive = true;
    setLogs(null);
    fetchStageLogs(target.id)
      .then((rows) => { if (alive) setLogs(rows.map((r, i) => ({ ...r, key: `l${i}` }))); })
      .catch(() => { if (alive) setLogs([]); });
    return () => { alive = false; };
  }, [target]);

  const columns: F1GridColumn<StageLogRow>[] = [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'versionLabel', headerName: '버전', width: 100, headerAlign: 'center', align: 'left' },
    {
      field: 'stage', headerName: '분류', width: 120, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Chip size="small" color="success" label={row.stage || ''} sx={{ height: 20, fontSize: 11 }} />,
    },
    { field: 'employeeName', headerName: '담당자', width: 110, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.employeeName || '' },
    { field: 'createdAt', headerName: '일시', flex: 1, width: 160, headerAlign: 'center', align: 'center', renderCell: ({ row }) => (row.createdAt || '').replace('T', ' ') },
  ];

  return (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>공유로그 — {target?.name}</DialogTitle>
      <DialogContent>
        {(logs == null || logs.length === 0) && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{logs == null ? '불러오는 중...' : '아직 공유된 기록이 없습니다'}</Typography>
        )}
        <Box sx={{ height: 260 }}>
          <F1Grid rows={logs || []} columns={columns} rowKey="key" storageKey="rd-recipe-stage-log-grid" ariaLabel="F1-GRID 공유로그" {...gridProps} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}
