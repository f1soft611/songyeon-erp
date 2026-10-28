import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';
import { MaterialMatchDialog } from '../../../sa/product/components/MaterialMatchDialog';
import { checkMaterialNames } from '../../../co/master/item-master/services/itemMaster.service';
import type { MaterialCheck, MaterialOption } from '../../../co/master/item-master/types/itemMaster.types';
import { RecipeDropzone } from '../../../sa/product/components/RecipeDropzone';
import {
  addTestVersion, createDraft, downloadVersionExcel, fetchDraft, fetchVersion, saveVersionBom, updateDraft,
  type RecipeBomSave, type RecipeHeader,
} from '../services/recipe.service';
import {
  bomForSave, calcRecipe, emptyRecipeRows, percentText, recipePrintHtml, rowsFromBom, versionOption,
  type RecipeBomRow, type RecipeDraft, type RecipeVersion,
} from '../utils/recipe';
import { RecipeBomGrid, type RecipeBomGridHandle } from './RecipeBomGrid';
import { RecipeImportDialog } from './RecipeSideDialogs';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// draftId 가 null 이면 새 레시피(clientName 은 열어둔 폴더의 업체명).
// readOnly 면 '레시피 보기'(레시피 검색·공유에서 연다): 고치는 곳은 레시피 작성 한 곳뿐이다 — 두 군데서 고치면 누가 어디서 바꿨는지 알 수 없다
export type RecipeDialogTarget = { draftId: number | null; clientName: string; readOnly?: boolean };

const EMPTY_HEADER: RecipeHeader = { clientName: '', name: '', spec: '', note: '', category: '', saleType: '', remark: '' };
const LOCK_TEXT = '🔒 이 버전은 공유(확정)되어 더이상 수정할 수 없어요. 수정하려면 "+ test버전추가"로 새 버전을 만들어주세요.';

