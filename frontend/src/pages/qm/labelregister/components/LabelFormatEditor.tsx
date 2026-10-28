import { useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';
import { useAsk } from '../../../../shared/components/AskDialog/useAsk';
import { getLabelCompanyInfo, getLabelTemplate } from '../../../../shared/components/LabelPrintDialog/label.service';
import type { LabelCompanyInfo, LabelFormat } from '../../../../shared/components/LabelPrintDialog/label.types';
import { LABEL_CSS, LABEL_FORMAT_BASIC, buildLabelHTML, type LabelSheet } from '../../../../shared/components/LabelPrintDialog/labelHtml';
import { createTemplate, fetchFields, fetchTemplateUsage, updateTemplate } from '../services/labelRegister.service';
import {
  LFMT_BASIC_FIELDS, LFMT_SPECIALS, applyCellEdit, blankFormat, cellKind, cellSpecialValue, colSumText, deepCopy, formatGrid, mergeSelection,
  normalizeFormat, resizeSelection, selectedCell, selectionBetween, selectionText, selectionWidthMm, unmergeSelection, type CellKind, type LabelField, type Sel,
} from '../utils/labelRegister';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 열 때: 새로(기본 양식을 베껴 시작 — 빈 종이에서 시작하면 막막하다) · 편집 · 복사(이름 + ' 복사본', 새 양식으로)
export type FormatEditTarget = { mode: 'new' } | { mode: 'edit' | 'copy'; id: number };

const ZOOMS = ['1', '1.25', '1.5', '1.75', '2'];
const metaSx = { color: 'text.secondary', fontSize: 12 };
const smallBtn = { minWidth: 0, px: 1.25, py: 0.25, fontSize: 12 } as const;

// 미리보기 칸 안 글자는 견본이다
function sampleSheet(fmt: LabelFormat, company: LabelCompanyInfo): LabelSheet {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    code: '003211', name: '제품명이 들어갑니다', mfgDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    info: {
      foodType: '소스(살균제품)', netWeight: '5Kg', shelfLifeMonths: 6, shelfLifeUnit: '월',
      ingredientsText: '정제수, 설탕, 간장(대두·밀 함유), 마늘, 양파 …', allergens: '대두,밀,쇠고기,우유 함유',
      manufactureReportNo: '20160347193-1452', packagingMaterial: '폴리에틸렌(PE)', storage: '냉장보관(0℃~10℃)',
    },
    companyInfo: company, format: fmt, recycle: null, marks: [],
  };
}

// 라벨양식 만들기 (송연 26-label-format.js, #lfmt-editor-overlay)
// 라벨은 전부 표(격자)라서 마우스로 그리는 대신 칸 폭을 mm 로 적어 만든다(0.5mm 를 마우스로 맞출 수는 없다).
// 라벨을 그리는 일은 공용 buildLabelHTML 이 하고, 여기서는 그 함수가 읽는 '양식 자료' 만 만든다 — 미리보기와 인쇄가 어긋날 수 없다.
export function LabelFormatEditor({ target, onClose, onSaved }: { target: FormatEditTarget | null; onClose: () => void; onSaved: () => void }) {
  return target ? <EditorBody key={JSON.stringify(target)} target={target} onClose={onClose} onSaved={onSaved} /> : null;
}