// 상품개발 > 레시피 작성 창 (송연 #recipe-modal-overlay · openRecipeModal · loadRecipeVersionBom · recipe-save-btn)
// 머리 정보 + 버전 + 배합표. 버전이 공유(확정)되면 잠긴다 — 고치려면 test 버전을 새로 만든다.
// 견적이나 표시사항으로 넘기는 일은 레시피 검색·공유에서 한다(여기는 고치는 곳).
export function RecipeDialog({ target, materials, onClose, onSaved }: {
  target: RecipeDialogTarget | null;
  materials: MaterialOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [header, setHeader] = useState<RecipeHeader>(EMPTY_HEADER);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [versions, setVersions] = useState<RecipeVersion[]>([]);
  const [versionId, setVersionId] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [sourceRows, setSourceRows] = useState<RecipeBomRow[]>(emptyRecipeRows);
  const [sourceKey, setSourceKey] = useState(0);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [unmatched, setUnmatched] = useState<MaterialCheck[] | null>(null);
  const pendingRef = useRef<{ header: RecipeHeader; bom: RecipeBomSave[] } | null>(null);
  const gridRef = useRef<RecipeBomGridHandle>(null);
  const closeTimer = useRef<number | null>(null);

  const draftId = target?.draftId ?? null;
  const isNew = target != null && draftId == null;
  const readOnly = Boolean(target?.readOnly);

  const fillRows = (rows: RecipeBomRow[]) => {
    setSourceRows(rows);
    setSourceKey((k) => k + 1);
  };

  const loadVersion = async (vid: number | null) => {
    setVersionId(vid);
    if (vid == null) {
      fillRows(emptyRecipeRows());
      setLocked(false);
      return;
    }
    const data = await fetchVersion(vid);
    fillRows(rowsFromBom(data.bom.map((b) => ({ materialName: b.materialName, weight: b.weight, ratio: b.ratioPercent, unitPrice: b.unitPricePerKg, materialCode: b.materialCode }))));
    setLocked(Boolean(data.version.stage));
  };

  useEffect(() => {
    if (!target) return;
    setMsg(null);
    setDraft(null);
    setVersions([]);
    if (target.draftId == null) {
      setHeader({ ...EMPTY_HEADER, clientName: target.clientName || '' });
      setVersionId(null);
      setLocked(false);
      fillRows(emptyRecipeRows());
      return;
    }
    let alive = true;
    (async () => {
      try {
        const data = await fetchDraft(target.draftId as number);
        if (!alive) return;
        const d = data.draft;
        setDraft(d);
        setHeader({
          clientName: d.clientName || '', name: d.name || '', spec: d.spec || '', note: d.note || '',
          category: d.category || '', saleType: d.saleType || '', remark: d.remark || '',
        });
        setVersions(data.versions || []);
        const last = data.versions.length ? data.versions[data.versions.length - 1].id : null;
        await loadVersion(last);
      } catch (requestError) {
        if (alive) setMsg({ text: errorText(requestError, '레시피를 불러오지 못했어요'), ok: false });
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useEffect(() => () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); }, []);

  const set = (key: keyof RecipeHeader) => (event: { target: { value: string } }) => setHeader((h) => ({ ...h, [key]: event.target.value }));

  const changeVersion = async (vid: number) => {
    setMsg(null);
    try {
      await loadVersion(vid);
    } catch (requestError) {
      setMsg({ text: errorText(requestError, '버전을 불러오지 못했어요'), ok: false });
    }
  };

  const addVersion = async () => {
    if (draftId == null) return;
    setBusy(true);
    try {
      const made = await addTestVersion(draftId);
      setVersions((list) => [...list, { id: made.versionId, versionLabel: made.versionLabel, stage: null }]);
      await loadVersion(made.versionId);
      setMsg(null);
    } catch (requestError) {
      setMsg({ text: errorText(requestError, 'test버전 추가에 실패했어요'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  // 송연 doSaveRecipe: 있던 레시피는 머리 정보와 지금 고른 버전 배합표를 따로 저장, 새 레시피는 한 번에
  const doSave = async (h: RecipeHeader, bom: RecipeBomSave[]) => {
    setBusy(true);
    try {
      if (draftId != null && versionId != null) {
        await updateDraft(draftId, { name: h.name, spec: h.spec, note: h.note, category: h.category, saleType: h.saleType, remark: h.remark });
        await saveVersionBom(versionId, bom);
      } else {
        await createDraft({ ...h, bom });
      }
    } catch (requestError) {
      setMsg({ text: errorText(requestError, '저장에 실패했어요'), ok: false });
      setBusy(false);
      return;
    }
    setMsg({ text: '저장되었습니다', ok: true });
    onSaved();
    closeTimer.current = window.setTimeout(() => { setBusy(false); onClose(); }, 500);
  };

  const save = async () => {
    const h: RecipeHeader = {
      clientName: header.clientName.trim(), name: header.name.trim(), spec: header.spec.trim(), note: header.note.trim(),
      category: header.category.trim(), saleType: header.saleType.trim(), remark: header.remark.trim(),
    };
    if (!h.clientName) { setMsg({ text: '업체명은 필수예요', ok: false }); return; }
    if (!h.name) { setMsg({ text: '레시피명은 필수예요', ok: false }); return; }
    const bom = bomForSave(gridRef.current?.getRows() ?? []);
    if (bom.length === 0) { await doSave(h, bom); return; }
    // 등록된 원재료 이름과 딱 맞지 않는 줄이 있으면 무엇으로 붙일지 먼저 고른다
    let checks: MaterialCheck[];
    try {
      checks = await checkMaterialNames(bom.map((b) => b.materialName));
    } catch (requestError) {
      setMsg({ text: errorText(requestError, '원재료 이름을 확인하지 못했어요'), ok: false });
      return;
    }
    const miss = checks.filter((c) => !c.exact);
    if (miss.length === 0) { await doSave(h, bom); return; }
    pendingRef.current = { header: h, bom };
    setUnmatched(miss);
  };

  const confirmMatch = (resolved: Record<string, string>) => {
    const pending = pendingRef.current;
    setUnmatched(null);
    pendingRef.current = null;
    if (!pending) return;
    // 이름을 바꿔 붙이면 물고 있던 코드도 더는 그 이름의 것이 아니다
    const bom = pending.bom.map((b) => (resolved[b.materialName] && resolved[b.materialName] !== b.materialName
      ? { ...b, materialName: resolved[b.materialName], materialCode: null }
      : b));
    void doSave(pending.header, bom);
  };

  // 송연 recipe-print-btn: 지금 화면의 배합표 그대로(저장 전이어도) 인쇄창을 띄운다
  const print = () => {
    const rows = gridRef.current?.getRows() ?? [];
    const c = calcRecipe(rows);
    const v = versions.find((x) => x.id === versionId);
    const items = rows.filter((r) => r.materialName.trim()).map((r) => ({
      name: r.materialName.trim(), weight: r.weight == null ? '' : String(r.weight), percent: percentText(c.percent(r)),
    }));
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(recipePrintHtml(header.name.trim(), header.clientName.trim(), v ? versionOption(v) : '초안', items));
    win.document.close();
  };

  const download = async () => {
    if (!draft || versionId == null) return;
    try {
      await downloadVersionExcel(draft, versionId);
    } catch (requestError) {
      setMsg({ text: errorText(requestError, '엑셀을 만들지 못했어요'), ok: false });
    }
  };

  const editable = !locked && !readOnly;
  const title = isNew ? '새 레시피 작성' : readOnly ? '레시피 보기' : '레시피 수정';
  const field = (key: keyof RecipeHeader, label: string, extra?: { required?: boolean; readOnly?: boolean; wide?: boolean }) => (
    <TextField
      size="small" margin="dense" label={label} required={extra?.required} value={header[key]} onChange={set(key)}
      disabled={!editable && !extra?.readOnly} sx={{ flex: extra?.wide ? '1 1 100%' : '1 1 200px' }}
      slotProps={{ htmlInput: { readOnly: extra?.readOnly, 'aria-label': label } }}
    />
  );

  return (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1 }}>{title}</Box>
        {isNew && <Button size="small" variant="outlined" onClick={() => setImportOpen(true)}>📥 기존 레시피 가져오기</Button>}
      </DialogTitle>
      <DialogContent>
        {!isNew && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            <TextField
              select size="small" label="버전" value={versionId ?? ''} onChange={(event) => void changeVersion(Number(event.target.value))}
              sx={{ width: 260 }} slotProps={{ htmlInput: { 'aria-label': '버전' } }}
            >
              {versions.map((v) => <MenuItem key={v.id} value={v.id}>{versionOption(v)}</MenuItem>)}
            </TextField>
            {!readOnly && <Button size="small" variant="outlined" disabled={busy || draftId == null} onClick={() => void addVersion()}>+ test버전추가</Button>}
          </Box>
        )}
        {locked && <Alert severity="warning" sx={{ mb: 1, py: 0 }}>{LOCK_TEXT}</Alert>}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 1.5 }}>
          {field('clientName', '업체명', { required: true, readOnly: !isNew })}
          {field('name', '레시피명', { required: true })}
          {field('spec', '규격')}
          {field('category', '카테고리')}
          {field('saleType', '판매유형')}
          {field('remark', '비고')}
          {field('note', '메모', { wide: true })}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.5, mb: 1 }}>
          견적이나 표시사항으로 넘기는 것은 레시피 검색·공유에서 합니다.
        </Typography>
        {editable && (
          <RecipeDropzone
            materials={materials}
            onLoaded={(rows, text) => {
              // 송연: 엑셀의 배합비율(%)을 중량 자리에 둔다(합이 100 이라 비율이 그대로 나온다)
              fillRows(rows.map((r) => ({ id: r.id, materialName: r.materialName, weight: r.ratioPercent, unitPrice: r.unitPrice, materialCode: r.materialCode })));
              setMsg({ text, ok: true });
            }}
            onError={(text) => setMsg({ text, ok: false })}
          />
        )}
        <RecipeBomGrid ref={gridRef} materials={materials} sourceRows={sourceRows} sourceKey={sourceKey} locked={locked || readOnly} />
        {msg && (
          <Typography role="status" sx={{ mt: 1, fontSize: 12.5, fontWeight: 700, color: msg.ok ? 'success.dark' : 'error.main' }}>{msg.text}</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={print}>🖨 인쇄</Button>
        {!isNew && <Button disabled={versionId == null} onClick={() => void download()}>📥 엑셀 다운로드</Button>}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>닫기</Button>
        {editable && <Button variant="contained" disabled={busy} onClick={() => void save()}>저장</Button>}
      </DialogActions>
      <RecipeImportDialog
        open={importOpen} currentDraftId={draftId} onClose={() => setImportOpen(false)}
        onImported={(rows, name) => {
          fillRows(rows);
          setHeader((h) => (h.name.trim() ? h : { ...h, name }));
          setImportOpen(false);
          setMsg({ text: '가져오기 완료', ok: true });
        }}
      />
      {unmatched && <MaterialMatchDialog unmatched={unmatched} onConfirm={confirmMatch} onClose={() => { setUnmatched(null); pendingRef.current = null; }} />}
    </Dialog>
  );
}