function EditorBody({ target, onClose, onSaved }: { target: FormatEditTarget; onClose: () => void; onSaved: () => void }) {
  const ask = useAsk('라벨양식');
  const [id, setId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [fmt, setFmt] = useState<LabelFormat | null>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const [company, setCompany] = useState<LabelCompanyInfo>({});
  const [fields, setFields] = useState<LabelField[]>([]);
  const [zoom, setZoom] = useState('1.5');
  const [step, setStep] = useState('1');
  const [msg, setMsg] = useState<{ text: string; tone: 'info' | 'ok' | 'error' } | null>(null);
  const [inputsKey, setInputsKey] = useState(0); // 칸 폭·종이 칸을 다시 채울 때(입력 중에는 건드리지 않는다)
  const previewRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(new Map<Element, { r: number; c: number }>());
  const dragging = useRef<{ r: number; c: number } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [info, list] = await Promise.all([getLabelCompanyInfo().catch(() => ({})), fetchFields().catch(() => [] as LabelField[])]);
      let next: LabelFormat;
      let nextName = '';
      let nextId: number | null = null;
      if (target.mode === 'new') {
        next = deepCopy(LABEL_FORMAT_BASIC);
      } else {
        const t = await getLabelTemplate(target.id);
        next = deepCopy((t.layout || {}) as LabelFormat);
        nextName = target.mode === 'copy' ? `${t.name} 복사본` : t.name;
        nextId = target.mode === 'copy' ? null : t.id;
      }
      delete next.name;
      if (!next.paper) next.paper = { w: 100, h: 150 };
      if (!next.cols) next.cols = [100];
      if (!next.rows) next.rows = [];
      normalizeFormat(next);
      if (!alive) return;
      setCompany(info);
      setFields(list);
      setFmt(next);
      setName(nextName);
      setId(nextId);
      setInputsKey((k) => k + 1);
    })().catch((e) => alive && setMsg({ text: errorText(e, '양식을 불러오지 못했어요'), tone: 'error' }));
    return () => { alive = false; };
  }, [target]);

  // 고친 뒤 줄마다 칸이 격자를 빈틈없이 채우게 맞춘다
  const mutate = (fn: (draft: LabelFormat) => string | null | void, resetInputs = false): string | null => {
    if (!fmt) return null;
    const draft = deepCopy(fmt);
    const err = fn(draft);
    if (err) return err;
    normalizeFormat(draft);
    setFmt(draft);
    if (resetInputs) setInputsKey((k) => k + 1);
    return null;
  };

  // ===== 미리보기 + 끌어서 고르기 =====
  // 화면에 그려진 칸이 격자의 어느 자리인지 알아야 해서, 격자를 펼쳐 짝을 지어둔다. 고르는 동안에는 다시 그리지 않는다.
  const zoomValue = parseFloat(zoom) || 1;
  const html = fmt ? buildLabelHTML(sampleSheet(fmt, company)) : '';
  useEffect(() => {
    const box = previewRef.current;
    if (!box || !fmt) return;
    const { w, h } = fmt.paper;
    box.innerHTML = `<style>${LABEL_CSS}
      .lbl th, .lbl td{ cursor:pointer; }
      .lbl .lfmt-on{ outline:2px solid #2F6FED; outline-offset:-2px; }</style>
      <div style="width:calc(${w}mm * ${zoomValue});height:calc(${h}mm * ${zoomValue});">
        <div style="width:${w}mm;height:${h}mm;outline:1px dashed #B9C0CC;background:#fff;transform:scale(${zoomValue});transform-origin:top left;">${html}</div>
      </div>`;
    const grid = formatGrid(fmt);
    const pos = new Map<Element, { r: number; c: number }>();
    [...box.querySelectorAll('.lbl tr')].forEach((tr, r) => {
      // 이 줄에서 r 행에 처음 나타나는 칸들을 순서대로 짝지어 준다
      const starts: number[] = [];
      for (let c = 0; c < fmt.cols.length; c++) {
        const g = grid[r] && grid[r][c];
        if (g && g.r0 === r && g.c0 === c) starts.push(c);
      }
      [...tr.children].forEach((el, i) => { if (starts[i] != null) pos.set(el, { r, c: starts[i] }); });
    });
    posRef.current = pos;
  }, [html, fmt, zoomValue]);

  // 고른 칸 표시(다시 그리지 않고 표시만)
  useEffect(() => {
    if (!fmt) return;
    const grid = formatGrid(fmt);
    posRef.current.forEach((p, el) => {
      const g = grid[p.r] && grid[p.r][p.c];
      const on = Boolean(g && sel && g.r0 >= sel.r1 && g.r0 <= sel.r2 && g.c0 >= sel.c1 && g.c0 <= sel.c2);
      el.classList.toggle('lfmt-on', on);
    });
  }, [sel, html, fmt]);

  const cellAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y);
    const cell = el?.closest('.lbl th, .lbl td');
    return cell && posRef.current.has(cell) ? posRef.current.get(cell) || null : null;
  };
  // 누르는 순간 마우스를 붙잡아 둔다(미리보기 바깥에서 손을 떼도 '끝났다' 는 신호를 받게)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = cellAt(e.clientX, e.clientY);
    if (!p || !fmt) return;
    e.preventDefault();
    dragging.current = p;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 아주 옛 브라우저
    }
    setSel(selectionBetween(formatGrid(fmt), p, p));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !fmt) return;
    const p = cellAt(e.clientX, e.clientY);
    if (p) setSel(selectionBetween(formatGrid(fmt), dragging.current, p));
  };
  const stopDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // 이미 풀렸으면 그만
    }
  };

  if (!fmt) {
    return (
      <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent><Typography sx={metaSx}>{msg?.text || '불러오는 중...'}</Typography></DialogContent>
      </Dialog>
    );
  }

  const cell = selectedCell(fmt, sel);
  const kind: CellKind | null = cell ? cellKind(cell) : null;
  const sum = colSumText(fmt);
  const valueOptions = LFMT_BASIC_FIELDS.concat(fields.map((f) => ({ v: f.name, t: `${f.name} (등록한 항목)` })));

  const editCell = (patch: Partial<{ kind: CellKind; text: string; field: string; special: string; size: string; align: string }>) => {
    if (!cell || !sel) return;
    const now = {
      kind: cellKind(cell), text: cell.text || '', field: cell.field || valueOptions[0].v, special: cellSpecialValue(cell),
      size: cell.size != null ? String(cell.size) : '', align: cell.align || '',
    };
    const next = { ...now, ...patch };
    if (patch.kind === 'value' && !valueOptions.some((o) => o.v === next.field)) next.field = valueOptions[0].v;
    if (patch.kind === 'special' && !LFMT_SPECIALS.some((o) => o.v === next.special)) next.special = LFMT_SPECIALS[0].v;
    mutate((draft) => {
      const c = selectedCell(draft, sel);
      if (c) applyCellEdit(c, next);
    });
  };

  const fail = async (err: string | null) => { if (err) await ask.alert(err); };

  const merge = () => {
    if (!fmt) return;
    const draft = deepCopy(fmt);
    const r = mergeSelection(draft, sel);
    if ('error' in r) { void ask.alert(r.error); return; }
    normalizeFormat(draft);
    setFmt(draft);
    setSel(r.sel);
  };

  const addRow = () => {
    const at = sel ? sel.r2 + 1 : fmt.rows.length;
    mutate((d) => { d.rows.splice(at, 0, { cells: [{ type: 'label', span: d.cols.length, text: '' }] }); });
    setSel({ r1: at, c1: 0, r2: at, c2: 0 });
  };
  const deleteRows = async () => {
    if (!sel) { await ask.alert('지울 줄의 칸을 먼저 눌러주세요.'); return; }
    if (fmt.rows.length <= 1) { await ask.alert('줄이 하나는 있어야 해요.'); return; }
    const n = sel.r2 - sel.r1 + 1;
    if (!(await ask.confirm(n > 1 ? `${sel.r1 + 1}~${sel.r2 + 1}번째 줄을 지울까요?` : `${sel.r1 + 1}번째 줄을 지울까요?`))) return;
    mutate((d) => { d.rows.splice(sel.r1, Math.min(n, d.rows.length - 1)); });
    setSel(null);
  };
  const moveRow = (dir: -1 | 1) => {
    if (!sel) return;
    if (dir < 0 && sel.r1 === 0) return;
    if (dir > 0 && sel.r2 >= fmt.rows.length - 1) return;
    const r = sel.r1;
    mutate((d) => { [d.rows[r + dir], d.rows[r]] = [d.rows[r], d.rows[r + dir]]; });
    setSel({ r1: r + dir, c1: 0, r2: r + dir, c2: 0 });
  };
  // 초기화: 기본 양식을 베껴 시작했는데 모양이 많이 다를 때, 하나씩 뜯어고치는 것보다 빠르다
  const reset = async () => {
    const r = await ask.prompt2('지금 만든 내용을 모두 지우고 빈 표로 시작합니다.\n줄과 칸 수를 정해주세요.',
      { label: '줄 수 (가로줄)', value: String(fmt.rows.length) }, { label: '칸 수 (세로칸)', value: String(fmt.cols.length) });
    if (!r) return;
    mutate((d) => { Object.assign(d, blankFormat(d.paper.w, r.value, r.value2)); }, true);
    setSel(null);
    setMsg({ text: '빈 표가 되었습니다. 칸을 눌러 무엇을 넣을지 정하고, 끌어서 고른 뒤 [병합] 하세요.', tone: 'info' });
  };

  const save = async () => {
    const n = name.trim();
    if (!n) { setMsg({ text: '양식 이름을 넣어주세요', tone: 'error' }); return; }
    // 이미 쓰고 있는 양식을 고치면 그 제품들이 모두 함께 바뀐다. 먼저 알려준다
    if (id) {
      const use = await fetchTemplateUsage(id).catch(() => ({ count: 0, products: [] }));
      if (use.count && !(await ask.confirm(`이 양식을 쓰는 제품 ${use.count}개의 라벨 모양이 함께 바뀝니다.\n진행할까요?`))) return;
    }
    const body = { name: n, size: `${fmt.paper.w}x${fmt.paper.h}`, layout: { paper: fmt.paper, cols: fmt.cols, rows: fmt.rows } };
    try {
      if (id) await updateTemplate(id, body);
      else setId(await createTemplate(body));
    } catch (e) {
      setMsg({ text: errorText(e, '저장하지 못했어요'), tone: 'error' });
      return;
    }
    setMsg({ text: '저장되었습니다', tone: 'ok' });
    onSaved();
  };

  const numberInput = (label: string, defaultValue: number, onValue: (v: number) => void, width = 64) => (
    <TextField
      key={`${label}-${inputsKey}`} size="small" margin="none" type="number" defaultValue={defaultValue}
      onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v) && v > 0) onValue(v); }}
      slotProps={{ htmlInput: { 'aria-label': label, min: 1, step: 0.5, style: { padding: '5px 6px', fontSize: 12 } } }} sx={{ width }}
    />
  );

  return (
    <Dialog open onClose={onClose} maxWidth={false} slotProps={{ paper: { sx: { width: 'min(1400px, 96vw)', maxHeight: '94vh' } } }} aria-labelledby="lfmt-title">
      <DialogTitle id="lfmt-title" sx={{ fontSize: 15, fontWeight: 700 }}>{id ? `양식 편집 — ${name}` : '새 양식 만들기'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', gap: 2.25, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Box sx={{ flex: '0 0 340px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <TextField size="small" margin="none" label="양식 이름" placeholder="예: 소스류 100×150" value={name} onChange={(e) => setName(e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': '양식 이름' } }} />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography sx={metaSx}>종이 가로·세로(mm)</Typography>
              {numberInput('종이 가로(mm)', fmt.paper.w, (v) => mutate((d) => { d.paper.w = v; }), 80)}
              {numberInput('종이 세로(mm)', fmt.paper.h, (v) => mutate((d) => { d.paper.h = v; }), 80)}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>칸 나누기 (mm)</Typography>
              <Typography sx={{ ...metaSx, mb: 0.75 }}>폭을 숫자로 적습니다. 합계가 종이 가로와 같아야 합니다.</Typography>
              <Box aria-label="칸 폭" sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {fmt.cols.map((w, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <Box key={i}>{numberInput(`${i + 1}번째 칸 폭`, w, (v) => mutate((d) => { d.cols[i] = v; }))}</Box>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button size="small" variant="outlined" sx={smallBtn} onClick={() => mutate((d) => { d.cols.push(10); }, true)}>＋ 칸</Button>
                <Button size="small" variant="outlined" sx={smallBtn}
                  onClick={() => { if (fmt.cols.length <= 1) void ask.alert('칸이 하나는 있어야 해요.'); else mutate((d) => { d.cols.pop(); }, true); }}>－ 칸</Button>
                <Typography aria-label="칸 폭 합계" sx={{ fontSize: 12, color: sum.ok ? 'text.secondary' : 'error.main' }}>{sum.text}</Typography>
              </Box>
            </Box>

            <Box sx={{ p: 1.25, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography aria-label="고른 칸" sx={metaSx}>{cell && sel ? selectionText(sel, cell) : '미리보기에서 칸을 눌러주세요. 여러 칸은 끌어서 고릅니다.'}</Typography>
              <Box sx={{ display: 'flex', gap: 0.75 }}>
                <Button size="small" variant="outlined" sx={smallBtn} onClick={merge}>병합</Button>
                <Button size="small" variant="outlined" sx={smallBtn} onClick={() => void fail(mutate((d) => unmergeSelection(d, sel)))}>병합해제</Button>
              </Box>
              {/* 옆 칸에서 가져오고 돌려주는 방식이라 폭 합계는 언제나 종이 가로와 같다 */}
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography sx={metaSx}>칸 폭</Typography>
                <Button size="small" variant="outlined" sx={smallBtn} onClick={() => void fail(mutate((d) => resizeSelection(d, sel, -(parseFloat(step) || 1)), true))}>◀ 좁게</Button>
                <Button size="small" variant="outlined" sx={smallBtn} onClick={() => void fail(mutate((d) => resizeSelection(d, sel, parseFloat(step) || 1), true))}>넓게 ▶</Button>
                <TextField select size="small" margin="none" value={step} onChange={(e) => setStep(e.target.value)}
                  slotProps={{ htmlInput: { 'aria-label': '칸 폭 단위' } }} sx={{ width: 100, '& .MuiInputBase-root': { height: 28, fontSize: 12 } }}>
                  {['0.5', '1', '2'].map((s) => <MenuItem key={s} value={s}>{s}mm씩</MenuItem>)}
                </TextField>
                {sel && <Typography sx={metaSx}>지금 {selectionWidthMm(fmt, sel)}mm</Typography>}
              </Box>
              {cell && kind && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField select size="small" margin="none" label="이 칸은" value={kind} onChange={(e) => editCell({ kind: e.target.value as CellKind })}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': '이 칸은' } }}>
                    <MenuItem value="text">글자 (직접 적기)</MenuItem>
                    <MenuItem value="value">항목 값 (제품마다 다름)</MenuItem>
                    <MenuItem value="special">특별한 칸</MenuItem>
                  </TextField>
                  {kind === 'text' && (
                    <TextField size="small" margin="none" label="적을 글자" placeholder="예: 식품유형" value={cell.text || ''} onChange={(e) => editCell({ text: e.target.value })}
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': '적을 글자' } }} />
                  )}
                  {kind === 'value' && (
                    <Box>
                      <TextField select fullWidth size="small" margin="none" label="어느 항목" value={cell.field || valueOptions[0].v} onChange={(e) => editCell({ field: e.target.value })}
                        slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': '어느 항목' } }}>
                        {valueOptions.map((o) => <MenuItem key={o.v} value={o.v}>{o.t}</MenuItem>)}
                      </TextField>
                      <Typography sx={{ ...metaSx, mt: 0.5 }}>목록에 없으면 ‘항목 등록’ 에서 먼저 만들어주세요</Typography>
                    </Box>
                  )}
                  {kind === 'special' && (
                    <TextField select size="small" margin="none" label="어떤 칸" value={cellSpecialValue(cell)} onChange={(e) => editCell({ special: e.target.value })}
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': '어떤 칸' } }}>
                      {LFMT_SPECIALS.map((o) => <MenuItem key={o.v} value={o.v}>{o.t}</MenuItem>)}
                    </TextField>
                  )}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField size="small" margin="none" type="number" label="글자 크기(pt)" placeholder="기본" value={cell.size != null ? String(cell.size) : ''}
                      onChange={(e) => editCell({ size: e.target.value })}
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': '글자 크기(pt)', min: 4, max: 30, step: 0.5 } }} sx={{ flex: 1 }} />
                    <TextField select size="small" margin="none" label="정렬" value={cell.align || ''} onChange={(e) => editCell({ align: e.target.value })}
                      slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true }, htmlInput: { 'aria-label': '정렬' } }} sx={{ flex: 1 }}>
                      <MenuItem value="">기본</MenuItem>
                      <MenuItem value="left">왼쪽</MenuItem>
                      <MenuItem value="center">가운데</MenuItem>
                      <MenuItem value="right">오른쪽</MenuItem>
                    </TextField>
                  </Box>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" sx={smallBtn} onClick={addRow}>＋ 줄 추가</Button>
              <Button size="small" variant="outlined" sx={smallBtn} onClick={() => void deleteRows()}>줄 삭제</Button>
              <Button size="small" variant="outlined" sx={smallBtn} onClick={() => moveRow(-1)}>▲ 위로</Button>
              <Button size="small" variant="outlined" sx={smallBtn} onClick={() => moveRow(1)}>▼ 아래로</Button>
              <Button size="small" variant="outlined" sx={smallBtn} onClick={() => void reset()}>초기화</Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <Button variant="contained" onClick={() => void save()}>저장</Button>
              <Button variant="outlined" onClick={onClose}>닫기</Button>
            </Box>
            {msg && <Typography role="status" sx={{ fontSize: 12.5, color: msg.tone === 'error' ? 'error.main' : msg.tone === 'ok' ? 'success.main' : 'text.secondary' }}>{msg.text}</Typography>}
          </Box>

          <Box sx={{ flex: 1, minWidth: 420 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
              <Typography sx={metaSx}>미리보기 — 칸을 누르면 고칠 수 있어요</Typography>
              <TextField select size="small" margin="none" value={zoom} onChange={(e) => setZoom(e.target.value)}
                slotProps={{ htmlInput: { 'aria-label': '양식 미리보기 배율' } }} sx={{ width: 150 }}>
                {ZOOMS.map((z) => <MenuItem key={z} value={z}>{z === '1' ? '100% (실제 크기)' : `${Math.round(parseFloat(z) * 100)}%`}</MenuItem>)}
              </TextField>
              <Typography sx={metaSx}>칸 안 글자는 견본입니다</Typography>
            </Box>
            <Box
              ref={previewRef} aria-label="양식 미리보기"
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}
              sx={{ maxHeight: '74vh', overflow: 'auto', p: 1.25, bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 1, userSelect: 'none' }}
            />
          </Box>
        </Box>
      </DialogContent>
      {ask.node}
    </Dialog>
  );
}
